"use client";

import { useEffect, useMemo, useState } from "react";
import type { PosterType } from "@aperio-j/core";
import type { InboxItem } from "@/lib/match-service";
import {
  inboxItemMatchesPreset,
  resolveInboxFilterPresetIdsForIndustries,
} from "@/lib/inbox-filter-presets";
import {
  deriveInboxSearchFacets,
  itemMatchesSearchFacets,
  type InboxSearchFacet,
} from "@/lib/inbox-search-facets";
import {
  matchesWorkModeFilter,
  type InboxWorkModeFilter,
} from "@/lib/inbox-work-mode";
import { matchesCityFilter, type InboxCityFilter } from "@/lib/inbox-city-filter";

export type InboxSort = "score" | "recent";
export type PosterFilter = PosterType | "all";

export interface InboxFilters {
  query: string;
  presets: string[];
  posterType: PosterFilter;
  workMode: InboxWorkModeFilter;
  city: InboxCityFilter;
  minScore: number;
  sort: InboxSort;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  query: "",
  presets: [],
  posterType: "all",
  workMode: "all",
  city: "all",
  minScore: 0,
  sort: "score",
};

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

export function filterInboxItems(
  items: InboxItem[],
  filters: InboxFilters,
  availablePresetIds: string[],
  searchFacetIds: string[] = [],
  profileCities: string[] = [],
  profileDistricts: string[] = [],
): InboxItem[] {
  const activeFacetIds = filters.query.trim() ? searchFacetIds : availablePresetIds;
  const filtered = items.filter((item) => {
    if (!matchesQuery(item, filters.query)) return false;
    if (!matchesWorkModeFilter(item, filters.workMode)) return false;
    if (!matchesCityFilter(item, filters.city, profileCities, profileDistricts)) return false;
    if (filters.posterType !== "all" && item.opportunity.posterType !== filters.posterType) {
      return false;
    }
    if (item.match.breakdown.finalScore < filters.minScore) return false;
    if (filters.presets.length > 0) {
      if (filters.query.trim()) {
        if (!itemMatchesSearchFacets(item, filters.presets, activeFacetIds)) return false;
      } else {
        const match = filters.presets.some((presetId) =>
          inboxItemMatchesPreset(item, presetId, availablePresetIds),
        );
        if (!match) return false;
      }
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "recent") {
      return b.opportunity.fetchedAt.localeCompare(a.opportunity.fetchedAt);
    }
    return b.match.breakdown.finalScore - a.match.breakdown.finalScore;
  });
}

export function useInboxFilters(
  items: InboxItem[],
  industryLabels: string[],
  profileCities: string[] = [],
  profileDistricts: string[] = [],
) {
  const availablePresetIds = useMemo(
    () => resolveInboxFilterPresetIdsForIndustries(industryLabels),
    [industryLabels],
  );

  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_INBOX_FILTERS);

  const searchFacets = useMemo(
    () => deriveInboxSearchFacets(items, filters.query),
    [items, filters.query],
  );

  const searchFacetIds = useMemo(
    () => searchFacets.map((facet) => facet.id),
    [searchFacets],
  );

  useEffect(() => {
    setFilters((prev) => {
      const presets = prev.presets.filter((presetId) => availablePresetIds.includes(presetId));
      if (presets.length === prev.presets.length) return prev;
      return { ...prev, presets };
    });
  }, [availablePresetIds]);

  useEffect(() => {
    if (!filters.query.trim()) return;
    setFilters((prev) => {
      const presets = prev.presets.filter((presetId) => searchFacetIds.includes(presetId));
      if (presets.length === prev.presets.length) return prev;
      return { ...prev, presets };
    });
  }, [filters.query, searchFacetIds]);

  const filteredItems = useMemo(
    () =>
      filterInboxItems(
        items,
        filters,
        availablePresetIds,
        searchFacetIds,
        profileCities,
        profileDistricts,
      ),
    [items, filters, availablePresetIds, searchFacetIds, profileCities, profileDistricts],
  );

  function togglePreset(presetId: string) {
    setFilters((prev) => {
      const selected = prev.presets.includes(presetId);
      return {
        ...prev,
        presets: selected
          ? prev.presets.filter((value) => value !== presetId)
          : [...prev.presets, presetId],
      };
    });
  }

  function resetFilters() {
    setFilters(DEFAULT_INBOX_FILTERS);
  }

  return {
    filters,
    setFilters,
    filteredItems,
    availablePresetIds,
    searchFacets,
    searchFacetIds,
    togglePreset,
    resetFilters,
  };
}

export function countActiveFilters(filters: InboxFilters): number {
  let count = 0;
  if (filters.query.trim()) count += 1;
  if (filters.presets.length > 0) count += 1;
  if (filters.posterType !== "all") count += 1;
  if (filters.workMode !== "all") count += 1;
  if (filters.city !== "all") count += 1;
  if (filters.minScore > 0) count += 1;
  if (filters.sort !== "score") count += 1;
  return count;
}

export type { InboxSearchFacet, InboxCityFilter };
