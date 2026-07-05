import type { RawFeedItem } from "@aperio-j/core";
import {
  extractFirstHeading,
  extractMetaDescription,
  stripScriptsAndStyles,
  stripTags,
} from "./html-text.js";
import type { StreamSessionAuth } from "./stream-auth.js";
import { fetchHtml } from "./rss-autodiscover.js";

const CONTENT_CLASS_HINT =
  /(?:article|content|detail|job|post|text|xl|TRS_Editor|Custom_UnionStyle|main-info|description)/i;

const NOISE_LINE =
  /^(首页|主页|返回|上一页|下一页|分享|打印|收藏|相关链接|附件下载|Copyright|版权所有)/i;

export interface DetailFetchOptions {
  /** Max detail pages fetched per list batch. */
  maxFetches?: number;
  /** Parallel detail requests. */
  concurrency?: number;
  /** Set false or APERO_J_DETAIL_FETCH=false to skip. */
  enabled?: boolean;
  sessionAuth?: StreamSessionAuth;
}

export interface DetailPageContent {
  title: string;
  body: string;
}

function detailFetchEnabled(options?: DetailFetchOptions): boolean {
  if (options?.enabled === false) return false;
  if (process.env.APERO_J_DETAIL_FETCH === "false") return false;
  return true;
}

function defaultMaxFetches(options?: DetailFetchOptions): number {
  const fromEnv = Number(process.env.APERO_J_DETAIL_FETCH_LIMIT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return options?.maxFetches ?? 8;
}

function extractContentBlocks(html: string): string[] {
  const cleaned = stripScriptsAndStyles(html);
  const candidates: string[] = [];

  const meta = extractMetaDescription(cleaned);
  if (meta && meta.length >= 20) candidates.push(meta);

  const blockRe =
    /<(article|main|div|section)[^>]*(?:class|id)=["'][^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(cleaned)) !== null) {
    const openTag = match[0].slice(0, match[0].indexOf(">") + 1);
    if (!CONTENT_CLASS_HINT.test(openTag)) continue;

    const text = stripTags(match[2] ?? "");
    if (text.length >= 40) candidates.push(text);
  }

  const bodyMatch = cleaned.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
  if (bodyMatch?.[1]) {
    candidates.push(stripTags(bodyMatch[1]));
  }

  return candidates;
}

function stripPageChrome(text: string): string {
  return text
    .replace(/^首页\s*[>›→]\s*/u, "")
    .replace(/版权所有[\s\S]{0,120}$/u, "")
    .trim();
}

function isSubstantiveLine(line: string): boolean {
  if (/招聘|岗位|职责|要求|检验|仓储|直招|工作地点|学历|薪资|经验/.test(line)) {
    return true;
  }
  if (NOISE_LINE.test(line) && line.length < 48) return false;
  return line.length >= 4;
}

function normalizeBody(text: string, title: string): string {
  const cleaned = stripPageChrome(text);
  const lines = cleaned
    .split(/[\n。；;]+/)
    .map((line) => line.trim())
    .filter((line) => isSubstantiveLine(line));

  const joined = lines.join("。").replace(/。+/g, "。").trim();
  const body = joined.length >= 20 ? joined : cleaned.trim();
  return body.slice(0, 8000) || title;
}

function pickBestBody(candidates: string[], title: string): string {
  const unique = [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];
  unique.sort((a, b) => b.length - a.length);

  for (const candidate of unique) {
    if (candidate.length > title.length + 30) {
      return normalizeBody(candidate, title);
    }
  }

  return unique[0] ? normalizeBody(unique[0], title) : title;
}

/** Parse job/article detail HTML into title + body (heuristic, no site-specific scrapers). */
export function parseDetailPageHtml(
  html: string,
  _pageUrl: string,
  fallbackTitle = "",
): DetailPageContent {
  const heading = extractFirstHeading(html);
  const title = heading ?? fallbackTitle.trim();

  const candidates = extractContentBlocks(html);
  const body = pickBestBody(candidates, title || fallbackTitle);

  return {
    title: title || fallbackTitle,
    body,
  };
}

export function shouldFetchDetail(item: RawFeedItem): boolean {
  if (!item.url || item.url.startsWith("javascript:")) return false;
  const body = item.body.trim();
  const title = item.title.trim();
  if (body !== title && body.length >= 80) return false;
  return true;
}

async function fetchDetailBody(
  url: string,
  fallbackTitle: string,
  sessionAuth?: StreamSessionAuth,
): Promise<DetailPageContent | null> {
  try {
    const html = await fetchHtml(url, { sessionAuth });
    return parseDetailPageHtml(html, url, fallbackTitle);
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Second-hop fetch: enrich list_page items with detail page body text. */
export async function enrichListItemsWithDetails(
  items: RawFeedItem[],
  options: DetailFetchOptions = {},
): Promise<RawFeedItem[]> {
  if (!detailFetchEnabled(options) || items.length === 0) return items;

  const maxFetches = Math.min(defaultMaxFetches(options), items.length);
  const concurrency = options.concurrency ?? 2;

  const targets: Array<{ index: number; item: RawFeedItem }> = [];
  for (let i = 0; i < items.length && targets.length < maxFetches; i++) {
    const item = items[i]!;
    if (shouldFetchDetail(item)) {
      targets.push({ index: i, item });
    }
  }

  if (targets.length === 0) return items;

  const enriched = [...items];
  const fetched = await mapWithConcurrency(targets, concurrency, async ({ index, item }) => {
    const detail = await fetchDetailBody(item.url, item.title, options.sessionAuth);
    if (!detail) return { index, item };

    return {
      index,
      item: {
        ...item,
        title: detail.title.length > item.title.length ? detail.title : item.title,
        body: detail.body.length > item.body.length ? detail.body : item.body,
      },
    };
  });

  for (const { index, item } of fetched) {
    enriched[index] = item;
  }

  return enriched;
}
