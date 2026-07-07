import { cityIdentityKey, displayCityLabel } from "@aperio-j/core";
import { corpusMatchesCity, corpusMatchesDistrict } from "@aperio-j/discovery/location";
import type { InboxItem } from "@/lib/match-service";

export type InboxCityFilter = "all" | string;

export function inboxCityFilterOptions(
  profileCities: string[],
  profileDistricts: string[],
  locale: string,
): Array<{ value: string; label: string }> {
  const cityOptions = profileCities.map((city) => ({
    value: cityIdentityKey(city),
    label: displayCityLabel(city, locale),
  }));
  const districtOptions = profileDistricts.map((district) => ({
    value: `district:${district.trim().toLowerCase()}`,
    label: district,
  }));
  return [...cityOptions, ...districtOptions];
}

export function matchesCityFilter(
  item: InboxItem,
  cityFilter: InboxCityFilter,
  profileCities: string[],
  profileDistricts: string[] = [],
): boolean {
  if (cityFilter === "all") return true;

  const targetCity = profileCities.find((city) => cityIdentityKey(city) === cityFilter);
  const targetDistrict = cityFilter.startsWith("district:")
    ? profileDistricts.find((district) => `district:${district.trim().toLowerCase()}` === cityFilter)
    : undefined;
  if (!targetCity && !targetDistrict) return true;

  const corpus = [
    item.opportunity.title,
    item.opportunity.body,
    item.opportunity.locationText,
    item.opportunity.employerHint,
  ]
    .filter(Boolean)
    .join(" ");

  if (!corpus.trim()) return false;
  if (targetDistrict) return corpusMatchesDistrict(corpus, [targetDistrict]);
  if (!targetCity) return true;
  return corpusMatchesCity(corpus, [targetCity]);
}
