import type { SeekerProfile, SourceDiscoveryManifest, StreamCandidate, StreamKind } from "@aperio-j/core";
import { classifyStreamWorkCategory } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import { runSourceDiscovery } from "@aperio-j/discovery/source-discovery";
import { isDiscoveryAborted } from "@aperio-j/discovery/discovery-abort";
import { prepareCnStreamFetchUrl, seedUrlMatchesCityProfile, isCnJobAggregatorUrl } from "@aperio-j/discovery/cn-sources";
import {
  flattenSignalPackStreams,
  resolveSignalPacksForProfile,
} from "@aperio-j/probe/signal-packs/resolve";
import { loadCommunitySignalPacks } from "@aperio-j/probe/signal-packs/server";
import { resolveProbePack, isChinaCityProfile, isCnRemoteFirstProfile, REMOTE_REGISTRY_STREAMS, CN_FREELANCE_REGISTRY_STREAMS, isCnFreelanceIntentProfile } from "@aperio-j/probe";
import { isRemoteBoardUrl } from "@aperio-j/core";
import {
  loadCityDiscoveryMemory,
  recordMemoryFromManifest,
} from "./discovery-memory-service";
import {
  assertSessionAuthAllowed,
  parseStreamSessionAuth,
  SESSION_AUTH_BLOCKED,
  type StreamSessionAuth,
} from "@aperio-j/discovery/stream-auth";
import { validateStreamCandidate } from "@aperio-j/discovery/validate-stream";
import { parseOpmlFeeds } from "@aperio-j/discovery/opml-import";
import { createLightweightStreamCandidate } from "@aperio-j/discovery/probe-candidate";
import type { StreamConfig } from "@aperio-j/discovery/fetch-streams";
import { resolveSourceIntakeType } from "./source-intake";
import {
  loadCnSessionCredentialSettings,
  type CnSessionCredentialSettings,
} from "./local-settings-store";
import type { SourceDiscoveryProgressOptions } from "./engine-phases";

loadCommunitySignalPacks();

export const USER_CUSTOM_DISCOVERED_VIA = "user-custom";
export const USER_OPML_DISCOVERED_VIA = "user-custom:opml";

export const SOURCE_ERROR = {
  INVALID_URL_SCHEME: "SOURCE_INVALID_URL_SCHEME",
  VALIDATION_FAILED: "SOURCE_VALIDATION_FAILED",
  DELETE_NOT_CUSTOM: "SOURCE_DELETE_NOT_CUSTOM",
  SESSION_AUTH_BLOCKED: SESSION_AUTH_BLOCKED,
  SESSION_AUTH_CUSTOM_ONLY: "SOURCE_SESSION_AUTH_CUSTOM_ONLY",
} as const;

export type StreamSessionInput = {
  authMode?: "none" | "cookie" | "bearer";
  authSecret?: string | null;
};

function sessionAuthFromRow(row: {
  authMode: string;
  authSecret: string | null;
}): StreamSessionAuth | undefined {
  return parseStreamSessionAuth(row.authMode, row.authSecret ?? undefined);
}

function normalizeSessionInput(url: string, input?: StreamSessionInput): {
  authMode: string;
  authSecret: string | null;
  sessionAuth?: StreamSessionAuth;
} {
  const mode = input?.authMode ?? "none";
  const secret = input?.authSecret?.trim() ?? "";

  if (mode === "none" || !secret) {
    return { authMode: "none", authSecret: null, sessionAuth: undefined };
  }

  if (mode !== "cookie" && mode !== "bearer") {
    return { authMode: "none", authSecret: null, sessionAuth: undefined };
  }

  assertSessionAuthAllowed(url);
  return {
    authMode: mode,
    authSecret: secret,
    sessionAuth: { mode, secret },
  };
}

export function isUserCustomStream(discoveredVia: string): boolean {
  return discoveredVia === USER_CUSTOM_DISCOVERED_VIA || discoveredVia.startsWith("user-custom:");
}

function inferStreamKind(url: string): StreamKind {
  if (url.endsWith(".rss") || url.includes("/feed") || url.includes("atom.xml")) {
    return "rss";
  }
  return "list_page";
}

function normalizeStreamUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(SOURCE_ERROR.INVALID_URL_SCHEME);
  }
  return new URL(trimmed).href;
}

export async function persistSourceDiscovery(
  seekerProfileId: string,
  manifest: SourceDiscoveryManifest,
): Promise<void> {
  await mergeDiscoveredStreams(seekerProfileId, manifest);

  await prisma.sourceDiscoveryRun.create({
    data: {
      seekerProfileId,
      manifestJson: JSON.stringify(manifest),
      candidatesFound: manifest.candidates.length,
      candidatesEnabled: manifest.enabled.length + manifest.deferred.length,
      ranAt: new Date(manifest.ranAt),
    },
  });
}

export async function mergeDiscoveredStreams(
  seekerProfileId: string,
  manifest: SourceDiscoveryManifest,
): Promise<void> {
  for (const candidate of manifest.enabled) {
    await upsertDiscoveredStream(seekerProfileId, candidate, true);
  }

  for (const candidate of manifest.deferred) {
    await upsertDiscoveredStream(seekerProfileId, candidate, false);
  }
}

export async function getBlockedDomains(seekerProfileId: string): Promise<string[]> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, userBlocked: true },
    select: { seedUrl: true },
  });

  const domains = new Set<string>();
  for (const row of rows) {
    try {
      domains.add(new URL(row.seedUrl).hostname.toLowerCase());
    } catch {
      // skip invalid URLs
    }
  }
  return [...domains];
}

export async function removeDeadAutoStreams(seekerProfileId: string): Promise<number> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, health: "dead" },
    select: { id: true, discoveredVia: true },
  });

  const deadAutoIds = rows
    .filter((row) => !isUserCustomStream(row.discoveredVia))
    .map((row) => row.id);

  if (deadAutoIds.length === 0) return 0;

  await prisma.streamRegistryEntry.deleteMany({
    where: { id: { in: deadAutoIds } },
  });

  return deadAutoIds.length;
}

async function upsertDiscoveredStream(
  seekerProfileId: string,
  candidate: StreamCandidate,
  enabled: boolean,
): Promise<void> {
  const existing = await prisma.streamRegistryEntry.findUnique({
    where: {
      seekerProfileId_seedUrl: {
        seekerProfileId,
        seedUrl: candidate.seedUrl,
      },
    },
  });

  if (existing && isUserCustomStream(existing.discoveredVia)) {
    return;
  }

  await prisma.streamRegistryEntry.upsert({
    where: {
      seekerProfileId_seedUrl: {
        seekerProfileId,
        seedUrl: candidate.seedUrl,
      },
    },
    create: mapCandidateToRow(seekerProfileId, candidate, enabled),
    update: {
      label: candidate.label,
      kind: candidate.kind,
      discoveredVia: candidate.discoveredVia,
      regionHint: candidate.regionHint,
      confidence: candidate.confidence,
      sampleItemCount: candidate.sampleItemCount,
      validationTier: candidate.validationTier,
      lastValidatedAt: new Date(candidate.lastValidatedAt),
      enabled,
      health: enabled ? "unknown" : candidate.health,
      emptyFetchCount: 0,
    },
  });
}

function mapCandidateToRow(
  seekerProfileId: string,
  candidate: StreamCandidate,
  enabled = candidate.validationTier === "proven",
) {
  return {
    seekerProfileId,
    label: candidate.label,
    kind: candidate.kind,
    seedUrl: candidate.seedUrl,
    discoveredVia: candidate.discoveredVia,
    regionHint: candidate.regionHint,
    confidence: candidate.confidence,
    sampleItemCount: candidate.sampleItemCount,
    validationTier: candidate.validationTier,
    lastValidatedAt: new Date(candidate.lastValidatedAt),
    enabled,
    health: candidate.health,
    pollLane: "warm",
    learningWeight: 1 + candidate.confidence * 0.5,
    emptyFetchCount: 0,
    userBlocked: false,
  };
}

export async function clearAutoDiscoveredStreams(seekerProfileId: string): Promise<void> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId },
    select: { id: true, discoveredVia: true },
  });

  const autoIds = rows.filter((row) => !isUserCustomStream(row.discoveredVia)).map((row) => row.id);
  if (autoIds.length === 0) return;

  await prisma.streamRegistryEntry.deleteMany({
    where: { id: { in: autoIds } },
  });
}

export async function sanitizeCnRegistryStreams(
  seekerProfileId: string,
  city: string,
): Promise<number> {
  if (!city.trim()) return 0;

  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { id: true, seedUrl: true },
  });

  let disabled = 0;
  for (const row of rows) {
    if (seedUrlMatchesCityProfile(row.seedUrl, city)) continue;
    await prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: { enabled: false, health: "dead" },
    });
    disabled += 1;
  }

  return disabled;
}

/** Disable international remote boards when profile uses local CN intake. */
export async function sanitizeRemoteBoardRegistryStreams(seekerProfileId: string): Promise<number> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { id: true, seedUrl: true, discoveredVia: true },
  });

  let disabled = 0;
  for (const row of rows) {
    if (isUserCustomStream(row.discoveredVia)) continue;
    if (!isRemoteBoardUrl(row.seedUrl) && !row.discoveredVia.startsWith("cn-remote-trusted:")) {
      continue;
    }

    await prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: { enabled: false, health: "dead" },
    });
    disabled += 1;
  }

  return disabled;
}

/** Disable local CN aggregator/gov streams when profile uses remote-first intake. */
export async function sanitizeCnRemoteFirstRegistryStreams(seekerProfileId: string): Promise<number> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { id: true, seedUrl: true, discoveredVia: true },
  });

  let disabled = 0;
  for (const row of rows) {
    if (isUserCustomStream(row.discoveredVia)) continue;
    if (isRemoteBoardUrl(row.seedUrl)) continue;
    const isLocalCn =
      isCnJobAggregatorUrl(row.seedUrl) ||
      /\.gov\.cn/i.test(row.seedUrl) ||
      row.discoveredVia.startsWith("cn-city-trusted:");
    if (!isLocalCn) continue;

    await prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: { enabled: false, health: "dead" },
    });
    disabled += 1;
  }

  return disabled;
}

/** Seed international remote RSS boards when profile accepts remote work. */
export async function ensureRemoteRegistryStreams(seekerProfileId: string): Promise<number> {
  const existing = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { seedUrl: true },
  });
  const hasRemoteBoard = existing.some((row) => isRemoteBoardUrl(row.seedUrl));
  if (hasRemoteBoard) return 0;

  let added = 0;
  const now = new Date().toISOString();

  for (const stream of REMOTE_REGISTRY_STREAMS) {
    const candidate: StreamCandidate = {
      id: `stream-${stream.seedUrl}`,
      label: stream.label,
      kind: stream.kind,
      seedUrl: stream.seedUrl,
      discoveredVia: `global-remote-trusted:${stream.id}`,
      regionHint: "remote",
      confidence: 0.72,
      sampleItemCount: 0,
      lastValidatedAt: now,
      health: "unknown",
      validationTier: "candidate",
    };

    await upsertDiscoveredStream(seekerProfileId, candidate, true);
    added += 1;
  }

  return added;
}

/** Seed experimental CN freelance/gig streams (电鸭 RSS, 猪八戒, 一品威客). */
export async function ensureCnFreelanceRegistryStreams(
  seekerProfileId: string,
  profile: SeekerProfile,
): Promise<number> {
  if (!isCnFreelanceIntentProfile(profile)) return 0;

  const existing = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { seedUrl: true },
  });
  const existingUrls = new Set(existing.map((row) => row.seedUrl));

  let added = 0;
  const now = new Date().toISOString();

  for (const stream of CN_FREELANCE_REGISTRY_STREAMS) {
    if (existingUrls.has(stream.seedUrl)) continue;

    const candidate: StreamCandidate = {
      id: `stream-${stream.seedUrl}`,
      label: stream.label,
      kind: stream.kind,
      seedUrl: stream.seedUrl,
      discoveredVia: `cn-freelance-trusted:${stream.id}`,
      regionHint: "remote",
      confidence: stream.kind === "rss" ? 0.68 : 0.52,
      sampleItemCount: 0,
      lastValidatedAt: now,
      health: "unknown",
      validationTier: "candidate",
    };

    await upsertDiscoveredStream(seekerProfileId, candidate, true);
    added += 1;
  }

  return added;
}

/** @deprecated Use ensureRemoteRegistryStreams */
export async function ensureCnRemoteRegistryStreams(seekerProfileId: string): Promise<number> {
  return ensureRemoteRegistryStreams(seekerProfileId);
}

/** Seed city-scoped CN aggregator/gov streams when registry lacks valid local sources. */
export async function ensureCnCityRegistryStreams(
  seekerProfileId: string,
  city: string,
  acceptableCities: string[] = [],
  profile?: SeekerProfile,
): Promise<number> {
  if (!city.trim() || !isChinaCityProfile(city, acceptableCities)) return 0;

  const pack = resolveProbePack(city, acceptableCities);
  const existing = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { seedUrl: true },
  });
  const hasValidAggregator = existing.some(
    (row) => isCnJobAggregatorUrl(row.seedUrl) && seedUrlMatchesCityProfile(row.seedUrl, city),
  );

  let added = 0;
  const now = new Date().toISOString();

  if (!hasValidAggregator) {
    for (const stream of pack.registryStreams) {
      if (stream.domainTier === "gov") continue;
      const seedUrl = prepareCnStreamFetchUrl(stream.seedUrl, city);
      if (!seedUrlMatchesCityProfile(seedUrl, city)) continue;

      const candidate: StreamCandidate = {
        id: `stream-${seedUrl}`,
        label: stream.label,
        kind: stream.kind,
        seedUrl,
        discoveredVia: `cn-city-trusted:${stream.id}`,
        regionHint: city,
        confidence: stream.domainTier === "edu" ? 0.62 : 0.55,
        sampleItemCount: 0,
        lastValidatedAt: now,
        health: "unknown",
        validationTier: "candidate",
      };

      await upsertDiscoveredStream(seekerProfileId, candidate, true);
      added += 1;
    }
  }

  if (profile) {
    const signalPacks = resolveSignalPacksForProfile(profile);
    for (const { packId, stream } of flattenSignalPackStreams(signalPacks)) {
      if (stream.domainTier === "gov") continue;
      const seedUrl = prepareCnStreamFetchUrl(stream.seedUrl, city);
      if (!seedUrlMatchesCityProfile(seedUrl, city)) continue;
      if (existing.some((row) => row.seedUrl === seedUrl)) continue;

      const candidate: StreamCandidate = {
        id: `stream-${seedUrl}`,
        label: stream.label,
        kind: stream.kind,
        seedUrl,
        discoveredVia: `signal-pack:${packId}:${stream.id}`,
        regionHint: city,
        confidence: 0.58,
        sampleItemCount: 0,
        lastValidatedAt: now,
        health: "unknown",
        validationTier: "candidate",
      };

      await upsertDiscoveredStream(seekerProfileId, candidate, true);
      added += 1;
    }
  }

  return added;
}

export async function sanitizeCnGovNoiseStreams(
  seekerProfileId: string,
): Promise<number> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { id: true, seedUrl: true },
  });

  const deadPath = /jyzx\.sz\.gov|sz\.gov\.cn\/cn\/hrss|gkmlpt|m\.51job\.com/i;
  const govByHost = new Map<string, string[]>();
  let disabled = 0;

  for (const row of rows) {
    if (deadPath.test(row.seedUrl)) {
      await prisma.streamRegistryEntry.update({
        where: { id: row.id },
        data: { enabled: false, health: "dead" },
      });
      disabled += 1;
      continue;
    }

    if (!/\.gov\.cn/i.test(row.seedUrl)) continue;
    let host = "";
    try {
      host = new URL(row.seedUrl).hostname;
    } catch {
      continue;
    }
    const bucket = govByHost.get(host) ?? [];
    bucket.push(row.id);
    govByHost.set(host, bucket);
  }

  for (const ids of govByHost.values()) {
    for (const id of ids.slice(1)) {
      await prisma.streamRegistryEntry.update({
        where: { id },
        data: { enabled: false, health: "stale" },
      });
      disabled += 1;
    }
  }

  return disabled;
}

/** Gov portals rarely carry factory listings — disable for blue-collar local-first profiles. */
export async function sanitizeCnGovStreamsForFactoryProfile(
  seekerProfileId: string,
): Promise<number> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { id: true, seedUrl: true, discoveredVia: true },
  });

  let disabled = 0;
  for (const row of rows) {
    if (isUserCustomStream(row.discoveredVia)) continue;
    if (!/\.gov\.cn/i.test(row.seedUrl)) continue;

    await prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: { enabled: false, health: "dead" },
    });
    disabled += 1;
  }

  return disabled;
}

/** Disable redundant Memory: streams when a registry stream already covers the same host. */
export async function sanitizeMemoryDuplicateStreams(seekerProfileId: string): Promise<number> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { id: true, label: true, seedUrl: true, discoveredVia: true },
  });

  const hostsWithRegistry = new Set<string>();
  for (const row of rows) {
    if (row.label.startsWith("Memory:")) continue;
    try {
      hostsWithRegistry.add(new URL(row.seedUrl).hostname.toLowerCase());
    } catch {
      // skip
    }
  }

  let disabled = 0;
  for (const row of rows) {
    if (!row.label.startsWith("Memory:") && !row.discoveredVia.startsWith("memory")) continue;
    let host = "";
    try {
      host = new URL(row.seedUrl).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (!hostsWithRegistry.has(host)) continue;
    await prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: { enabled: false, health: "stale" },
    });
    disabled += 1;
  }

  return disabled;
}

export async function discoverAndPersistStreams(
  profile: SeekerProfile,
  options?: SourceDiscoveryProgressOptions,
): Promise<SourceDiscoveryManifest> {
  options?.onPhase?.("preparing");
  options?.onPhase?.("searching");
  const blockedDomains = await getBlockedDomains(profile.id);
  const memory = await loadCityDiscoveryMemory(profile.id, profile.constraints.primaryCity);

  let manifest: SourceDiscoveryManifest;
  try {
    manifest = await runSourceDiscovery(profile, {
      blockedDomains,
      memory,
      signal: options?.signal,
    });
  } catch (error) {
    if (isDiscoveryAborted(error)) throw error;
    throw error;
  }

  options?.onPhase?.("validating", String(manifest.candidates.length));
  options?.onPhase?.("saving");
  await clearAutoDiscoveredStreams(profile.id);
  await persistSourceDiscovery(profile.id, manifest);
  await recordMemoryFromManifest(
    profile.id,
    profile.constraints.primaryCity,
    manifest,
    profile.constraints.remotePreference,
  );
  return manifest;
}

function sessionAuthForStreamUrl(
  url: string,
  rowAuth: StreamSessionAuth | undefined,
  cnSessions?: CnSessionCredentialSettings,
): StreamSessionAuth | undefined {
  if (rowAuth) return rowAuth;
  if (!cnSessions) return undefined;

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("zhipin.com") && cnSessions.zhipinCookie) {
      return { mode: "cookie", secret: cnSessions.zhipinCookie };
    }
    if (host.includes("zhaopin.com") && cnSessions.zhaopinCookie) {
      return { mode: "cookie", secret: cnSessions.zhaopinCookie };
    }
    if (host.includes("58.com") && cnSessions.cookie58) {
      return { mode: "cookie", secret: cnSessions.cookie58 };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function loadEnabledStreamConfigs(seekerProfileId: string): Promise<StreamConfig[]> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: {
      seekerProfileId,
      enabled: true,
    },
    orderBy: [{ learningWeight: "desc" }, { confidence: "desc" }],
  });

  const cnSessions = await loadCnSessionCredentialSettings(seekerProfileId);

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    url: row.seedUrl,
    kind: row.kind as StreamKind,
    sessionAuth: sessionAuthForStreamUrl(row.seedUrl, sessionAuthFromRow(row), cnSessions),
    regionHint: row.regionHint,
  }));
}

export async function countEnabledStreams(seekerProfileId: string): Promise<number> {
  return prisma.streamRegistryEntry.count({
    where: { seekerProfileId, enabled: true },
  });
}

export async function getLatestSourceDiscoverySummary(seekerProfileId: string) {
  return prisma.sourceDiscoveryRun.findFirst({
    where: { seekerProfileId },
    orderBy: { ranAt: "desc" },
  });
}

export async function listStreamRegistry(seekerProfileId: string) {
  return prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId },
    orderBy: [{ enabled: "desc" }, { confidence: "desc" }],
  });
}

function intentTermsFromProfile(profile: SeekerProfile): string[] {
  return [
    ...profile.intent.desiredRoles,
    ...profile.constraints.acceptableCities,
    profile.constraints.primaryCity,
  ]
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

async function revalidateStreamRow(profile: SeekerProfile, row: {
  id: string;
  label: string;
  kind: string;
  seedUrl: string;
  discoveredVia: string;
  regionHint: string;
  authMode: string;
  authSecret: string | null;
}) {
  const validated = await validateStreamCandidate({
    label: row.label,
    kind: row.kind as StreamKind,
    seedUrl: row.seedUrl,
    discoveredVia: row.discoveredVia,
    regionHint: row.regionHint,
    intentTerms: intentTermsFromProfile(profile),
    sessionAuth: sessionAuthFromRow(row),
  });

  if (!validated) {
    return prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: { health: "stale" },
    });
  }

  const promoted = validated.validationTier === "proven";

  return prisma.streamRegistryEntry.update({
    where: { id: row.id },
    data: {
      confidence: validated.confidence,
      sampleItemCount: validated.sampleItemCount,
      validationTier: validated.validationTier,
      lastValidatedAt: new Date(validated.lastValidatedAt),
      enabled: promoted,
      health: promoted ? "healthy" : "unknown",
    },
  });
}

export async function revalidateCustomStream(profile: SeekerProfile, streamId: string) {
  const existing = await prisma.streamRegistryEntry.findFirst({
    where: { id: streamId, seekerProfileId: profile.id },
  });
  if (!existing) return null;
  if (!isUserCustomStream(existing.discoveredVia)) {
    throw new Error(SOURCE_ERROR.SESSION_AUTH_CUSTOM_ONLY);
  }

  const updated = await revalidateStreamRow(profile, existing);
  if (updated.health === "stale") {
    throw new Error(SOURCE_ERROR.VALIDATION_FAILED);
  }
  return updated;
}

export async function addCustomStream(
  profile: SeekerProfile,
  input: {
    url: string;
    label?: string;
    kind?: StreamKind;
    authMode?: "none" | "cookie" | "bearer";
    authSecret?: string | null;
  },
) {
  const seedUrl = normalizeStreamUrl(input.url);
  const kind = input.kind ?? inferStreamKind(seedUrl);
  const auth = normalizeSessionInput(seedUrl, input);
  const intentTerms = intentTermsFromProfile(profile);

  const validated = await validateStreamCandidate({
    label: input.label?.trim() || seedUrl,
    kind,
    seedUrl,
    discoveredVia: USER_CUSTOM_DISCOVERED_VIA,
    regionHint: profile.constraints.primaryCity,
    intentTerms,
    sessionAuth: auth.sessionAuth,
  });

  if (!validated || validated.validationTier !== "proven") {
    throw new Error(SOURCE_ERROR.VALIDATION_FAILED);
  }

  const label = input.label?.trim() || validated.label.replace(/^Search hit: /, "") || seedUrl;

  return prisma.streamRegistryEntry.upsert({
    where: {
      seekerProfileId_seedUrl: {
        seekerProfileId: profile.id,
        seedUrl,
      },
    },
    create: {
      ...mapCandidateToRow(profile.id, { ...validated, label, discoveredVia: USER_CUSTOM_DISCOVERED_VIA }),
      learningWeight: 1.25,
      authMode: auth.authMode,
      authSecret: auth.authSecret,
    },
    update: {
      label,
      kind: validated.kind,
      discoveredVia: USER_CUSTOM_DISCOVERED_VIA,
      regionHint: validated.regionHint,
      confidence: validated.confidence,
      sampleItemCount: validated.sampleItemCount,
      lastValidatedAt: new Date(validated.lastValidatedAt),
      enabled: true,
      health: "unknown",
      learningWeight: 1.25,
      authMode: auth.authMode,
      authSecret: auth.authSecret,
    },
  });
}

export async function removeCustomStream(seekerProfileId: string, streamId: string) {
  const existing = await prisma.streamRegistryEntry.findFirst({
    where: { id: streamId, seekerProfileId },
  });

  if (!existing) return null;
  if (!isUserCustomStream(existing.discoveredVia)) {
    throw new Error(SOURCE_ERROR.DELETE_NOT_CUSTOM);
  }

  return prisma.streamRegistryEntry.delete({ where: { id: streamId } });
}

const OPML_IMPORT_LIMIT = 50;

export async function importOpmlStreams(
  profile: SeekerProfile,
  opmlText: string,
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const feeds = parseOpmlFeeds(opmlText, OPML_IMPORT_LIMIT);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const regionHint = profile.constraints.primaryCity;

  for (const feed of feeds) {
    let seedUrl: string;
    try {
      seedUrl = normalizeStreamUrl(feed.feedUrl);
    } catch {
      skipped += 1;
      errors.push(feed.feedUrl);
      continue;
    }

    const candidate = createLightweightStreamCandidate({
      label: feed.title.trim() || seedUrl,
      kind: "rss",
      seedUrl,
      discoveredVia: USER_OPML_DISCOVERED_VIA,
      regionHint,
      confidence: 0.55,
    });

    try {
      await prisma.streamRegistryEntry.upsert({
        where: {
          seekerProfileId_seedUrl: {
            seekerProfileId: profile.id,
            seedUrl,
          },
        },
        create: {
          ...mapCandidateToRow(profile.id, candidate, true),
          learningWeight: 1.25,
        },
        update: {
          label: candidate.label,
          kind: candidate.kind,
          discoveredVia: USER_OPML_DISCOVERED_VIA,
          regionHint: candidate.regionHint,
          confidence: candidate.confidence,
          enabled: true,
          health: "unknown",
          learningWeight: 1.25,
        },
      });
      imported += 1;
    } catch {
      skipped += 1;
      errors.push(seedUrl);
    }
  }

  return { imported, skipped, errors };
}

export async function updateStreamSettings(
  seekerProfileId: string,
  streamId: string,
  input: {
    enabled?: boolean;
    authMode?: "none" | "cookie" | "bearer";
    authSecret?: string | null;
  },
  options?: { profile?: SeekerProfile; revalidate?: boolean },
) {
  const existing = await prisma.streamRegistryEntry.findFirst({
    where: { id: streamId, seekerProfileId },
  });
  if (!existing) return null;

  const data: {
    enabled?: boolean;
    authMode?: string;
    authSecret?: string | null;
    userBlocked?: boolean;
    learningWeight?: number;
  } = {};

  if (typeof input.enabled === "boolean") {
    data.enabled = input.enabled;
    if (input.enabled) {
      data.userBlocked = false;
      if (existing.learningWeight === 0) {
        data.learningWeight = 1;
      }
    } else if (!isUserCustomStream(existing.discoveredVia)) {
      data.userBlocked = true;
      data.learningWeight = 0;
    }
  }

  let authChanged = false;
  if (input.authMode !== undefined || input.authSecret !== undefined) {
    if (!isUserCustomStream(existing.discoveredVia)) {
      throw new Error(SOURCE_ERROR.SESSION_AUTH_CUSTOM_ONLY);
    }
    const auth = normalizeSessionInput(existing.seedUrl, {
      authMode: input.authMode ?? (existing.authMode as "none" | "cookie" | "bearer"),
      authSecret:
        input.authSecret === null
          ? null
          : (input.authSecret ?? existing.authSecret ?? undefined),
    });
    authChanged =
      auth.authMode !== existing.authMode ||
      auth.authSecret !== existing.authSecret;
    data.authMode = auth.authMode;
    data.authSecret = auth.authSecret;
  }

  const updated = await prisma.streamRegistryEntry.update({
    where: { id: streamId },
    data,
  });

  const shouldRevalidate =
    options?.revalidate || (authChanged && options?.profile);
  if (shouldRevalidate && options?.profile) {
    return revalidateStreamRow(options.profile, updated);
  }

  return updated;
}

export async function enableStreamsByIds(
  seekerProfileId: string,
  streamIds: string[],
): Promise<number> {
  const ids = [...new Set(streamIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  const result = await prisma.streamRegistryEntry.updateMany({
    where: { seekerProfileId, id: { in: ids } },
    data: {
      enabled: true,
      userBlocked: false,
    },
  });

  if (result.count > 0) {
    await prisma.streamRegistryEntry.updateMany({
      where: { seekerProfileId, id: { in: ids }, learningWeight: 0 },
      data: { learningWeight: 1 },
    });
  }

  return result.count;
}

/** @deprecated Use updateStreamSettings */
export async function updateStreamEnabled(
  seekerProfileId: string,
  streamId: string,
  enabled: boolean,
) {
  return updateStreamSettings(seekerProfileId, streamId, { enabled });
}

export function serializeStreamRow(row: Awaited<ReturnType<typeof listStreamRegistry>>[number]) {
  const workCategory = classifyStreamWorkCategory({
    regionHint: row.regionHint,
    seedUrl: row.seedUrl,
  });

  return {
    id: row.id,
    label: row.label,
    kind: row.kind,
    seedUrl: row.seedUrl,
    regionHint: row.regionHint,
    workCategory,
    confidence: row.confidence,
    sampleItemCount: row.sampleItemCount,
    enabled: row.enabled,
    health: row.health,
    opportunityYield: row.opportunityYield,
    learningWeight: row.learningWeight,
    lastValidatedAt: row.lastValidatedAt.toISOString(),
    discoveredVia: row.discoveredVia,
    origin: (isUserCustomStream(row.discoveredVia) ? "user" : "auto") as "user" | "auto",
    authMode: row.authMode as "none" | "cookie" | "bearer",
    hasSessionAuth: row.authMode !== "none" && Boolean(row.authSecret),
    intakeType: resolveSourceIntakeType({
      kind: row.kind,
      origin: isUserCustomStream(row.discoveredVia) ? "user" : "auto",
      discoveredVia: row.discoveredVia,
    }),
    ephemeral: false,
  };
}
