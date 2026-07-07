import type { SeekerProfile } from "@aperio-j/core";
import { isConnectorEnabled, isExperimentalConnectorEnabled, listConnectorDefinitions } from "./registry.js";
import {
  connectorProfileVariants,
  isGeoScopedConnector,
  listUniqueProfileCities,
} from "./profile-cities.js";
import { resolveAdzunaCountry, resolveJobicyGeo } from "./geo.js";
import type { ConnectorStreamConfig } from "./types.js";
import { connectorSeedUrl, connectorStreamId } from "./types.js";
import { isChinaCityProfile, isCnLocalFirstProfile } from "@aperio-j/probe";

const GLOBAL_REMOTE_CONNECTORS = new Set(["remotive", "remoteok", "arbeitnow", "himalayas", "jobicy"]);

function shouldSkipConnector(connectorId: string, profile: SeekerProfile): boolean {
  if (!GLOBAL_REMOTE_CONNECTORS.has(connectorId)) return false;
  const city = profile.constraints.primaryCity.trim();
  if (!city) return false;
  if (!isChinaCityProfile(city, profile.constraints.acceptableCities)) return false;
  if (profile.constraints.remotePreference === "onsite-only") return true;
  return isCnLocalFirstProfile(profile);
}

function geoScopeKey(connectorId: string, city: string): string | null {
  if (connectorId === "himalayas") return resolveAdzunaCountry(city);
  if (connectorId === "jobicy") return resolveJobicyGeo(city);
  return null;
}

export function resolveConnectorsForProfile(profile: SeekerProfile): ConnectorStreamConfig[] {
  const configs: ConnectorStreamConfig[] = [];
  const seenStreamIds = new Set<string>();
  const seenGeoScopes = new Map<string, Set<string>>();

  for (const connector of listConnectorDefinitions()) {
    if (connector.ready === false) continue;
    if (connector.experimental && !isExperimentalConnectorEnabled(connector.id)) continue;
    if (!isConnectorEnabled(connector.id)) continue;
    if (shouldSkipConnector(connector.id, profile)) continue;

    const variants = connectorProfileVariants(profile, connector.id);
    const geoSeen = seenGeoScopes.get(connector.id) ?? new Set<string>();

    for (const variant of variants) {
      if (!connector.supports(variant)) continue;

      if (isGeoScopedConnector(connector.id)) {
        const scope = geoScopeKey(connector.id, variant.constraints.primaryCity);
        if (scope) {
          if (geoSeen.has(scope)) continue;
          geoSeen.add(scope);
        }
      }

      const query = connector.buildQuery(variant);
      if (!query) continue;

      const id = connectorStreamId(profile.id, connector.id, query);
      if (seenStreamIds.has(id)) continue;
      seenStreamIds.add(id);

      configs.push({
        id,
        label: connector.label,
        url: connectorSeedUrl(connector.id, query),
        kind: "connector",
        connectorId: connector.id,
        query,
      });
    }

    if (geoSeen.size > 0) {
      seenGeoScopes.set(connector.id, geoSeen);
    }
  }

  return configs;
}

export function profileCityCount(profile: SeekerProfile): number {
  return listUniqueProfileCities(profile).length;
}
