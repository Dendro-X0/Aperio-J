import type { RawFeedItem } from "@aperio-j/core";
import { stripEmptySalaryLines } from "./salary-format.js";

const MOJIBAKE_MARKERS =
  /(?:Ã.|Â.|â.|Ø|Ù|Ð|Ñ|ï¿½|\uFFFD|â€)/u;

const ARABIC_MOJIBAKE_RUN = /(?:Ø[\u0080-\u00BF]|Ù[\u0080-\u00BF]|Øª|Ø§|Ù…){3,}/u;

/** True when text looks like UTF-8 decoded as Latin-1 / Windows-1252 garbage. */
export function isGarbledText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (ARABIC_MOJIBAKE_RUN.test(trimmed)) return true;

  const markers = trimmed.match(MOJIBAKE_MARKERS) ?? [];
  if (markers.length === 0) return false;

  const ratio = markers.length / Math.max(trimmed.length, 1);
  return ratio > 0.04 || (markers.length >= 3 && trimmed.length < 120);
}

export function sanitizeListingText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isGarbledText(trimmed)) return "";
  return trimmed;
}

export function sanitizeListingBody(body: string, title: string): string {
  let cleaned = stripEmptySalaryLines(body.trim());
  if (!cleaned) return "";

  if (isGarbledText(cleaned)) {
    const lines = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !isGarbledText(line));
    cleaned = lines.join("\n");
  }

  if (!cleaned || isGarbledText(cleaned)) return "";
  if (sanitizeListingText(title) && cleaned.toLowerCase() === title.trim().toLowerCase()) {
    return "";
  }
  return cleaned;
}

export function sanitizeRawFeedItem(item: RawFeedItem): RawFeedItem | null {
  const title = sanitizeListingText(item.title);
  if (!title) return null;

  const body = sanitizeListingBody(item.body, title);
  return {
    ...item,
    title,
    body,
  };
}

export function sanitizeRawFeedItems(items: RawFeedItem[]): RawFeedItem[] {
  const sanitized: RawFeedItem[] = [];
  for (const item of items) {
    const cleaned = sanitizeRawFeedItem(item);
    if (cleaned) sanitized.push(cleaned);
  }
  return sanitized;
}
