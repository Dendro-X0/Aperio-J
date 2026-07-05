import type { RawFeedItem } from "@aperio-j/core";

/** Shared normalization helpers for API job rows. */

export function joinBodyParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n");
}

export function dedupeKey(title: string, company: string): string {
  return `${title.trim().toLowerCase()}|${company.trim().toLowerCase()}`;
}

export function parseIsoDate(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

export function capItems<T>(items: T[], max: number): T[] {
  return items.slice(0, Math.max(1, max));
}

export function connectorMaxItems(): number {
  return Math.max(1, Number(process.env.APERO_J_CONNECTOR_MAX_ITEMS ?? 50));
}

const COMPANY_LINE = /^Company:\s*(.+?)(?:\n|$)/m;

export function extractCompanyFromBody(body: string): string {
  return COMPANY_LINE.exec(body)?.[1]?.trim() ?? "";
}

/** Client-side title/role filter when an API has no search parameter. */
export function searchTerms(search: string): string[] {
  return search
    .toLowerCase()
    .split(/\s+/)
    .flatMap((term) => term.split(/[-_/]+/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

export function matchesConnectorSearch(haystack: string, search: string): boolean {
  const terms = searchTerms(search);
  if (terms.length === 0) return true;

  const corpus = haystack.toLowerCase();
  return terms.some((term) => corpus.includes(term));
}

/** Prefer role-filtered rows; use the full feed when the filter matches nothing. */
export function withConnectorSearchFallback<T>(filtered: T[], unfiltered: T[]): T[] {
  return filtered.length > 0 ? filtered : unfiltered;
}

/** Collapse duplicate listings across connector feeds (first occurrence wins). */
export function dedupeRawFeedItems(items: RawFeedItem[]): RawFeedItem[] {
  const seen = new Set<string>();
  const deduped: RawFeedItem[] = [];

  for (const item of items) {
    const company = extractCompanyFromBody(item.body);
    if (!company) {
      deduped.push(item);
      continue;
    }

    const key = dedupeKey(item.title, company);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
