import type { InboxItem } from "@/lib/match-service";
import { inboxItemMatchesPreset } from "@/lib/inbox-filter-presets";

export interface InboxSearchFacet {
  id: string;
  count: number;
}

function matchesQuery(item: InboxItem, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const haystack = [
    item.opportunity.title,
    item.opportunity.body,
    item.opportunity.employerHint,
    item.opportunity.locationText,
    item.match.explanation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(trimmed);
}

function facetIdsForItem(item: InboxItem): string[] {
  const ids = new Set<string>();

  for (const ref of [
    ...(item.opportunity.taxonomyRefs ?? []),
    ...(item.match.taxonomyHits ?? []),
  ]) {
    if (ref.id.startsWith("subSector:")) {
      ids.add(ref.id);
    }
  }

  return [...ids];
}

/** Top role/sub-sector facets from items matching the current search query. */
export function deriveInboxSearchFacets(
  items: InboxItem[],
  query: string,
  limit = 8,
): InboxSearchFacet[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const counts = new Map<string, number>();

  for (const item of items) {
    if (!matchesQuery(item, trimmed)) continue;

    for (const facetId of facetIdsForItem(item)) {
      counts.set(facetId, (counts.get(facetId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

export function itemMatchesSearchFacets(
  item: InboxItem,
  facetIds: string[],
  allFacetIds: string[],
): boolean {
  if (facetIds.length === 0) return true;
  return facetIds.some((facetId) => inboxItemMatchesPreset(item, facetId, allFacetIds));
}
