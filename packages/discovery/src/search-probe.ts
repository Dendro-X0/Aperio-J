import type { SourceProbe, StreamCandidate } from "@aperio-j/core";
import { cityMatchTerms } from "@aperio-j/core";
import { buildCitySearchQueries, resolveSearchSphere, resolveSearxngBaseUrl, type SearchSphere } from "@aperio-j/probe";
import { fetchHtml } from "./rss-autodiscover.js";
import { parseRssXml } from "./rss-fetch.js";
import { createLightweightStreamCandidate } from "./probe-candidate.js";
import {
  isCnGovIndexOnlyUrl,
  isCnSingleJobDetailUrl,
  isNationalAggregatorRootUrl,
  seedUrlMatchesCityProfile,
} from "./cn-sources.js";

const DEFAULT_SEEDS_PER_QUERY = 3;

export interface SearchProbeOptions {
  maxSeedsPerQuery?: number;
}

function searchProbeEnabled(): boolean {
  return process.env.APERO_J_SEARCH_PROBE !== "false";
}

function cleanRawUrl(raw: string): string | null {
  let url = raw
    .replace(/&quot;/gi, "")
    .replace(/\\u002f/gi, "/")
    .split(/[,})\]\s]/)[0] ?? raw;
  url = url.replace(/[)"'\\]+$/g, "");

  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    if (/baidu\.com|bdstatic|google\.|bing\.com|microsoft\.com|yandex\./i.test(parsed.hostname)) {
      return null;
    }
    if (/beian\.miit|beian\.mps/i.test(parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Extract outbound URLs from a SearXNG JSON search response. */
export function extractUrlsFromSearxngJson(json: string): string[] {
  try {
    const data = JSON.parse(json) as { results?: Array<{ url?: string }> };
    const found = new Set<string>();
    for (const row of data.results ?? []) {
      if (!row.url) continue;
      const cleaned = cleanRawUrl(row.url);
      if (cleaned) found.add(cleaned);
    }
    return [...found];
  } catch {
    return [];
  }
}

function isSearxngProbeSeed(seed: string): boolean {
  const base = resolveSearxngBaseUrl();
  return base ? seed.startsWith(base) : false;
}

/** Extract outbound URLs embedded in search-engine result HTML or RSS. */
export function extractUrlsFromSearchHtml(html: string): string[] {
  const found = new Set<string>();

  if (/<rss[\s>]|<channel>/i.test(html)) {
    for (const item of parseRssXml(html, "search-probe")) {
      if (item.url) found.add(item.url);
    }
  }

  const re = /https?:\/\/[^\s"'<>\\]+/gi;
  for (const match of html.match(re) ?? []) {
    const cleaned = cleanRawUrl(match);
    if (cleaned) found.add(cleaned);
  }

  for (const href of extractBingRedirectUrls(html)) {
    const cleaned = cleanRawUrl(href);
    if (cleaned) found.add(cleaned);
  }

  return [...found];
}

function decodeBingRedirectUrl(href: string): string | null {
  const decoded = href.replace(/&amp;/g, "&");
  const uMatch = decoded.match(/[?&]u=([^&]+)/);
  if (!uMatch?.[1]) return null;

  let encoded = uMatch[1];
  if (encoded.startsWith("a1")) encoded = encoded.slice(2);

  try {
    const url = Buffer.from(encoded, "base64").toString("utf8");
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
  } catch {
    // fall through
  }

  try {
    const url = decodeURIComponent(encoded);
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
  } catch {
    return null;
  }

  return null;
}

function extractBingRedirectUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /href="(https:\/\/www\.bing\.com\/ck\/a\?[^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const decoded = decodeBingRedirectUrl(match[1]!);
    if (decoded) urls.push(decoded);
  }
  return urls;
}

/** Prefer listing/portal paths over single-article URLs when deriving stream seeds. */
export function toStreamSeedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    if (parsed.hostname.endsWith(".gov.cn") || parsed.hostname.includes("mohrss.gov.cn")) {
      if (isCnSingleJobDetailUrl(url)) {
        if (parsed.hostname.includes("mohrss.gov.cn")) {
          return "https://job.mohrss.gov.cn/cjobs/jobinfolist/cb21/";
        }
        const segments = path.split("/").filter(Boolean);
        if (segments.length >= 2) {
          return `${parsed.origin}/${segments.slice(0, 2).join("/")}/`;
        }
      }
      if (/tzgg|zpxx|招聘|gzry|job|rsj|hrss|index|gkml|xxgk|cjobs/i.test(path)) {
        return `${parsed.origin}${path}`;
      }
      return parsed.origin;
    }

    if (
      /\.gov(\.[a-z]{2,3})?$/i.test(parsed.hostname) ||
      /\.gouv\.fr$/i.test(parsed.hostname) ||
      /\.gob\.[a-z]{2}$/i.test(parsed.hostname) ||
      /arbeitsagentur\.de$/i.test(parsed.hostname)
    ) {
      if (/jobs|careers|employment|recruitment|vacanc|stellen|emploi|trabajo/i.test(path)) {
        return `${parsed.origin}${path}`;
      }
      return parsed.origin;
    }

    return url;
  } catch {
    return url;
  }
}

export function scoreDiscoveryUrl(url: string, city: string, sphere?: SearchSphere): number {
  const resolved = sphere ?? resolveSearchSphere(city);
  const lower = url.toLowerCase();
  const cityNorm = city.trim().replace(/市$/u, "").toLowerCase();
  let score = 0;

  if (resolved === "cn") {
    if (lower.includes(".gov.cn") || lower.includes("mohrss.gov.cn")) score += 40;
    if (/hrss|rsj|rlzy|mohrss|公共招聘|job\.mohrss/i.test(lower)) score += 30;
    const terms = city.trim() ? cityMatchTerms(city) : [];
    if (terms.some((term) => term.length >= 2 && lower.includes(term))) score += 18;
    else if (cityNorm && lower.includes(cityNorm)) score += 15;
    if (/tzgg|zpxx|招聘|gzry|job|career|index|list|sou|cjobs/i.test(lower)) score += 20;
    if (/zhaopin|51job|zhipin|lagou|liepin|58\.com/i.test(lower)) score += 12;
    if (/事业单位|中小学教师|公职|招考简章|中学教师|赴外招聘/i.test(lower)) score -= 28;
    if (isNationalAggregatorRootUrl(url)) score -= 60;
    if (/post_|content\/|showdw|\.pdf|mpost_|htmls\/cb21dwPages/i.test(lower)) score -= 25;
    if (/m\.51job\.com/i.test(lower)) score -= 15;
    if (isCnGovIndexOnlyUrl(url)) score -= 20;
    if (/zzb\.|epaper|news\./i.test(lower)) score -= 10;
    return score;
  }

  if (resolved === "global") {
    if (/\.gov(\.|$)|\.gouv\.|\.gob\.|arbeitsagentur/i.test(lower)) score += 40;
    if (/workforce|employment|careers|jobboard|publicjobs|vacanc|stellen|emploi|trabajo/i.test(lower)) {
      score += 25;
    }
    if (/\.edu\b|university.*careers/i.test(lower)) score += 15;
    if (cityNorm && lower.includes(cityNorm.replace(/\s+/g, ""))) score += 12;
    for (const part of cityNorm.split(/\s+/).filter((token) => token.length > 2)) {
      if (lower.includes(part)) score += 6;
    }
    if (/jobs|career|recruit|hiring/i.test(lower)) score += 10;
    if (/indeed|linkedin|monster|glassdoor|stepstone|jobstreet|infojobs/i.test(lower)) score += 5;
    if (/post_|article\/|news\/|\.pdf|\/blog\//i.test(lower)) score -= 15;
    return score;
  }

  return score;
}

export function selectStreamSeedsFromUrls(
  urls: string[],
  city: string,
  limit = DEFAULT_SEEDS_PER_QUERY,
): string[] {
  const sphere = resolveSearchSphere(city);
  const minScore = sphere === "global" ? 20 : 25;

  const ranked = urls
    .map((url) => {
      const seed = toStreamSeedUrl(url);
      return { seed, score: scoreDiscoveryUrl(url, city, sphere) };
    })
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const seeds: string[] = [];

  for (const { seed } of ranked) {
    if (city && !seedUrlMatchesCityProfile(seed, city)) continue;
    if (isNationalAggregatorRootUrl(seed)) continue;
    if (isCnSingleJobDetailUrl(seed)) continue;
    if (isCnGovIndexOnlyUrl(seed)) continue;

    let key = seed;
    try {
      const parsed = new URL(seed);
      key = `${parsed.hostname}${parsed.pathname.split("/").slice(0, 3).join("/")}`;
    } catch {
      // keep raw seed as key
    }

    if (seen.has(key)) continue;
    seen.add(key);
    seeds.push(seed);
    if (seeds.length >= limit) break;
  }

  return seeds;
}

export function isSearchProbeEnabled(): boolean {
  return searchProbeEnabled();
}

export async function discoverStreamSeedsFromSearchBody(
  body: string,
  city: string,
  options: SearchProbeOptions & { searxng?: boolean } = {},
): Promise<string[]> {
  const limit = options.maxSeedsPerQuery ?? DEFAULT_SEEDS_PER_QUERY;
  const urls = options.searxng ? extractUrlsFromSearxngJson(body) : extractUrlsFromSearchHtml(body);
  return selectStreamSeedsFromUrls(urls, city, limit);
}

export async function discoverStreamSeedsFromSearchHtml(
  html: string,
  city: string,
  options: SearchProbeOptions = {},
): Promise<string[]> {
  return discoverStreamSeedsFromSearchBody(html, city, options);
}

export async function executeSearchProbe(probe: SourceProbe): Promise<StreamCandidate[]> {
  if (!searchProbeEnabled()) return [];

  const searxng = isSearxngProbeSeed(probe.seed);
  const body = await fetchHtml(probe.seed, {
    search: true,
    locale: searxng ? undefined : "zh-CN",
  });
  const city = probe.regionHint === "remote" ? "" : probe.regionHint;
  const seeds = await discoverStreamSeedsFromSearchBody(body, city, { searxng });
  const candidates: StreamCandidate[] = [];
  const seen = new Set<string>();

  for (const seedUrl of seeds) {
    if (seen.has(seedUrl)) continue;
    seen.add(seedUrl);

    const score = scoreDiscoveryUrl(seedUrl, city);
    const confidence = Math.min(0.42 + score / 120, 0.88);
    const host = (() => {
      try {
        return new URL(seedUrl).hostname.replace(/^www\./i, "");
      } catch {
        return seedUrl;
      }
    })();

    candidates.push(
      createLightweightStreamCandidate({
        label: `Search hit: ${host}`,
        kind: "list_page",
        seedUrl,
        discoveredVia: probe.id,
        regionHint: probe.regionHint,
        confidence,
      }),
    );
  }

  return candidates;
}

export { buildCitySearchQueries };
