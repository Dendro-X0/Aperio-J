import type { SeekerProfile } from "@aperio-j/core";
import { isChinaCityProfile, isCnLocalFirstProfile } from "@aperio-j/probe";
import {
  isConnectorEnabled,
  listConnectorDefinitions,
} from "./registry.js";
import type { ConnectorStreamConfig } from "./types.js";
import { connectorSeedUrl, connectorStreamId } from "./types.js";

const GLOBAL_REMOTE_CONNECTORS = new Set(["remotive", "remoteok", "arbeitnow", "himalayas", "jobicy"]);

function shouldSkipConnector(connectorId: string, profile: SeekerProfile): boolean {
  if (!GLOBAL_REMOTE_CONNECTORS.has(connectorId)) return false;
  const city = profile.constraints.primaryCity.trim();
  if (!city) return false;
  if (!isChinaCityProfile(city, profile.constraints.acceptableCities)) return false;
  if (profile.constraints.remotePreference === "onsite-only") return true;
  return isCnLocalFirstProfile(profile);
}

export function resolveConnectorsForProfile(profile: SeekerProfile): ConnectorStreamConfig[] {
  const configs: ConnectorStreamConfig[] = [];

  for (const connector of listConnectorDefinitions()) {
    if (connector.ready === false) continue;
    if (!isConnectorEnabled(connector.id)) continue;
    if (shouldSkipConnector(connector.id, profile)) continue;
    if (!connector.supports(profile)) continue;

    const query = connector.buildQuery(profile);
    if (!query) continue;

    const id = connectorStreamId(profile.id, connector.id, query);
    configs.push({
      id,
      label: connector.label,
      url: connectorSeedUrl(connector.id, query),
      kind: "connector",
      connectorId: connector.id,
      query,
    });
  }

  return configs;
}
