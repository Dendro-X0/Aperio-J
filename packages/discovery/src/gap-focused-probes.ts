import type { SeekerProfile, SourceProbe } from "@aperio-j/core";
import {
  buildSearchEngineUrl,
  resolveSearchSphere,
  SEARCH_SPHERE_ENGINES,
} from "@aperio-j/probe";
import {
  buildGapFocusedSearchQueries,
  type DiscoveryGap,
  isBlockedDomain,
} from "./stream-learning.js";

function probeId(prefix: string, seed: string): string {
  let hash = 0;
  const raw = `${prefix}:${seed}`;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `probe-${prefix}-${hash.toString(16)}`;
}

export function buildGapFocusedProbes(
  profile: SeekerProfile,
  gap: DiscoveryGap,
  blockedDomains: ReadonlySet<string> = new Set(),
): SourceProbe[] {
  const city = profile.constraints.primaryCity.trim();
  if (!city || (!gap.needsLocalSources && !gap.needsRoleFocusedSearch)) {
    return [];
  }

  const sphere = resolveSearchSphere(city, profile.constraints.acceptableCities);
  if (sphere === "none") return [];

  const intentTerms = [
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    city,
    ...profile.constraints.acceptableCities,
  ]
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  const queries = buildGapFocusedSearchQueries(profile, gap).slice(0, 6);
  const engines = SEARCH_SPHERE_ENGINES[sphere];
  const probes: SourceProbe[] = [];

  for (const engine of engines) {
    for (const query of queries) {
      const seed = buildSearchEngineUrl(engine, query);
      if (isBlockedDomain(seed, blockedDomains)) continue;

      probes.push({
        id: probeId("gap-search", `${engine}:${query}`),
        kind: "search_discovery",
        label: `Gap search (${engine}): ${query}`,
        seed,
        regionHint: city,
        intentTerms,
        rationale: `Gap-focused discovery (${gap.needsLocalSources ? "local" : ""}${gap.needsRoleFocusedSearch ? "+role" : ""})`,
      });
    }
  }

  return probes;
}
