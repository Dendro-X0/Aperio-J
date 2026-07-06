import type { SeekerProfile, StreamCandidate } from "@aperio-j/core";
import { isRemoteBoardUrl } from "@aperio-j/core";
import {
  buildGenericCityStreams,
  buildInternationalCityStreams,
  isChinaCityProfile,
  isCnLocalFirstProfile,
  resolveProbePack,
} from "@aperio-j/probe";
import { rankStreamCandidates } from "./validate-stream.js";
import { isCnJobAggregatorUrl, isGovCnHost } from "./cn-sources.js";

function streamId(seedUrl: string): string {
  let hash = 0;
  for (let i = 0; i < seedUrl.length; i++) {
    hash = (hash * 31 + seedUrl.charCodeAt(i)) >>> 0;
  }
  return `stream-${hash.toString(16)}`;
}

/** Seed known local portals even when live validation fails (bot blocks, JS pages). */
export function trustlistedLocalRegistryCandidates(
  city: string,
  regionHint: string,
): StreamCandidate[] {
  const now = new Date().toISOString();
  const trimmedCity = city.trim();
  if (!trimmedCity) return [];

  const streams = isChinaCityProfile(trimmedCity)
    ? [
        ...resolveProbePack(trimmedCity).registryStreams.filter(
          (stream) => !isRemoteBoardUrl(stream.seedUrl),
        ),
        ...buildGenericCityStreams(trimmedCity),
      ]
    : buildInternationalCityStreams(trimmedCity);

  return streams
    .filter((stream) => !isRemoteBoardUrl(stream.seedUrl))
    .filter((stream) => !isChinaCityProfile(trimmedCity) || !/linkedin\.com|indeed\.com/i.test(stream.seedUrl))
    .map((stream) => ({
      id: streamId(stream.seedUrl),
      label: stream.label,
      kind: stream.kind,
      seedUrl: stream.seedUrl,
      discoveredVia: `registry-trusted:${stream.id}`,
      regionHint,
      confidence: stream.domainTier === "gov" ? 0.48 : stream.domainTier === "aggregator" ? 0.64 : 0.52,
      sampleItemCount: 0,
      lastValidatedAt: now,
      health: "unknown" as const,
      validationTier: "candidate" as const,
    }));
}

export function mergeTrustlistedLocalCandidates(
  candidates: StreamCandidate[],
  city: string,
  regionHint: string,
): StreamCandidate[] {
  const trimmedCity = city.trim();
  if (!trimmedCity) return candidates;

  const byUrl = new Map(candidates.map((candidate) => [candidate.seedUrl, candidate]));

  for (const trusted of trustlistedLocalRegistryCandidates(trimmedCity, regionHint)) {
    const existing = byUrl.get(trusted.seedUrl);
    if (!existing) {
      byUrl.set(trusted.seedUrl, trusted);
      continue;
    }
    if (existing.validationTier === "candidate" && trusted.confidence > existing.confidence) {
      byUrl.set(trusted.seedUrl, trusted);
    }
    if (existing.validationTier === "proven") {
      continue;
    }
  }

  return [...byUrl.values()];
}

export function selectEnabledStreamCandidates(
  candidates: StreamCandidate[],
  profile: SeekerProfile,
  limit: number,
): StreamCandidate[] {
  return selectStreamCandidatesByTier(candidates, profile, limit, "proven");
}

export function selectDeferredStreamCandidates(
  candidates: StreamCandidate[],
  profile: SeekerProfile,
  limit: number,
  excludeUrls: string[] = [],
): StreamCandidate[] {
  const excluded = new Set(excludeUrls);
  const deferredPool = candidates.filter(
    (candidate) =>
      candidate.validationTier === "candidate" && !excluded.has(candidate.seedUrl),
  );
  return selectStreamCandidatesByTier(deferredPool, profile, limit, "candidate");
}

function orderCandidatesForProfile(
  candidates: StreamCandidate[],
  profile: SeekerProfile,
): StreamCandidate[] {
  if (!isCnLocalFirstProfile(profile)) return candidates;

  const aggregators = candidates.filter((row) => isCnJobAggregatorUrl(row.seedUrl));
  const gov = candidates.filter((row) => isGovCnHost(row.seedUrl));
  const other = candidates.filter(
    (row) => !isCnJobAggregatorUrl(row.seedUrl) && !isGovCnHost(row.seedUrl),
  );
  return [...aggregators, ...other, ...gov];
}

function selectStreamCandidatesByTier(
  candidates: StreamCandidate[],
  profile: SeekerProfile,
  limit: number,
  tier: StreamCandidate["validationTier"],
): StreamCandidate[] {
  const ranked = orderCandidatesForProfile(
    rankStreamCandidates(candidates.filter((candidate) => candidate.validationTier === tier)),
    profile,
  );
  const city = profile.constraints.primaryCity.trim();
  const preference = profile.constraints.remotePreference;

  const local = ranked.filter((candidate) => !isRemoteBoardUrl(candidate.seedUrl));
  const remote = ranked.filter((candidate) => isRemoteBoardUrl(candidate.seedUrl));

  if (!city) {
    return preference === "onsite-only"
      ? local.slice(0, limit)
      : ranked.slice(0, limit);
  }

  const remoteCap =
    preference === "remote-only"
      ? limit
      : preference === "hybrid-ok"
        ? Math.min(8, limit)
        : 0;
  const govCap = isCnLocalFirstProfile(profile) ? 2 : limit;

  const selected: StreamCandidate[] = [];
  const selectedUrls = new Set<string>();

  const pushCandidate = (candidate: StreamCandidate): void => {
    if (selectedUrls.has(candidate.seedUrl)) return;
    selectedUrls.add(candidate.seedUrl);
    selected.push(candidate);
  };

  if (remoteCap > 0) {
    for (const candidate of remote) {
      if (selected.filter((row) => isRemoteBoardUrl(row.seedUrl)).length >= remoteCap) break;
      if (selected.length >= limit) break;
      pushCandidate(candidate);
    }
  }

  let govSelected = 0;
  for (const candidate of local) {
    if (selected.length >= limit) break;
    if (isGovCnHost(candidate.seedUrl)) {
      if (govSelected >= govCap) continue;
      govSelected += 1;
    }
    const localCap = preference === "remote-only" ? 0 : limit - remoteCap;
    if (
      localCap > 0 &&
      selected.filter((row) => !isRemoteBoardUrl(row.seedUrl)).length >= localCap
    ) {
      break;
    }
    if (preference === "remote-only") continue;
    pushCandidate(candidate);
  }

  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    if (selectedUrls.has(candidate.seedUrl)) continue;
    if (remoteCap === 0 && isRemoteBoardUrl(candidate.seedUrl)) continue;
    if (preference === "remote-only" && !isRemoteBoardUrl(candidate.seedUrl)) continue;
    pushCandidate(candidate);
  }

  return rankStreamCandidates(selected).slice(0, limit);
}

export function partitionStreamCandidates(
  candidates: StreamCandidate[],
  profile: SeekerProfile,
  limit: number,
): { enabled: StreamCandidate[]; deferred: StreamCandidate[] } {
  const enabled = selectEnabledStreamCandidates(candidates, profile, limit);
  const deferredLimit = Math.min(8, Math.max(0, limit - enabled.length) + 4);
  const deferred = selectDeferredStreamCandidates(
    candidates,
    profile,
    deferredLimit,
    enabled.map((row) => row.seedUrl),
  );

  return { enabled, deferred };
}
