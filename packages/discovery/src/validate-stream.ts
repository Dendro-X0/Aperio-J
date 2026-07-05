import type { SourceProbe, StreamCandidate, StreamKind, ValidationTier } from "@aperio-j/core";
import type { StreamSessionAuth } from "./stream-auth.js";
import { fetchRssFeed, parseRssXml } from "./rss-fetch.js";
import { parseListPageHtml } from "./list-page-fetch.js";
import { discoverRssLinksFromHtml, fetchHtml } from "./rss-autodiscover.js";
import { countIntentHits } from "./intent-expansion.js";
import { executeSearchProbe } from "./search-probe.js";
import { executeSeedPageCrawlProbe } from "./seed-page-crawl.js";

const DOMAIN_TIER_SCORE: Record<string, number> = {
  gov: 0.35,
  edu: 0.25,
  company: 0.15,
  aggregator: 0.05,
  unknown: 0.1,
};

const PROVEN_MIN_CONFIDENCE = 0.35;
const CANDIDATE_MIN_CONFIDENCE = 0.28;

const JOB_PAGE_HINT =
  /招聘|岗位|职位|招考|聘用|career|vacanc|hiring|job opening|stellen|求人|採用|emploi|job board/i;

function streamId(seedUrl: string): string {
  let hash = 0;
  for (let i = 0; i < seedUrl.length; i++) {
    hash = (hash * 31 + seedUrl.charCodeAt(i)) >>> 0;
  }
  return `stream-${hash.toString(16)}`;
}

export function domainTierFromUrl(url: string): keyof typeof DOMAIN_TIER_SCORE {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      host.endsWith(".gov.cn") ||
      host.includes(".gov.") ||
      host.endsWith(".gov") ||
      host.endsWith(".gouv.fr")
    ) {
      return "gov";
    }
    if (
      /arbeitsagentur\.de|francetravail|jobbank\.gc\.ca|hellowork\.mhlw|mycareersfuture|werk\.nl|calcareers|service-public|workforce\.gov/i.test(
        host,
      )
    ) {
      return "gov";
    }
    if (host.endsWith(".edu.cn") || host.includes(".edu.") || host.endsWith(".edu")) return "edu";
    if (/indeed|linkedin|stepstone|58\.com|boss|zhaopin|xing\.com/i.test(host)) return "aggregator";
    return "company";
  } catch {
    return "unknown";
  }
}

function sniffGeoIntent(
  corpus: string,
  regionHint: string,
  intentTerms: string[],
): { geoHit: boolean; intentHits: string[] } {
  const lower = corpus.toLowerCase();
  const geoHit = regionHint === "remote"
    ? /remote|远程/.test(lower)
    : lower.includes(regionHint.replace(/市/u, "").toLowerCase()) || lower.includes(regionHint.toLowerCase());

  return {
    geoHit,
    intentHits: countIntentHits(corpus, intentTerms),
  };
}

function isCandidateEligibleDomain(tier: keyof typeof DOMAIN_TIER_SCORE): boolean {
  return tier === "gov" || tier === "edu" || tier === "company";
}

function computeConfidence(input: {
  tier: keyof typeof DOMAIN_TIER_SCORE;
  parsedItemCount: number;
  geoHit: boolean;
  intentHits: string[];
}): number {
  let confidence = DOMAIN_TIER_SCORE[input.tier] ?? 0.1;
  confidence += Math.min(input.parsedItemCount, 5) * 0.08;
  if (input.geoHit) confidence += 0.15;
  if (input.intentHits.length > 0) confidence += 0.1;
  return Math.min(confidence, 0.95);
}

export function resolveValidationTier(input: {
  parsedItemCount: number;
  tier: keyof typeof DOMAIN_TIER_SCORE;
  geoHit: boolean;
  intentHits: string[];
  jobPageHint: boolean;
}): { tier: ValidationTier; confidence: number } | null {
  const confidence = computeConfidence({
    tier: input.tier,
    parsedItemCount: input.parsedItemCount,
    geoHit: input.geoHit,
    intentHits: input.intentHits,
  });

  if (input.parsedItemCount > 0 && confidence >= PROVEN_MIN_CONFIDENCE) {
    return { tier: "proven", confidence };
  }

  if (input.parsedItemCount > 0) {
    return null;
  }

  if (!isCandidateEligibleDomain(input.tier)) {
    return null;
  }

  if (!(input.jobPageHint || input.geoHit || input.intentHits.length > 0)) {
    return null;
  }

  const candidateConfidence = computeConfidence({
    tier: input.tier,
    parsedItemCount: 0,
    geoHit: input.geoHit,
    intentHits: input.intentHits,
  });

  if (candidateConfidence < CANDIDATE_MIN_CONFIDENCE) {
    return null;
  }

  return { tier: "candidate", confidence: candidateConfidence };
}

export interface ValidateStreamOptions {
  /** Skip network fetch — use supplied XML (tests). */
  fixtureXml?: string;
  fixtureHtml?: string;
}

export async function validateStreamCandidate(input: {
  label: string;
  kind: StreamKind;
  seedUrl: string;
  discoveredVia: string;
  regionHint: string;
  intentTerms: string[];
  sessionAuth?: StreamSessionAuth;
  options?: ValidateStreamOptions;
}): Promise<StreamCandidate | null> {
  const now = new Date().toISOString();
  let parsedItemCount = 0;
  let sampleCorpus = "";
  let jobPageHint = false;

  try {
    if (input.kind === "rss" || input.seedUrl.endsWith(".rss") || input.seedUrl.includes("/feed")) {
      const items = input.options?.fixtureXml
        ? parseRssXml(input.options.fixtureXml, input.discoveredVia)
        : await fetchRssFeed(input.seedUrl, input.discoveredVia, input.sessionAuth);
      parsedItemCount = items.length;
      sampleCorpus = items.slice(0, 5).map((item) => `${item.title} ${item.body}`).join(" ");
    } else {
      const html = input.options?.fixtureHtml ?? (await fetchHtml(input.seedUrl, { sessionAuth: input.sessionAuth }));
      const parsed = parseListPageHtml(html, input.seedUrl, input.discoveredVia, 10);
      parsedItemCount = parsed.length;
      jobPageHint = JOB_PAGE_HINT.test(html);
      sampleCorpus = parsed.length > 0
        ? parsed.map((item) => `${item.title} ${item.body}`).join(" ")
        : html.slice(0, 4000);
    }
  } catch {
    return null;
  }

  const sniff = sniffGeoIntent(sampleCorpus, input.regionHint, input.intentTerms);
  const domainTier = domainTierFromUrl(input.seedUrl);
  const resolved = resolveValidationTier({
    parsedItemCount,
    tier: domainTier,
    geoHit: sniff.geoHit,
    intentHits: sniff.intentHits,
    jobPageHint,
  });

  if (!resolved) return null;

  return {
    id: streamId(input.seedUrl),
    label: input.label,
    kind: input.kind,
    seedUrl: input.seedUrl,
    discoveredVia: input.discoveredVia,
    regionHint: input.regionHint,
    confidence: resolved.confidence,
    sampleItemCount: parsedItemCount,
    lastValidatedAt: now,
    health: "unknown",
    validationTier: resolved.tier,
  };
}

export async function executeProbe(probe: SourceProbe): Promise<StreamCandidate[]> {
  const candidates: StreamCandidate[] = [];

  if (probe.kind === "registry_lookup") {
    const kind: StreamKind = probe.seed.endsWith(".rss") || probe.seed.includes("/feed")
      ? "rss"
      : "list_page";
    const validated = await validateStreamCandidate({
      label: probe.label,
      kind,
      seedUrl: probe.seed,
      discoveredVia: probe.id,
      regionHint: probe.regionHint,
      intentTerms: probe.intentTerms,
    });
    if (validated) candidates.push(validated);
    return candidates;
  }

  if (probe.kind === "url_template" && probe.seed.endsWith(".rss")) {
    const validated = await validateStreamCandidate({
      label: probe.label,
      kind: "rss",
      seedUrl: probe.seed,
      discoveredVia: probe.id,
      regionHint: probe.regionHint,
      intentTerms: probe.intentTerms,
    });
    if (validated) candidates.push(validated);
    return candidates;
  }

  if (probe.kind === "rss_autodiscover") {
    try {
      const html = await fetchHtml(probe.seed);
      const feedUrls = discoverRssLinksFromHtml(html, probe.seed).slice(0, 3);
      for (const feedUrl of feedUrls) {
        const validated = await validateStreamCandidate({
          label: `${probe.label} → ${feedUrl}`,
          kind: "rss",
          seedUrl: feedUrl,
          discoveredVia: probe.id,
          regionHint: probe.regionHint,
          intentTerms: probe.intentTerms,
        });
        if (validated) candidates.push(validated);
      }
    } catch {
      const fallback = await validateStreamCandidate({
        label: probe.label,
        kind: "list_page",
        seedUrl: probe.seed,
        discoveredVia: probe.id,
        regionHint: probe.regionHint,
        intentTerms: probe.intentTerms,
      });
      if (fallback) candidates.push(fallback);
    }
    return candidates;
  }

  if (probe.kind === "search_discovery") {
    try {
      return await executeSearchProbe(probe);
    } catch {
      return [];
    }
  }

  if (probe.kind === "seed_page_crawl") {
    try {
      return await executeSeedPageCrawlProbe(probe);
    } catch {
      return [];
    }
  }

  return candidates;
}

export function rankStreamCandidates(candidates: StreamCandidate[]): StreamCandidate[] {
  const byUrl = new Map<string, StreamCandidate>();

  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.seedUrl);
    if (!existing || candidate.confidence > existing.confidence) {
      byUrl.set(candidate.seedUrl, candidate);
    } else if (
      existing &&
      candidate.confidence === existing.confidence &&
      candidate.validationTier === "proven" &&
      existing.validationTier === "candidate"
    ) {
      byUrl.set(candidate.seedUrl, candidate);
    }
  }

  return [...byUrl.values()].sort((a, b) => {
    if (a.validationTier !== b.validationTier) {
      return a.validationTier === "proven" ? -1 : 1;
    }
    return b.confidence - a.confidence;
  });
}

export function selectTopStreamCandidates(
  candidates: StreamCandidate[],
  limit = 10,
): StreamCandidate[] {
  return rankStreamCandidates(candidates).slice(0, limit);
}
