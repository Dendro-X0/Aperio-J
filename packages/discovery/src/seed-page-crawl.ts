import type { SourceProbe, StreamCandidate } from "@aperio-j/core";
import { discoverRssLinksFromHtml, fetchHtml } from "./rss-autodiscover.js";
import { validateStreamCandidate } from "./validate-stream.js";

const TRUSTED_HOST =
  /\.gov(\.|$)|\.gouv\.|\.gob\.|\.edu(\.|$)|arbeitsagentur\.de|francetravail|hellowork\.mhlw|jobbank\.gc\.ca|mycareersfuture|werk\.nl|calcareers|gov\.uk|mohrss\.gov\.cn/i;

const JOB_PATH =
  /\/(jobs|careers|recruit|vacanc|stellen|emploi|trabajo|hiring|zpxx|招聘|求人|employment|jobsearch|job-search|gzry|offres)/i;

const JOB_HINT =
  /招聘|岗位|职位|招考|聘用|career|vacanc|hiring|job opening|求人|採用|emploi|stellen/i;

const SKIP_HREF = /\.(jpg|jpeg|png|gif|pdf|zip|css|js|ico|svg|mp4)(\?|$)/i;

const DEFAULT_CRAWL_LIMIT = 8;

function resolveUrl(base: string, href: string): string | null {
  try {
    const url = new URL(href, base);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Gov/edu domains eligible for bounded follow-up crawl after search discovery. */
export function isTrustedCrawlDomain(url: string): boolean {
  try {
    return TRUSTED_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isJobLikeUrl(url: string, text = ""): boolean {
  try {
    const parsed = new URL(url);
    return JOB_PATH.test(parsed.pathname) || JOB_HINT.test(`${parsed.pathname} ${text}`);
  } catch {
    return false;
  }
}

/** Extract same-regime job portal links from a trusted landing page. */
export function extractCrawlSeedUrls(
  html: string,
  baseUrl: string,
  limit = DEFAULT_CRAWL_LIMIT,
): string[] {
  let origin = "";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const seeds: string[] = [];
  const anchorRe = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("javascript:") || SKIP_HREF.test(href)) continue;

    const url = resolveUrl(baseUrl, href);
    if (!url || seen.has(url)) continue;

    const text = match[2]?.replace(/<[^>]+>/g, " ").trim() ?? "";
    if (!isJobLikeUrl(url, text)) continue;

    try {
      const parsed = new URL(url);
      if (parsed.origin !== origin && !TRUSTED_HOST.test(parsed.hostname)) continue;
    } catch {
      continue;
    }

    seen.add(url);
    seeds.push(url);
    if (seeds.length >= limit) break;
  }

  return seeds;
}

export interface FollowUpDiscoveryOptions {
  fixtureHtml?: string;
  maxRssLinks?: number;
  maxCrawlSeeds?: number;
}

/** Run rss autodiscover + bounded crawl from a search hit on a trusted domain. */
export async function discoverFollowUpCandidates(
  seedUrl: string,
  probe: SourceProbe,
  options: FollowUpDiscoveryOptions = {},
): Promise<StreamCandidate[]> {
  if (!isTrustedCrawlDomain(seedUrl)) return [];

  const candidates: StreamCandidate[] = [];
  const seen = new Set<string>();
  const push = (candidate: StreamCandidate | null) => {
    if (!candidate || seen.has(candidate.seedUrl)) return;
    seen.add(candidate.seedUrl);
    candidates.push(candidate);
  };

  let html = options.fixtureHtml;
  if (!html) {
    try {
      html = await fetchHtml(seedUrl);
    } catch {
      return candidates;
    }
  }

  const feedUrls = discoverRssLinksFromHtml(html, seedUrl).slice(0, options.maxRssLinks ?? 3);
  for (const feedUrl of feedUrls) {
    push(
      await validateStreamCandidate({
        label: `Autodiscover: ${feedUrl}`,
        kind: "rss",
        seedUrl: feedUrl,
        discoveredVia: `${probe.id}:autodiscover`,
        regionHint: probe.regionHint,
        intentTerms: probe.intentTerms,
        options: options.fixtureHtml ? { fixtureXml: undefined } : undefined,
      }),
    );
  }

  for (const crawlUrl of extractCrawlSeedUrls(html, seedUrl, options.maxCrawlSeeds ?? DEFAULT_CRAWL_LIMIT)) {
    push(
      await validateStreamCandidate({
        label: `Crawl hit: ${crawlUrl}`,
        kind: "list_page",
        seedUrl: crawlUrl,
        discoveredVia: `${probe.id}:crawl`,
        regionHint: probe.regionHint,
        intentTerms: probe.intentTerms,
        options: options.fixtureHtml ? { fixtureHtml: html } : undefined,
      }),
    );
  }

  return candidates;
}

export async function executeSeedPageCrawlProbe(probe: SourceProbe): Promise<StreamCandidate[]> {
  return discoverFollowUpCandidates(probe.seed, probe);
}
