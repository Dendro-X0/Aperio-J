import { buildSessionAuthHeaders, type StreamSessionAuth } from "./stream-auth.js";
import { isJsHeavyCnAggregatorUrl } from "./cn-sources.js";
import {
  fetchHtmlWithPlaywright,
  isCnPlaywrightEnabled,
  needsPlaywrightRender,
} from "./cn-playwright-fetch.js";

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
  options?: { search?: boolean; sessionAuth?: StreamSessionAuth },
): Promise<string> {
  const cnFetch = isCnFetchHost(url);
  const browserLike = cnFetch || options?.search;

  const response = await fetch(url, {
    headers: buildSessionAuthHeaders(options?.sessionAuth, {
      Accept: options?.search
        ? "text/html,application/xhtml+xml,application/rss+xml,application/xml,text/xml,*/*"
        : "text/html,application/xhtml+xml,*/*",
      "Accept-Language": cnFetch ? "zh-CN,zh;q=0.9,en;q=0.8" : "en-US,en;q=0.9",
      "User-Agent": browserLike ? BROWSER_USER_AGENT : "aperio-j/0.2 (+source-discovery)",
    }),
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  let html = await response.text();

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

  return html;
}

function countCnJobLinkHints(html: string): number {
  const matches = html.match(/job_detail|\/geek\/job|\/jobs\/|mpost|job\.htm/gi);
  return matches?.length ?? 0;
}
