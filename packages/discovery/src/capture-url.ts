import type { RawFeedItem } from "@aperio-j/core";
import { fetchHtml } from "./rss-autodiscover.js";
import { parseDetailPageHtml } from "./detail-page-fetch.js";
import { isJsHeavyCnAggregatorUrl } from "./cn-sources.js";
import {
  fetchHtmlWithPlaywright,
  isCnPlaywrightEnabled,
  needsPlaywrightRender,
} from "./cn-playwright-fetch.js";

const CAPTURE_SOURCE_ID = "user-capture";

export function isCaptureUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Fetch a single listing URL and normalize it as a feed item for parse/match. */
export async function fetchCaptureUrl(url: string): Promise<RawFeedItem> {
  if (!isCaptureUrl(url)) {
    throw new Error("仅支持 http(s) 链接");
  }

  const html = await fetchCaptureHtml(url);
  const parsed = parseDetailPageHtml(html, url);
  const title = parsed.title.trim() || url;

  return {
    title,
    body: parsed.body.trim() || title,
    url,
    sourceId: CAPTURE_SOURCE_ID,
    fetchedAt: new Date().toISOString(),
  };
}

export { CAPTURE_SOURCE_ID };

async function fetchCaptureHtml(url: string): Promise<string> {
  let html = await fetchHtml(url);
  if (
    isCnPlaywrightEnabled() &&
    isJsHeavyCnAggregatorUrl(url) &&
    needsPlaywrightRender(html, url, html.includes("job_detail") ? 1 : 0)
  ) {
    const rendered = await fetchHtmlWithPlaywright(url);
    if (rendered && rendered.length > html.length) {
      html = rendered;
    }
  }
  return html;
}
