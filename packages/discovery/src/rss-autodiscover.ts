import { resolveSearxngBaseUrl } from "@aperio-j/probe";
import { buildSessionAuthHeaders, type StreamSessionAuth } from "./stream-auth.js";
import { isGovCnHost, isJsHeavyCnAggregatorUrl } from "./cn-sources.js";
import {
  fetchHtmlWithPlaywright,
  isCnPlaywrightEnabled,
  needsPlaywrightRender,
} from "./cn-playwright-fetch.js";
import { fetchHtmlViaFirecrawl, isFirecrawlEnabled } from "./firecrawl-fetch.js";
import {
  isHostFetchBlocked,
  recordHostFetchBlocked,
  recordHostFetchSuccess,
  waitForHostFetchSlot,
} from "./fetch-host-guard.js";
import { isWafBlockedHtml } from "./waf-detect.js";

export type { StreamSessionAuth, StreamSessionAuthMode } from "./stream-auth.js";
export {
  assertSessionAuthAllowed,
  BLOCKED_SESSION_AUTH_HOSTS,
  isBlockedSessionAuthHost,
  parseStreamSessionAuth,
  SESSION_AUTH_BLOCKED,
} from "./stream-auth.js";

const RSS_LINK_RE =
  /<link[^>]+type=["']application\/(?:rss\+xml|atom\+xml)["'][^>]*>/gi;

function hrefFromLinkTag(tag: string): string | null {
  const match = tag.match(/href=["']([^"']+)["']/i);
  return match?.[1]?.trim() ?? null;
}

function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

export function discoverRssLinksFromHtml(html: string, baseUrl: string): string[] {
  const links = new Set<string>();

  for (const tag of html.match(RSS_LINK_RE) ?? []) {
    const href = hrefFromLinkTag(tag);
    if (href) links.add(resolveUrl(baseUrl, href));
  }

  for (const path of ["/rss", "/rss.xml", "/feed", "/atom.xml"]) {
    links.add(resolveUrl(baseUrl, path));
  }

  return [...links];
}

function isCnFetchHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith(".gov.cn") ||
      /(?:^|\.)zhipin\.com|51job\.com|lagou\.com|liepin\.com|zhaopin\.com$/i.test(host)
    );
  } catch {
    return false;
  }
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchHtml(
  url: string,
  options?: { search?: boolean; sessionAuth?: StreamSessionAuth; locale?: "zh-CN" | "en-US" },
): Promise<string> {
  if (isHostFetchBlocked(url)) {
    throw new Error(`host cooldown active for ${url}`);
  }

  await waitForHostFetchSlot(url);

  const searxngBase = resolveSearxngBaseUrl();
  const isSearxng = searxngBase ? url.startsWith(searxngBase) : false;

  const cnFetch =
    options?.locale === "zh-CN" ||
    isCnFetchHost(url) ||
    isGovCnHost(url) ||
    (options?.search === true && /baidu\.com|bing\.com/i.test(url));
  const browserLike = cnFetch || (options?.search === true && !isSearxng);
  const timeoutMs = isGovCnHost(url) ? 25_000 : 15_000;

  const fetchOnce = async (): Promise<string> => {
    const response = await fetch(url, {
      headers: buildSessionAuthHeaders(options?.sessionAuth, {
        Accept: isSearxng
          ? "application/json"
          : options?.search
            ? "text/html,application/xhtml+xml,application/rss+xml,application/xml,text/xml,*/*"
            : "text/html,application/xhtml+xml,*/*",
        "Accept-Language": cnFetch ? "zh-CN,zh;q=0.9,en;q=0.8" : "en-US,en;q=0.9",
        "User-Agent": browserLike ? BROWSER_USER_AGENT : "aperio-j/0.2 (+source-discovery)",
        ...(isGovCnHost(url) ? { Referer: "https://www.baidu.com/" } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response.text();
  };

  let html: string;
  try {
    html = await fetchOnce();
  } catch (firstError) {
    throw firstError;
  }

  if (
    isCnPlaywrightEnabled() &&
    isJsHeavyCnAggregatorUrl(url) &&
    needsPlaywrightRender(html, url, countCnJobLinkHints(html))
  ) {
    const rendered = await fetchHtmlWithPlaywright(url);
    if (rendered && rendered.length > html.length) {
      html = rendered;
    }
  }

  if (
    isFirecrawlEnabled() &&
    isJsHeavyCnAggregatorUrl(url) &&
    (html.length < 2500 || isWafBlockedHtml(html) || countCnJobLinkHints(html) < 2)
  ) {
    const scraped = await fetchHtmlViaFirecrawl(url);
    if (scraped && scraped.length > html.length) {
      html = scraped;
    }
  }

  if (isWafBlockedHtml(html)) {
    recordHostFetchBlocked(url);
    throw new Error(`WAF challenge for ${url}`);
  }

  recordHostFetchSuccess(url);
  return html;
}

function countCnJobLinkHints(html: string): number {
  const matches = html.match(/job_detail|jobdetail|\/geek\/job|\/jobs\/|mpost|job\.htm/gi);
  return matches?.length ?? 0;
}
