import type { SeekerProfile } from "@aperio-j/core";
import { displayCityLabel, getTaxonomyNode, taxonomyLabel } from "@aperio-j/core";

/** All explicit city tags on a profile (primary + acceptable). */
export function profileCities(
  profile: Pick<SeekerProfile, "constraints">,
): string[] {
  return [
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
  ]
    .map((city) => city.trim())
    .filter(Boolean);
}

export function profileDistricts(
  profile: Pick<SeekerProfile, "constraints">,
): string[] {
  return (profile.constraints.preferredDistricts ?? [])
    .map((district) => district.trim())
    .filter(Boolean);
}

export function profileHasExplicitCity(
  profile: Pick<SeekerProfile, "constraints">,
): boolean {
  return profileCities(profile).length > 0;
}

/** Locale-aware label for remote-only profiles (no city tags). */
export function remoteLocationLabel(locale: string): string {
  const remoteNode = getTaxonomyNode("city:remote");
  if (remoteNode) return taxonomyLabel(remoteNode, locale);
  return locale === "zh-CN" ? "远程" : "Remote";
}

/**
 * Display label for profile location chips.
 * Empty city list → "Remote" / "远程"; otherwise localized city names.
 */
export function profileLocationLabel(
  profile: Pick<SeekerProfile, "constraints">,
  locale: string,
): string {
  const cities = profileCities(profile);
  if (cities.length === 0) return remoteLocationLabel(locale);
  return cities.map((city) => displayCityLabel(city, locale)).join(" · ");
}

/**
 * Resolve a stored city summary string (joined raw cities) for shell chips.
 * Pass an empty string when no cities are set.
 */
export function profileLocationLabelFromCityField(
  cityField: string | undefined,
  locale: string,
): string {
  const cities = cityField
    ?.split(" · ")
    .map((part) => part.trim())
    .filter(Boolean) ?? [];
  if (cities.length === 0) return remoteLocationLabel(locale);
  return cities.map((city) => displayCityLabel(city, locale)).join(" · ");
}
