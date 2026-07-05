import type { RemotePreference, SeekerProfile, SourceProbe } from "@aperio-j/core";
import { isRemoteBoardUrl } from "@aperio-j/core";
import { isBlockedDomain, hostnameFromUrl } from "./stream-learning.js";
import { isNationalAggregatorRootUrl, seedUrlMatchesCityProfile } from "./cn-sources.js";

export const MAX_MEMORY_SEEDS = 16;
export const MAX_MEMORY_QUERIES = 8;
export const MEMORY_PROBE_CAP = 8;

export interface MemorySeed {
  seedUrl: string;
  score: number;
  lastSuccessAt: string;
}

export interface CityDiscoveryMemory {
  cityNorm: string;
  seeds: MemorySeed[];
  queries: string[];
}

export function normalizeCityKey(city: string): string {
  return city.trim().replace(/市$/u, "").toLowerCase();
}

export function memorySeedMatchesCity(seedUrl: string, city: string): boolean {
  return seedUrlMatchesCityProfile(seedUrl, city);
}

export function emptyCityDiscoveryMemory(city: string): CityDiscoveryMemory {
  return {
    cityNorm: normalizeCityKey(city),
    seeds: [],
    queries: [],
  };
}

export function parseCityDiscoveryMemory(raw: string, city: string): CityDiscoveryMemory {
  try {
    const parsed = JSON.parse(raw) as Partial<CityDiscoveryMemory>;
    const cityNorm = normalizeCityKey(city);
    return {
      cityNorm,
      seeds: Array.isArray(parsed.seeds)
        ? parsed.seeds
            .filter((row): row is MemorySeed => Boolean(row?.seedUrl))
            .slice(0, MAX_MEMORY_SEEDS)
        : [],
      queries: Array.isArray(parsed.queries)
        ? parsed.queries.filter((query): query is string => typeof query === "string").slice(0, MAX_MEMORY_QUERIES)
        : [],
    };
  } catch {
    return emptyCityDiscoveryMemory(city);
  }
}

export function serializeCityDiscoveryMemory(memory: CityDiscoveryMemory): string {
  return JSON.stringify(memory);
}

function probeId(prefix: string, seed: string): string {
  let hash = 0;
  const raw = `${prefix}:${seed}`;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `probe-${prefix}-${hash.toString(16)}`;
}

export function recordMemorySeed(
  memory: CityDiscoveryMemory,
  seedUrl: string,
  scoreDelta: number,
): CityDiscoveryMemory {
  const now = new Date().toISOString();
  const byUrl = new Map(memory.seeds.map((row) => [row.seedUrl, row]));

  const existing = byUrl.get(seedUrl);
  byUrl.set(seedUrl, {
    seedUrl,
    score: Math.min(10, (existing?.score ?? 0.5) + scoreDelta),
    lastSuccessAt: now,
  });

  const seeds = [...byUrl.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MEMORY_SEEDS);

  return { ...memory, seeds };
}

export function recordMemoryQuery(memory: CityDiscoveryMemory, query: string): CityDiscoveryMemory {
  const trimmed = query.trim();
  if (!trimmed) return memory;

  const queries = [trimmed, ...memory.queries.filter((row) => row !== trimmed)].slice(
    0,
    MAX_MEMORY_QUERIES,
  );

  return { ...memory, queries };
}

export function extractSearchQueryFromProbe(probe: SourceProbe): string | null {
  if (probe.kind !== "search_discovery") return null;

  try {
    const url = new URL(probe.seed);
    const query = url.searchParams.get("q") ?? url.searchParams.get("wd");
    if (query?.trim()) return query.trim();
  } catch {
    // fall through
  }

  const labelMatch = probe.label.match(/:\s*(.+)$/);
  return labelMatch?.[1]?.trim() ?? null;
}

export function recordMemoryFromProbes(
  memory: CityDiscoveryMemory,
  probes: SourceProbe[],
): CityDiscoveryMemory {
  let next = memory;
  for (const probe of probes) {
    const query = extractSearchQueryFromProbe(probe);
    if (query) next = recordMemoryQuery(next, query);
  }
  return next;
}

export function shouldRecordMemorySeed(
  seedUrl: string,
  remotePreference: RemotePreference,
): boolean {
  if (remotePreference === "onsite-only" && isRemoteBoardUrl(seedUrl)) return false;
  if (isNationalAggregatorRootUrl(seedUrl)) return false;
  return true;
}

export function recordMemoryFromCandidates(
  memory: CityDiscoveryMemory,
  seedUrls: string[],
  scoreDelta = 0.2,
  remotePreference?: RemotePreference,
): CityDiscoveryMemory {
  let next = memory;
  for (const seedUrl of seedUrls) {
    if (remotePreference && !shouldRecordMemorySeed(seedUrl, remotePreference)) continue;
    next = recordMemorySeed(next, seedUrl, scoreDelta);
  }
  return next;
}

export function buildMemoryProbes(
  memory: CityDiscoveryMemory,
  profile: SeekerProfile,
  blockedDomains: ReadonlySet<string> = new Set(),
): SourceProbe[] {
  const city = profile.constraints.primaryCity.trim();
  if (!city || memory.seeds.length === 0) return [];

  const intentTerms = [
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    city,
    ...profile.constraints.acceptableCities,
  ]
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  const probes: SourceProbe[] = [];
  const seen = new Set<string>();

  for (const seed of memory.seeds.slice(0, MEMORY_PROBE_CAP)) {
    if (
      profile.constraints.remotePreference === "onsite-only" &&
      isRemoteBoardUrl(seed.seedUrl)
    ) {
      continue;
    }
    if (isBlockedDomain(seed.seedUrl, blockedDomains) || seen.has(seed.seedUrl)) continue;
    if (!memorySeedMatchesCity(seed.seedUrl, city)) continue;
    seen.add(seed.seedUrl);

    const domain = hostnameFromUrl(seed.seedUrl) ?? "unknown";
    const kind =
      seed.seedUrl.endsWith(".rss") || seed.seedUrl.includes("/feed") ? "rss" : "list_page";

    probes.push({
      id: probeId("memory", seed.seedUrl),
      kind: "registry_lookup",
      label: `Memory: ${domain}`,
      seed: seed.seedUrl,
      regionHint: city,
      intentTerms,
      rationale: `Cross-run discovery memory (score ${seed.score.toFixed(2)})`,
    });

    if (kind === "list_page") {
      probes.push({
        id: probeId("memory-autodiscover", seed.seedUrl),
        kind: "rss_autodiscover",
        label: `Memory autodiscover: ${domain}`,
        seed: seed.seedUrl,
        regionHint: city,
        intentTerms,
        rationale: "Cross-run memory RSS autodiscover",
      });
    }
  }

  return probes;
}

export function mergeProbesWithMemory(
  memoryProbes: SourceProbe[],
  baseProbes: SourceProbe[],
): SourceProbe[] {
  const seen = new Set(memoryProbes.map((probe) => probe.seed));
  const merged = [...memoryProbes];

  for (const probe of baseProbes) {
    if (seen.has(probe.seed)) continue;
    seen.add(probe.seed);
    merged.push(probe);
  }

  return merged;
}
