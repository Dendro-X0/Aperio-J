import type { Opportunity } from "@aperio-j/core";

/** Normalize listing URLs for cross-feed deduplication. */
export function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key) || key === "ref" || key === "source") {
        parsed.searchParams.delete(key);
      }
    }
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Collapse duplicate listings that share a URL or near-identical title.
 * Keeps the richest body when duplicates disagree.
 */
export function dedupeOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const byUrl = new Map<string, Opportunity>();
  const byTitle = new Map<string, Opportunity>();

  for (const opportunity of opportunities) {
    const urlKey = normalizeJobUrl(opportunity.url);
    const titleKey = normalizeTitle(opportunity.title);

    const urlHit = byUrl.get(urlKey);
    if (urlHit) {
      if (opportunity.body.length > urlHit.body.length) {
        byUrl.set(urlKey, opportunity);
      }
      continue;
    }

    const titleHit = byTitle.get(titleKey);
    if (titleHit && titleKey.length >= 12 && urlKey !== normalizeJobUrl(titleHit.url)) {
      if (opportunity.body.length > titleHit.body.length) {
        byTitle.set(titleKey, opportunity);
        byUrl.delete(normalizeJobUrl(titleHit.url));
        byUrl.set(urlKey, opportunity);
      }
      continue;
    }

    byUrl.set(urlKey, opportunity);
    if (titleKey.length >= 12) {
      byTitle.set(titleKey, opportunity);
    }
  }

  return [...byUrl.values()];
}
