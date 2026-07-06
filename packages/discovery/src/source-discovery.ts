import type { SeekerProfile, SourceDiscoveryManifest, StreamCandidate } from "@aperio-j/core";
import { isRemoteBoardUrl } from "@aperio-j/core";
import { expandSourceProbes, isCnLocalFirstProfile } from "@aperio-j/probe";
import { executeProbe, rankStreamCandidates } from "./validate-stream.js";
import {
  mergeTrustlistedLocalCandidates,
  partitionStreamCandidates,
} from "./select-enabled-streams.js";
import { buildGapFocusedProbes } from "./gap-focused-probes.js";
import {
  buildMemoryProbes,
  mergeProbesWithMemory,
  type CityDiscoveryMemory,
} from "./discovery-memory.js";
import { isBlockedDomain, type DiscoveryGap } from "./stream-learning.js";
import { throwIfAborted } from "./discovery-abort.js";
import { filterCnStreamCandidates } from "./cn-sources.js";

export interface RunSourceDiscoveryOptions {
  /** Cap probes executed per run (budget). */
  maxProbes?: number;
  /** Max enabled streams after ranking. */
  maxStreams?: number;
  /** Include validated list_page sources (not only RSS). */
  includeListPages?: boolean;
  /** Hostnames to skip (user-blocked domains). */
  blockedDomains?: string[];
  /** When set, run gap-focused probes instead of the full expansion. */
  gap?: DiscoveryGap;
  /** Cross-run learned seeds for this city — probed before fresh discovery. */
  memory?: CityDiscoveryMemory | null;
  /** When aborted, stop probing and throw DiscoveryAbortedError. */
  signal?: AbortSignal;
}

function blockedDomainSet(blockedDomains: string[] = []): Set<string> {
  return new Set(blockedDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean));
}

function filterBlockedCandidates(
  candidates: StreamCandidate[],
  blocked: ReadonlySet<string>,
): StreamCandidate[] {
  if (blocked.size === 0) return candidates;
  return candidates.filter((candidate) => !isBlockedDomain(candidate.seedUrl, blocked));
}

function adjustConfidenceForProfile(
  candidate: StreamCandidate,
  profile: SeekerProfile,
): StreamCandidate {
  const city = profile.constraints.primaryCity.trim();
  if (!city) return candidate;

  let confidence = candidate.confidence;
  const host = (() => {
    try {
      return new URL(candidate.seedUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (isRemoteBoardUrl(candidate.seedUrl)) {
    confidence *= profile.constraints.remotePreference === "remote-only" ? 1 : 0.45;
  }

  if (candidate.regionHint === city || candidate.regionHint === city.replace(/市$/u, "")) {
    confidence += 0.08;
  }

  if (/\.gov(\.|$)|\.gouv\.|arbeitsagentur|francetravail|jobbank|mycareersfuture/i.test(host)) {
    confidence += 0.1;
  }

  return { ...candidate, confidence: Math.min(confidence, 0.95) };
}

function discoveryProbeConcurrency(): number {
  return Math.max(1, Number(process.env.APERO_J_DISCOVERY_PROBE_CONCURRENCY ?? 5));
}

function orderProbesForProfile(probes: import("@aperio-j/core").SourceProbe[], profile: SeekerProfile) {
  if (!isCnLocalFirstProfile(profile)) return probes;

  const search = probes.filter((probe) => probe.kind === "search_discovery");
  const registry = probes.filter((probe) => probe.kind === "registry_lookup");
  const rest = probes.filter(
    (probe) => probe.kind !== "search_discovery" && probe.kind !== "registry_lookup",
  );
  return [...search, ...registry, ...rest];
}

async function executeProbesConcurrent(
  probes: import("@aperio-j/core").SourceProbe[],
  blocked: ReadonlySet<string>,
  signal?: AbortSignal,
): Promise<{ candidates: StreamCandidate[]; errors: string[] }> {
  const concurrency = discoveryProbeConcurrency();
  const candidates: StreamCandidate[] = [];
  const errors: string[] = [];

  for (let offset = 0; offset < probes.length; offset += concurrency) {
    throwIfAborted(signal);
    const batch = probes.slice(offset, offset + concurrency);
    const results = await Promise.allSettled(batch.map((probe) => executeProbe(probe)));

    for (let index = 0; index < results.length; index++) {
      const result = results[index]!;
      const probe = batch[index]!;
      if (result.status === "fulfilled") {
        candidates.push(...filterBlockedCandidates(result.value, blocked));
      } else {
        errors.push(
          `${probe.label}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }
  }

  return { candidates, errors };
}

function dropIntlAggregatorsForCnLocal(
  candidates: StreamCandidate[],
  profile: SeekerProfile,
): StreamCandidate[] {
  if (!isCnLocalFirstProfile(profile)) return candidates;
  return candidates.filter((candidate) => !/linkedin\.com|indeed\.com/i.test(candidate.seedUrl));
}

export async function runSourceDiscovery(
  profile: SeekerProfile,
  options: RunSourceDiscoveryOptions = {},
): Promise<SourceDiscoveryManifest> {
  const maxProbes = options.maxProbes ?? 40;
  const maxStreams = options.maxStreams ?? 14;
  const includeListPages = options.includeListPages ?? true;
  const blocked = blockedDomainSet(options.blockedDomains);
  const memoryProbes = options.memory
    ? buildMemoryProbes(options.memory, profile, blocked)
    : [];

  const baseProbes = options.gap
    ? buildGapFocusedProbes(profile, options.gap, blocked)
    : expandSourceProbes(profile).filter((probe) => !isBlockedDomain(probe.seed, blocked));

  const probes = orderProbesForProfile(
    mergeProbesWithMemory(memoryProbes, baseProbes, profile).slice(0, maxProbes),
    profile,
  );

  const { candidates: allCandidates, errors } = await executeProbesConcurrent(
    probes,
    blocked,
    options.signal,
  );

  const adjusted = filterBlockedCandidates(
    allCandidates.map((candidate) => adjustConfidenceForProfile(candidate, profile)),
    blocked,
  );
  const city = profile.constraints.primaryCity.trim();
  const withTrusted = mergeTrustlistedLocalCandidates(adjusted, city, city);
  const adjustedTrusted = filterBlockedCandidates(
    withTrusted.map((candidate) => adjustConfidenceForProfile(candidate, profile)),
    blocked,
  );
  let { enabled, deferred } = partitionStreamCandidates(adjustedTrusted, profile, maxStreams);

  enabled = dropIntlAggregatorsForCnLocal(enabled, profile);
  deferred = dropIntlAggregatorsForCnLocal(deferred, profile);

  if (city) {
    enabled = filterCnStreamCandidates(enabled, city);
    deferred = filterCnStreamCandidates(deferred, city);
  }

  if (!includeListPages) {
    enabled = enabled.filter((candidate) => candidate.kind === "rss");
    deferred = deferred.filter((candidate) => candidate.kind === "rss");
  }

  return {
    probes,
    candidates: rankStreamCandidates(adjustedTrusted).slice(0, 50),
    enabled,
    deferred,
    errors,
    ranAt: new Date().toISOString(),
  };
}
