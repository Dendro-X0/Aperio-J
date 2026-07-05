import { getTaxonomyNode, taxonomyLabel, type TaxonomyKind, type TaxonomyRef } from "@aperio-j/core";
import type { Locale } from "@/i18n/translate";

const REMOTE_LOCATION_PATTERN = /^(远程|remote|work from home|wfh)$/i;
const HTML_GARBAGE_PATTERN = /<[^>]+>|href\s*=|<\/?(?:strong|em|p|div|br)\b|&#?\w+;/i;

/** Broad industry tags that appear on most remote tech listings — deprioritize on cards. */
const GENERIC_CARD_TAXONOMY_IDS = new Set([
  "industry:it-software",
  "industry:internet-platform",
  "industry:professional-services",
]);

const TAXONOMY_KIND_PRIORITY: Record<TaxonomyKind, number> = {
  subSector: 0,
  industry: 1,
  city: 2,
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#x0*27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function fixMojibake(text: string): string {
  return text
    .replace(/â€™|â\x80\x99/gu, "'")
    .replace(/â€œ|â\x80\x9c/gu, '"')
    .replace(/â€\x9d|â\x80\x9d/gu, '"')
    .replace(/â€"|â\x80\x93/gu, "–")
    .replace(/â€"|â\x80\x94/gu, "—")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ã /g, "à");
}

/** Strip HTML and normalize scraped text for UI chips, titles, and excerpts. */
export function stripHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  text = decodeHtmlEntities(text);
  text = fixMojibake(text);

  return text.replace(/\s+/g, " ").trim();
}

/** Plain-text label safe for badges and headings. Returns empty when garbage. */
export function sanitizeDisplayText(
  value: string | null | undefined,
  options?: { maxLength?: number },
): string {
  if (!value?.trim()) return "";
  const maxLength = options?.maxLength ?? 80;
  const text = stripHtml(value);
  if (!text || HTML_GARBAGE_PATTERN.test(value)) return "";
  if (text.length > maxLength) return `${text.slice(0, maxLength).trim()}…`;
  return text;
}

export function bodyExcerpt(body: string, title: string, max = 100): string {
  const text = stripScrapeMetadata(stripHtml(body.trim()));
  const cleanTitle = stripHtml(title.trim());
  if (!text || text === cleanTitle) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function stripScrapeMetadata(text: string): string {
  let cleaned = text
    .replace(/^Headquarters:\s*[^]+?(?=\sURL:|$)/i, "")
    .replace(/\bURL:\s*https?:\/\/\S+/gi, "")
    .replace(/\bhttps?:\/\/\S+/g, "")
    .replace(/^(Headquarters|Location|Company|Posted|Job type|Category|Department):\s*/gim, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length >= 24) return cleaned;

  const sentence = text.match(/[A-Za-z0-9"'(（][^.!?…]{24,}[.!?…]/);
  return sentence ? sentence[0].trim() : cleaned;
}

export function displayLocationText(
  location: string | null | undefined,
  locale: Locale,
  options?: { remoteOnly?: boolean },
): string | null {
  const cleaned = sanitizeDisplayText(location, { maxLength: 48 });
  if (!cleaned) return null;

  if (REMOTE_LOCATION_PATTERN.test(cleaned)) {
    if (locale === "es") return "Remoto";
    if (locale === "en") return "Remote";
    return "远程";
  }

  if (options?.remoteOnly) {
    return null;
  }

  return cleaned;
}

export function displayTaxonomyLabel(ref: TaxonomyRef, locale: Locale): string {
  const node = getTaxonomyNode(ref.id);
  if (node) return taxonomyLabel(node, locale);
  return sanitizeDisplayText(ref.label, { maxLength: 40 }) || ref.label;
}

export function taxonomyTagsForCard(
  refs: TaxonomyRef[],
  options?: { remoteOnly?: boolean; limit?: number },
): TaxonomyRef[] {
  const limit = options?.limit ?? 3;
  const filtered = options?.remoteOnly
    ? refs.filter((ref) => ref.kind !== "city")
    : refs;

  const ranked = [...filtered].sort((a, b) => {
    const aGeneric = GENERIC_CARD_TAXONOMY_IDS.has(a.id) ? 1 : 0;
    const bGeneric = GENERIC_CARD_TAXONOMY_IDS.has(b.id) ? 1 : 0;
    if (aGeneric !== bGeneric) return aGeneric - bGeneric;
    return TAXONOMY_KIND_PRIORITY[a.kind] - TAXONOMY_KIND_PRIORITY[b.kind];
  });

  const picked: TaxonomyRef[] = [];
  let genericCount = 0;

  for (const ref of ranked) {
    if (picked.length >= limit) break;
    if (GENERIC_CARD_TAXONOMY_IDS.has(ref.id)) {
      if (genericCount > 0) continue;
      genericCount += 1;
    }
    if (picked.some((item) => item.id === ref.id)) continue;
    picked.push(ref);
  }

  if (picked.length < limit) {
    for (const ref of ranked) {
      if (picked.length >= limit) break;
      if (!picked.some((item) => item.id === ref.id)) picked.push(ref);
    }
  }

  return picked;
}
