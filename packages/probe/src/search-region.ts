/**
 * Regional search routing for source discovery.
 *
 * - `cn` — Chinese internet (Baidu + Bing)
 * - `jp` — Japan (Google + Bing with Japanese query templates)
 * - `global` — open web: Europe, Americas, Africa, South Asia, Oceania, etc. (Google + Bing)
 * - `none` — no city set; skip search probes (RSS/registry only)
 *
 * Eastern Europe (Yandex) and other niches can extend this table later.
 */

import { isChinaCityProfile, isJapanCityProfile } from "./probe-packs.js";

export type SearchSphere = "cn" | "jp" | "global" | "none";

export type SearchEngineId = "baidu" | "bing" | "google";

export const SEARCH_SPHERE_ENGINES: Record<Exclude<SearchSphere, "none">, SearchEngineId[]> = {
  cn: ["baidu", "bing"],
  jp: ["google", "bing"],
  global: ["google", "bing"],
};

export function resolveSearchSphere(
  primaryCity: string,
  acceptableCities: string[] = [],
): SearchSphere {
  const cities = [primaryCity, ...acceptableCities].map((city) => city.trim()).filter(Boolean);
  if (cities.length === 0) return "none";
  if (isJapanCityProfile(primaryCity, acceptableCities)) return "jp";
  if (isChinaCityProfile(primaryCity, acceptableCities)) return "cn";
  return "global";
}

function dedupeQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function pickRoleTerms(city: string, intentTerms: string[]): string[] {
  const cityNorm = city.trim().replace(/市$/u, "").toLowerCase();
  return dedupeQueries(
    intentTerms
      .map((term) => term.trim())
      .filter((term) => term.length >= 2 && term.length <= 40)
      .filter((term) => !cityNorm.includes(term.toLowerCase()) && !term.toLowerCase().includes(cityNorm)),
  ).slice(0, 2);
}

function buildIntentSearchQueries(city: string, sphere: SearchSphere, intentTerms: string[]): string[] {
  const label = city.trim().replace(/市$/u, "");
  const roles = pickRoleTerms(city, intentTerms);
  const queries: string[] = [];

  for (const role of roles) {
    if (sphere === "cn") {
      queries.push(`${label} ${role} 招聘`);
    } else if (sphere === "jp") {
      queries.push(`${label} ${role} 求人`);
    } else {
      queries.push(`${label} ${role} jobs`);
      queries.push(`${label} ${role} careers site:.gov`);
    }
  }

  return queries;
}

function mergeBaseAndIntentQueries(base: string[], intent: string[]): string[] {
  if (intent.length === 0) return base;
  return dedupeQueries([intent[0]!, ...base, ...intent.slice(1)]);
}

export function buildRegionalSearchQueries(
  city: string,
  sphere: SearchSphere,
  intentTerms: string[] = [],
): string[] {
  const label = city.trim().replace(/市$/u, "");
  if (!label || sphere === "none") return [];

  const intent = buildIntentSearchQueries(city, sphere, intentTerms);

  if (sphere === "cn") {
    return mergeBaseAndIntentQueries(
      [
        `${label} 人力资源和社会保障局 招聘`,
        `${label} 人社 官网 招聘信息`,
      ],
      intent,
    );
  }

  if (sphere === "jp") {
    return mergeBaseAndIntentQueries(
      [
        `${label} 求人 ハローワーク`,
        `${label} 採用 求人 site:go.jp`,
        `${label} 転職 求人`,
        `${label} 求人 site:jp`,
      ],
      intent,
    );
  }

  return mergeBaseAndIntentQueries(
    [
      `${label} careers jobs`,
      `${label} government employment portal`,
      `${label} public sector jobs site:.gov`,
      `${label} job board hiring`,
    ],
    intent,
  );
}

export function buildSearchEngineUrl(engine: SearchEngineId, query: string): string {
  switch (engine) {
    case "baidu": {
      const params = new URLSearchParams({ wd: query, rn: "10" });
      return `https://www.baidu.com/s?${params.toString()}`;
    }
    case "bing": {
      const params = new URLSearchParams({ q: query, format: "rss" });
      return `https://www.bing.com/search?${params.toString()}`;
    }
    case "google": {
      const params = new URLSearchParams({ q: query });
      return `https://www.google.com/search?${params.toString()}`;
    }
  }
}

export function maxSearchQueriesPerEngine(): number {
  return Math.max(1, Number(process.env.APERO_J_SEARCH_PROBE_QUERIES ?? 2));
}

export function maxSearchProbesPerRun(): number {
  return Math.max(4, Number(process.env.APERO_J_SEARCH_PROBE_MAX ?? 8));
}
