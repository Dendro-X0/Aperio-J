import type { SeekerProfile } from "@aperio-j/core";
import { sortByNetworkReach } from "@aperio-j/discovery/network-region";
import { isCnNetworkContext } from "@aperio-j/discovery/profile-network-context";
import { buildConnectorStreamRows, mergeSourceRowsForDisplay } from "./connector-service";
import { listStreamRegistry, serializeStreamRow } from "./source-registry";
import type { StreamRow } from "@/components/sources/types";

export async function listSourcesForProfile(profile: SeekerProfile): Promise<StreamRow[]> {
  const registry = await listStreamRegistry(profile.id);
  const registryRows = registry.map(serializeStreamRow);
  const connectorRows = buildConnectorStreamRows(profile);
  const merged = mergeSourceRowsForDisplay(connectorRows, registryRows);
  return sortByNetworkReach(merged, { preferCn: isCnNetworkContext(profile) });
}
