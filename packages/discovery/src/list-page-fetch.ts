import type { RawFeedItem } from "@aperio-j/core";
import { enrichListItemsWithDetails, type DetailFetchOptions } from "./detail-page-fetch.js";
import { decodeEntities, stripTags } from "./html-text.js";
import { filterCnListPageItems, isGovCnHost, isJsHeavyCnAggregatorUrl } from "./cn-sources.js";
import { isWafBlockedHtml } from "./waf-detect.js";
import { extractCrawlSeedUrls } from "./seed-page-crawl.js";
import { extractJobPostingsFromJsonLd } from "./json-ld-job-posting.js";
import {
  fetchCnJobListViaXhrIntercept,
  supportsCnXhrJsonFetch,
} from "./cn-xhr-json-fetch.js";

const JOB_HINT =
  /招聘|岗位|职位|招考|聘用|诚聘|人才|就业|hiring|career|job opening|vacancy|公示/i;

const JOB_HREF_HINT =
  /job_detail|jobdetail|\/geek\/job|\/jobs\/|\/position\/|mpost|job\.htm|zhaopin\.com\/job|51job\.com\/jobs|\/posts\/[A-Za-z0-9]+|\/xq\/|zbj\.com\/.*\/\d|epwk\.com\/task/i;

const GOV_LIST_HREF =
  /\/content\/post_|\/tzgg\/|\/zpxx\/|\/xxgk\/|\/cjobs\/|showdw|jobinfo|\/rsj\//i;

const SKIP_HREF = /\.(jpg|jpeg|png|gif|pdf|zip|css|js|ico|svg|mp4)(\?|$)/i;

function resolveUrl(base: string, href: string): string | null {
  try {
    const url = new URL(href, base);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isGovCnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov.cn") || host.includes("mohrss.gov.cn");
  } catch {
    return false;
  }
}

function extractAnchorTitle(tag: string, href: string, innerHtml: string): string {
  const aria = tag.match(/aria-label=["']([^"']+)["']/i)?.[1]?.trim();
  if (aria && aria.length >= 2) return aria;

  const titleAttr = tag.match(/\btitle=["']([^"']+)["']/i)?.[1]?.trim();
  if (titleAttr && titleAttr.length >= 2) return titleAttr;

  const nested = stripTags(innerHtml).trim();
  if (nested.length >= 2) return nested;

  if (JOB_HREF_HINT.test(href)) return "招聘职位";
  return "";
}

function isJobLike(text: string, href: string, baseUrl: string): boolean {
  if (JOB_HREF_HINT.test(href)) {
    return text.trim().length >= 1;
  }
  if (isGovCnUrl(baseUrl) || isGovCnUrl(href)) {
    if (GOV_LIST_HREF.test(href) && text.trim().length >= 4) return true;
    if (JOB_HINT.test(text) || JOB_HINT.test(href)) return true;
    return false;
  }
  return JOB_HINT.test(text) || JOB_HINT.test(href);
}

/**
 * Extract job-like links from HTML list/portal pages — heuristic, auditable.
 */
export function parseListPageHtml(
  html: string,
  baseUrl: string,
  sourceId: string,
  limit = 30,
  options?: { profileCities?: string[] },
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const seen = new Set<string>();
  const items: RawFeedItem[] = [];

  for (const jsonLdItem of extractJobPostingsFromJsonLd(html, baseUrl, sourceId)) {
    if (seen.has(jsonLdItem.url)) continue;
    seen.add(jsonLdItem.url);
    items.push(jsonLdItem);
    if (items.length >= limit) {
      return filterCnListPageItems(items, { profileCities: options?.profileCities });
    }
  }

  const anchorRe = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html)) !== null) {
    const tag = match[0];
    const href = match[1]?.trim();
    if (!href || href.startsWith("javascript:") || SKIP_HREF.test(href)) continue;

    let title = stripTags(match[2] ?? "");
    if (title.length < 2) {
      title = extractAnchorTitle(tag, href, match[2] ?? "");
    }

    const isJobHref = JOB_HREF_HINT.test(href);
    if (isJobHref) {
      if (title.length < 1 || title.length > 150) continue;
    } else if (title.length < 4 || title.length > 150) {
      continue;
    }
    if (!isJobLike(title, href, baseUrl)) continue;

    const url = resolveUrl(baseUrl, href);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    items.push({
      title,
      body: title,
      url,
      sourceId,
      fetchedAt,
    });

    if (items.length >= limit) break;
  }

  return filterCnListPageItems(items, { profileCities: options?.profileCities });
}

import type { StreamSessionAuth } from "./stream-auth.js";

export async function fetchListPage(
  url: string,
  sourceId: string,
  detailOptions?: DetailFetchOptions,
  sessionAuth?: StreamSessionAuth,
  profileCities?: string[],
): Promise<RawFeedItem[]> {
  if (supportsCnXhrJsonFetch(url)) {
    const xhrItems = await fetchCnJobListViaXhrIntercept(
      url,
      sourceId,
      sessionAuth,
      profileCities,
    );
    if (xhrItems.length > 0) {
      return enrichListItemsWithDetails(xhrItems, {
        ...detailOptions,
        enabled: false,
        sessionAuth,
      });
    }
  }

  const { fetchHtml } = await import("./rss-autodiscover.js");
  const locale = isGovCnHost(url) ? "zh-CN" : undefined;
  const html = await fetchHtml(url, { sessionAuth, locale });
  if (isWafBlockedHtml(html)) {
    return [];
  }
  let items = parseListPageHtml(html, url, sourceId, 30, { profileCities });

  if (items.length === 0 && isGovCnHost(url)) {
    const childUrls = extractCrawlSeedUrls(html, url, 6);
    for (const childUrl of childUrls) {
      if (childUrl === url) continue;
      try {
        const childHtml = await fetchHtml(childUrl, { sessionAuth, locale: "zh-CN" });
        items.push(
          ...parseListPageHtml(childHtml, childUrl, sourceId, 15, { profileCities }),
        );
        if (items.length >= 24) break;
      } catch {
        // try next child listing
      }
    }
  }

  const seen = new Set<string>();
  items = items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  let skipDetail = isGovCnHost(url) || isJsHeavyCnAggregatorUrl(url);
  if (!skipDetail) {
    try {
      skipDetail = /\.58\.com$/i.test(new URL(url).hostname);
    } catch {
      skipDetail = false;
    }
  }

  return enrichListItemsWithDetails(items, {
    ...detailOptions,
    enabled: skipDetail ? false : detailOptions?.enabled,
    sessionAuth,
  });
}

export { decodeEntities, stripTags };
