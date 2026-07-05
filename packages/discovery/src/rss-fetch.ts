import type { RawFeedItem } from "@aperio-j/core";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeEntities(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
}

export function parseRssXml(xml: string, sourceId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description") || extractTag(block, "content:encoded");

    if (!title || !link) continue;

    items.push({
      title,
      body: description || title,
      url: link,
      sourceId,
      fetchedAt,
    });
  }

  return items;
}

import { buildSessionAuthHeaders, type StreamSessionAuth } from "./stream-auth.js";

export async function fetchRssFeed(
  url: string,
  sourceId: string,
  sessionAuth?: StreamSessionAuth,
): Promise<RawFeedItem[]> {
  const response = await fetch(url, {
    headers: buildSessionAuthHeaders(sessionAuth, {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "aperio-j/0.2 (+source-discovery)",
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed (${response.status}): ${url}`);
  }

  const xml = await response.text();
  return parseRssXml(xml, sourceId);
}
