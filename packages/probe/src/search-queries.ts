/** Bounded search queries for regional employment portal discovery. */

import type { SourceProbe } from "@aperio-j/core";
import {
  buildRegionalSearchQueries,
  buildSearchEngineUrl,
  maxSearchProbesPerRun,
  maxSearchQueriesPerEngine,
  resolveSearchSphere,
  resolveSearxngBaseUrl,
  SEARCH_SPHERE_ENGINES,
} from "./search-region.js";

export {
  buildRegionalSearchQueries,
  buildSearchEngineUrl,
  resolveSearchSphere,
  resolveSearxngBaseUrl,
  SEARCH_SPHERE_ENGINES,
  type SearchEngineId,
  type SearchSphere,
} from "./search-region.js";

/** @deprecated Use buildRegionalSearchQueries(city, "cn") */
export function buildCitySearchQueries(city: string): string[] {
  return buildRegionalSearchQueries(city, "cn");
}

/** @deprecated Use buildSearchEngineUrl("baidu", query) */
export function buildBaiduSearchUrl(query: string): string {
  return buildSearchEngineUrl("baidu", query);
}

export function isSearchProbeEnabled(): boolean {
  return process.env.APERO_J_SEARCH_PROBE !== "false";
}

export function expandRegionalSearchProbes(
  city: string,
  acceptableCities: string[],
  regionHint: string,
  intentTerms: string[],
  probeId: (prefix: string, seed: string) => string,
): SourceProbe[] {
  if (!city.trim() || !isSearchProbeEnabled()) return [];

  const sphere = resolveSearchSphere(city, acceptableCities);
  if (sphere === "none") return [];

  const queries = buildRegionalSearchQueries(city, sphere, intentTerms).slice(
    0,
    maxSearchQueriesPerEngine(),
  );
  const engines = SEARCH_SPHERE_ENGINES[sphere];
  const searxngBase = resolveSearxngBaseUrl();
  const engineList = searxngBase ? (["searxng", ...engines] as const) : engines;
  const probes: SourceProbe[] = [];
  const cap = maxSearchProbesPerRun();

  for (const engine of engineList) {
    for (const query of queries) {
      if (probes.length >= cap) break;

      const seed = buildSearchEngineUrl(engine, query);
      probes.push({
        id: probeId("search", `${engine}:${query}`),
        kind: "search_discovery",
        label: `Search (${engine}): ${query}`,
        seed,
        regionHint,
        intentTerms,
        rationale: `Search sphere ${sphere} via ${engine}`,
      });
    }
  }

  return probes;
}

/** @deprecated Use expandRegionalSearchProbes */
export function expandSearchProbesForCity(
  city: string,
  regionHint: string,
  intentTerms: string[],
  probeId: (prefix: string, seed: string) => string,
): SourceProbe[] {
  return expandRegionalSearchProbes(city, [], regionHint, intentTerms, probeId);
}
