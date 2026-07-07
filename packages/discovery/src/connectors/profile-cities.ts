import type { SeekerProfile } from "@aperio-j/core";
import { cityIdentityKey } from "@aperio-j/core";
import type { ConnectorId } from "./types.js";

/** City-scoped connectors get one stream per profile city tag. */
const CITY_SCOPED_CONNECTORS = new Set<ConnectorId>([
  "adzuna",
  "bundesagentur",
  "reed",
  "usajobs",
  "francetravail",
  "worknet",
  "mycareersfuture",
]);

/** Geo/country-scoped connectors dedupe across cities in the same region. */
const GEO_SCOPED_CONNECTORS = new Set<ConnectorId>(["himalayas", "jobicy"]);

export function isCityScopedConnector(id: ConnectorId): boolean {
  return CITY_SCOPED_CONNECTORS.has(id);
}

export function isGeoScopedConnector(id: ConnectorId): boolean {
  return GEO_SCOPED_CONNECTORS.has(id);
}

/** Primary + acceptable city tags, deduped by catalog/metro identity. */
export function listUniqueProfileCities(profile: Pick<SeekerProfile, "constraints">): string[] {
  const cities = [
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
  ]
    .map((city) => city.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const city of cities) {
    const key = cityIdentityKey(city);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(city);
  }

  return result;
}

/** Profile slices used when resolving city- or geo-scoped connector queries. */
export function connectorProfileVariants(
  profile: SeekerProfile,
  connectorId: ConnectorId,
): SeekerProfile[] {
  const cities = listUniqueProfileCities(profile);
  if (cities.length === 0) return [profile];

  if (isCityScopedConnector(connectorId)) {
    return cities.map((city) => ({
      ...profile,
      constraints: {
        ...profile.constraints,
        primaryCity: city,
      },
    }));
  }

  if (isGeoScopedConnector(connectorId)) {
    return cities.map((city) => ({
      ...profile,
      constraints: {
        ...profile.constraints,
        primaryCity: city,
      },
    }));
  }

  return [profile];
}
