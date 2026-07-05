import type { SeekerProfile, SourceDiscoveryManifest, StreamCandidate, StreamKind } from "@aperio-j/core";
import { classifyStreamWorkCategory } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import { runSourceDiscovery } from "@aperio-j/discovery/source-discovery";
import { isDiscoveryAborted } from "@aperio-j/discovery/discovery-abort";
import { prepareCnStreamFetchUrl, seedUrlMatchesCityProfile, isCnJobAggregatorUrl } from "@aperio-j/discovery/cn-sources";
import { resolveProbePack, isChinaCityProfile, isCnRemoteFirstProfile, REMOTE_REGISTRY_STREAMS } from "@aperio-j/probe";
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
import type { StreamConfig } from "@aperio-j/discovery/fetch-streams";
import { resolveSourceIntakeType } from "./source-intake";
import type { SourceDiscoveryProgressOptions } from "./engine-phases";

export const USER_CUSTOM_DISCOVERED_VIA = "user-custom";

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

/** Seed international remote RSS boards for CN remote-first profiles. */
export async function ensureCnRemoteRegistryStreams(seekerProfileId: string): Promise<number> {
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
      discoveredVia: `cn-remote-trusted:${stream.id}`,
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

/** Seed city-scoped CN aggregator/gov streams when registry lacks valid local sources. */
export async function ensureCnCityRegistryStreams(
  seekerProfileId: string,
  city: string,
  acceptableCities: string[] = [],
): Promise<number> {
  if (!city.trim() || !isChinaCityProfile(city, acceptableCities)) return 0;

  const pack = resolveProbePack(city, acceptableCities);
  const existing = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId, enabled: true },
    select: { seedUrl: true },
  });
  const hasValidLocal = existing.some((row) => seedUrlMatchesCityProfile(row.seedUrl, city));
  if (hasValidLocal) return 0;

  let added = 0;
  const now = new Date().toISOString();

  for (const stream of pack.registryStreams) {
    const seedUrl = prepareCnStreamFetchUrl(stream.seedUrl, city);
    if (!seedUrlMatchesCityProfile(seedUrl, city)) continue;

    const candidate: StreamCandidate = {
      id: `stream-${seedUrl}`,
      label: stream.label,
      kind: stream.kind,
      seedUrl,
      discoveredVia: `cn-city-trusted:${stream.id}`,
      regionHint: city,
      confidence: stream.domainTier === "gov" ? 0.62 : 0.55,
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

export async function loadEnabledStreamConfigs(seekerProfileId: string): Promise<StreamConfig[]> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: {
      seekerProfileId,
      OR: [
        { enabled: true },
        { validationTier: "candidate", health: { not: "dead" } },
      ],
    },
    orderBy: [{ learningWeight: "desc" }, { confidence: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    url: row.seedUrl,
    kind: row.kind as StreamKind,
    sessionAuth: sessionAuthFromRow(row),
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
    if (!input.enabled && !isUserCustomStream(existing.discoveredVia)) {
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
