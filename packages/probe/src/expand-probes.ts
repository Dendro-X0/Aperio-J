import type { SeekerProfile, SourceProbe } from "@aperio-j/core";
import {
  buildGenericCityStreams,
  buildInternationalCityStreams,
  isCnLocalFirstProfile,
  isCnRemoteFirstProfile,
  REMOTE_REGISTRY_STREAMS,
  resolveProbePack,
} from "./probe-packs.js";
import {
  CN_FREELANCE_REGISTRY_STREAMS,
  isCnFreelanceIntentProfile,
} from "./cn-freelance-packs.js";
import {
  flattenSignalPackStreams,
  resolveSignalPacksForProfile,
} from "./signal-packs/resolve.js";
import { expandRegionalSearchProbes } from "./search-queries.js";

const MAX_PROBES = 40;
const HYBRID_REMOTE_PROBE_CAP = 8;

function remoteRegistryStreamsForProfile(
  profile: SeekerProfile,
): typeof REMOTE_REGISTRY_STREAMS {
  const city = profile.constraints.primaryCity.trim();
  const preference = profile.constraints.remotePreference;

  if (preference === "onsite-only") return [];
  if (!city) return REMOTE_REGISTRY_STREAMS;
  if (preference === "remote-only") return REMOTE_REGISTRY_STREAMS;
  return REMOTE_REGISTRY_STREAMS.slice(0, HYBRID_REMOTE_PROBE_CAP);
}

function probeId(prefix: string, seed: string): string {
  let hash = 0;
  const raw = `${prefix}:${seed}`;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `probe-${prefix}-${hash.toString(16)}`;
}

function registryProbe(
  stream: { label: string; seedUrl: string; domainTier: string },
  packId: string,
  regionHint: string,
  intentTerms: string[],
): SourceProbe {
  return {
    id: probeId("registry", stream.seedUrl),
    kind: "registry_lookup",
    label: stream.label,
    seed: stream.seedUrl,
    regionHint,
    intentTerms,
    rationale: `ProbePack ${packId} registry stream (${stream.domainTier}) — fallback hint`,
  };
}

function appendRegistryStreams(
  probes: SourceProbe[],
  streams: Array<{ label: string; seedUrl: string; domainTier: string }>,
  packId: string,
  regionHint: string,
  intentTerms: string[],
): void {
  for (const stream of streams) {
    probes.push(registryProbe(stream, packId, regionHint, intentTerms));
  }
}

export function expandSourceProbes(profile: SeekerProfile): SourceProbe[] {
  const pack = resolveProbePack(
    profile.constraints.primaryCity,
    profile.constraints.acceptableCities,
  );
  const chinaContext = pack.id.startsWith("zh-CN");
  const globalCity = pack.id === "global-city";
  const globalRemote = pack.id === "global-remote";

  const intentTerms = [
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
  ]
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  const city = profile.constraints.primaryCity.trim();
  const regionHint = city || (chinaContext ? "" : "remote");
  const probes: SourceProbe[] = [];
  const allowRemoteBoards = profile.constraints.remotePreference !== "onsite-only";
  const cnRemoteFirst = isCnRemoteFirstProfile(
    profile.constraints.primaryCity,
    profile.constraints.acceptableCities,
    profile.constraints.remotePreference,
    profile,
  );
  const cnLocalFirst = isCnLocalFirstProfile(profile);

  // CN remote-first: international remote boards + optional CN freelance experiment.
  if (cnRemoteFirst) {
    appendRegistryStreams(probes, REMOTE_REGISTRY_STREAMS, "zh-CN-remote-dev", "remote", intentTerms);
    if (isCnFreelanceIntentProfile(profile)) {
      appendRegistryStreams(
        probes,
        CN_FREELANCE_REGISTRY_STREAMS,
        "zh-CN-freelance",
        "remote",
        intentTerms,
      );
    }
    return probes.slice(0, MAX_PROBES);
  }

  // 1. Search discovery — primary path for any city profile
  if (city) {
    probes.push(
      ...expandRegionalSearchProbes(
        city,
        profile.constraints.acceptableCities,
        regionHint,
        intentTerms,
        probeId,
      ),
    );
  }

  // 1b. Remote boards before local registry (nomads / hybrid city profiles)
  if (globalCity && allowRemoteBoards) {
    appendRegistryStreams(
      probes,
      remoteRegistryStreamsForProfile(profile),
      pack.id,
      "remote",
      intentTerms,
    );
  }

  // 2. RSS autodiscover on pack seed pages (skip for CN local-first — search is faster)
  if (!cnLocalFirst) {
    for (const pageUrl of pack.seedPages) {
      probes.push({
        id: probeId("autodiscover", pageUrl),
        kind: "rss_autodiscover",
        label: `RSS autodiscover: ${pageUrl}`,
        seed: pageUrl,
        regionHint,
        intentTerms,
        rationale: `ProbePack ${pack.id} seed page for feed discovery`,
      });
    }
  }

  // 3. Registry lookup — fallback hints, not the primary discovery path
  if (globalRemote) {
    appendRegistryStreams(probes, pack.registryStreams, pack.id, "remote", intentTerms);
    if (allowRemoteBoards) {
      appendRegistryStreams(
        probes,
        remoteRegistryStreamsForProfile(profile),
        pack.id,
        "remote",
        intentTerms,
      );
    }
    if (isCnFreelanceIntentProfile(profile)) {
      appendRegistryStreams(
        probes,
        CN_FREELANCE_REGISTRY_STREAMS,
        "zh-CN-freelance",
        "remote",
        intentTerms,
      );
    }
  } else if (globalCity && city) {
    appendRegistryStreams(
      probes,
      buildInternationalCityStreams(city),
      pack.id,
      regionHint,
      intentTerms,
    );
  } else {
    appendRegistryStreams(probes, pack.registryStreams, pack.id, regionHint, intentTerms);

    if (pack.id === "zh-CN-generic" && city) {
      appendRegistryStreams(
        probes,
        buildGenericCityStreams(city),
        pack.id,
        regionHint,
        intentTerms,
      );
    }
  }

  if (chinaContext && city) {
    const signalPacks = resolveSignalPacksForProfile(profile);
    for (const { packId, stream } of flattenSignalPackStreams(signalPacks)) {
      appendRegistryStreams(probes, [stream], `signal-pack:${packId}`, regionHint, intentTerms);
    }
  }

  // 4. Remote RSS supplements for CN hybrid profiles (not local-first factory)
  if (chinaContext && allowRemoteBoards && !globalRemote && !cnLocalFirst) {
    appendRegistryStreams(
      probes,
      remoteRegistryStreamsForProfile(profile),
      pack.id,
      "remote",
      intentTerms,
    );
  }

  return probes.slice(0, MAX_PROBES);
}

export function expandSourceProbesSummary(profile: SeekerProfile): {
  packId: string;
  probeCount: number;
  probes: SourceProbe[];
} {
  const pack = resolveProbePack(
    profile.constraints.primaryCity,
    profile.constraints.acceptableCities,
  );
  const probes = expandSourceProbes(profile);
  return { packId: pack.id, probeCount: probes.length, probes };
}
