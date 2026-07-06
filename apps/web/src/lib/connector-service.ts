import type { SeekerProfile } from "@aperio-j/core";
import { isChinaCityProfile, isCnLocalFirstProfile, isCnRemoteFirstProfile } from "@aperio-j/probe";
import type { ConnectorId } from "@aperio-j/discovery/connectors/types";
import { resolveConnectorsForProfile } from "@aperio-j/discovery/connectors/resolve-connectors";
import { seedUrlMatchesCityProfile, prepareCnStreamFetchUrl } from "@aperio-j/discovery/cn-sources";
import type { ConnectorStreamConfig } from "@aperio-j/discovery/connectors/types";
import type { StreamConfig } from "@aperio-j/discovery/fetch-streams";
import type { StreamRow } from "@/components/sources/types";
import { connectorDiscoveredVia } from "./source-intake";
/** Ephemeral API connector streams for the current profile. */
export function loadConnectorStreamConfigs(profile: SeekerProfile): StreamConfig[] {
  const city = profile.constraints.primaryCity.trim();
  if (
    isChinaCityProfile(city, profile.constraints.acceptableCities) &&
    (profile.constraints.remotePreference === "onsite-only" || isCnLocalFirstProfile(profile))
  ) {
    return [];
  }
  return resolveConnectorsForProfile(profile);
}

export function connectorWorkCategory(connectorId: ConnectorId): StreamRow["workCategory"] {
  if (
    connectorId === "bundesagentur" ||
    connectorId === "adzuna" ||
    connectorId === "mycareersfuture" ||
    connectorId === "reed" ||
    connectorId === "usajobs" ||
    connectorId === "francetravail" ||
    connectorId === "worknet"
  ) {
    return "onsite";
  }
  return "remote";
}

export function buildConnectorStreamRows(profile: SeekerProfile): StreamRow[] {
  return loadConnectorStreamConfigs(profile)
    .filter(isConnectorStreamConfig)
    .map((config) => ({
      id: config.id,
      label: config.label,
      kind: "connector",
      seedUrl: config.url,
      regionHint: profile.constraints.primaryCity,
      workCategory: connectorWorkCategory(config.connectorId),
      confidence: 1,
      sampleItemCount: 0,
      enabled: true,
      health: "healthy",
      opportunityYield: 0,
      learningWeight: 1,
      lastValidatedAt: new Date().toISOString(),
      discoveredVia: connectorDiscoveredVia(config.connectorId),
      origin: "auto" as const,
      authMode: "none" as const,
      hasSessionAuth: false,
      intakeType: "api" as const,
      connectorId: config.connectorId,
      ephemeral: true,
    }));
}

export function mergeSourceRowsForDisplay(
  connectorRows: StreamRow[],
  registryRows: StreamRow[],
): StreamRow[] {
  const seen = new Set(connectorRows.map((row) => row.seedUrl));
  return [...connectorRows, ...registryRows.filter((row) => !seen.has(row.seedUrl))];
}

export function isConnectorStreamConfig(config: StreamConfig): config is ConnectorStreamConfig {
  return config.kind === "connector" && Boolean(config.connectorId && config.query);
}

/** Connectors first, then registry streams (deduped by seed URL). */
export function mergeStreamConfigsForProfile(
  profile: SeekerProfile,
  registryConfigs: StreamConfig[],
): StreamConfig[] {
  const city = profile.constraints.primaryCity.trim();
  const connectors = loadConnectorStreamConfigs(profile);
  const cnRemoteFirst = isCnRemoteFirstProfile(
    profile.constraints.primaryCity,
    profile.constraints.acceptableCities,
    profile.constraints.remotePreference,
    profile,
  );
  const cnCity =
    isChinaCityProfile(city, profile.constraints.acceptableCities) && !cnRemoteFirst;
  const registryRows = cnCity
    ? registryConfigs.filter((row) => seedUrlMatchesCityProfile(row.url, city))
    : registryConfigs;

  const seen = new Set(connectors.map((row) => row.url));
  const merged: StreamConfig[] = [...connectors];

  for (const row of registryRows) {
    if (seen.has(row.url)) continue;
    const url =
      cnCity && row.kind === "list_page"
        ? prepareCnStreamFetchUrl(row.url, city)
        : row.url;
    if (cnCity && !seedUrlMatchesCityProfile(url, city)) continue;
    seen.add(row.url);
    merged.push({ ...row, url, regionHint: row.regionHint ?? city });
  }

  return merged;
}

export function connectorSourceMeta(config: ConnectorStreamConfig): {
  id: string;
  label: string;
  seedUrl: string;
  kind: string;
  site: string;
} {
  let site: string = config.connectorId;
  try {
    site = new URL(config.url.replace(/^connector:\/\//, "https://")).hostname.replace(
      /^www\./i,
      "",
    );
  } catch {
    // keep connector id as site fallback
  }

  return {
    id: config.id,
    label: config.label,
    seedUrl: config.url,
    kind: "connector",
    site,
  };
}
