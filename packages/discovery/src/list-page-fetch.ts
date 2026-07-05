import type { RawFeedItem } from "@aperio-j/core";
import { enrichListItemsWithDetails, type DetailFetchOptions } from "./detail-page-fetch.js";
import { decodeEntities, stripTags } from "./html-text.js";
import { filterCnListPageItems } from "./cn-sources.js";

const JOB_HINT =
  /招聘|岗位|职位|招考|聘用|诚聘|人才|就业|hiring|career|job opening|vacancy|公示/i;

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

function isJobLike(text: string, href: string): boolean {
  if (/job_detail|\/geek\/job|\/jobs\/|\/position\/|mpost|job\.htm/i.test(href)) {
    return text.trim().length >= 2;
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

  const anchorRe = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("javascript:") || SKIP_HREF.test(href)) continue;

    const title = stripTags(match[2] ?? "");
    if (title.length < 4 || title.length > 150) continue;
    if (!isJobLike(title, href)) continue;

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
  const { fetchHtml } = await import("./rss-autodiscover.js");
  const html = await fetchHtml(url, { sessionAuth });
  const items = parseListPageHtml(html, url, sourceId, 30, { profileCities });
  return enrichListItemsWithDetails(items, { ...detailOptions, sessionAuth });
}

export { decodeEntities, stripTags };
