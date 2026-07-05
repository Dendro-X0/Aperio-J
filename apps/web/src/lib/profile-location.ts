import type { SeekerProfile } from "@aperio-j/core";

function normalizeCityList(cities: string[]): string[] {
  return cities
    .map((city) => city.trim().replace(/市$/u, "").toLowerCase())
    .filter(Boolean)
    .sort();
}

/** Stable key for comparing location tags across profile saves. */
export function profileLocationKey(profile: Pick<SeekerProfile, "constraints">): string {
  const cities = [
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
  ].filter(Boolean);
  return normalizeCityList(cities).join("|");
}

export function profileLocationChanged(
  previous: Pick<SeekerProfile, "constraints"> | null | undefined,
  next: Pick<SeekerProfile, "constraints">,
): boolean {
  if (!previous) return false;
  return profileLocationKey(previous) !== profileLocationKey(next);
}
