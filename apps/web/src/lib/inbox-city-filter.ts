import { cityIdentityKey, displayCityLabel } from "@aperio-j/core";
import { corpusMatchesCity } from "@aperio-j/discovery/location";
import type { InboxItem } from "@/lib/match-service";

export type InboxCityFilter = "all" | string;

export function inboxCityFilterOptions(
  profileCities: string[],
  locale: string,
): Array<{ value: string; label: string }> {
  return profileCities.map((city) => ({
    value: cityIdentityKey(city),
    label: displayCityLabel(city, locale),
  }));
}

export function matchesCityFilter(
  item: InboxItem,
  cityFilter: InboxCityFilter,
  profileCities: string[],
): boolean {
  if (cityFilter === "all") return true;

  const targetCity = profileCities.find((city) => cityIdentityKey(city) === cityFilter);
  if (!targetCity) return true;

  const corpus = [
    item.opportunity.title,
    item.opportunity.body,
    item.opportunity.locationText,
    item.opportunity.employerHint,
  ]
    .filter(Boolean)
    .join(" ");

  if (!corpus.trim()) return false;
  return corpusMatchesCity(corpus, [targetCity]);
}
