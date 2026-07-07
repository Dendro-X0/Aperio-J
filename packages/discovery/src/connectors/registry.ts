import type { RawFeedItem } from "@aperio-j/core";
import { arbeitnowConnector } from "./arbeitnow.js";
import { adzunaConnector } from "./adzuna.js";
import { bundesagenturConnector } from "./bundesagentur.js";
import { careerjetConnector } from "./careerjet.js";
import { francetravailConnector } from "./francetravail.js";
import { himalayasConnector } from "./himalayas.js";
import { jobicyConnector } from "./jobicy.js";
import { joobleConnector } from "./jooble.js";
import { mycareersfutureConnector } from "./mycareersfuture.js";
import { reedConnector } from "./reed.js";
import { remotiveConnector } from "./remotive.js";
import { remoteokConnector } from "./remoteok.js";
import { usajobsConnector } from "./usajobs.js";
import { worknetConnector } from "./worknet.js";
import type { ConnectorDefinition, ConnectorId, ConnectorStreamConfig } from "./types.js";

const CONNECTORS: ConnectorDefinition[] = [
  bundesagenturConnector,
  mycareersfutureConnector,
  reedConnector,
  usajobsConnector,
  francetravailConnector,
  worknetConnector,
  adzunaConnector,
  remotiveConnector,
  remoteokConnector,
  arbeitnowConnector,
  himalayasConnector,
  jobicyConnector,
  careerjetConnector,
  joobleConnector,
];

const byId = new Map<ConnectorId, ConnectorDefinition>(
  CONNECTORS.map((connector) => [connector.id, connector]),
);

export function getConnector(id: ConnectorId): ConnectorDefinition | undefined {
  return byId.get(id);
}

export function listConnectorDefinitions(): ConnectorDefinition[] {
  return [...CONNECTORS];
}

export function parseEnabledConnectorIds(): ConnectorId[] | null {
  const raw = process.env.APERO_J_CONNECTORS_ENABLED?.trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as ConnectorId[];
}

export function isConnectorEnabled(id: ConnectorId): boolean {
  const allowlist = parseEnabledConnectorIds();
  if (!allowlist) return true;
  return allowlist.includes(id);
}

/** Experimental connectors activate when APERO_J_CONNECTORS_EXPERIMENTAL=true or explicitly allowlisted. */
export function isExperimentalConnectorEnabled(id: ConnectorId): boolean {
  if (process.env.APERO_J_CONNECTORS_EXPERIMENTAL === "true") return true;
  const allowlist = parseEnabledConnectorIds();
  return allowlist?.includes(id) ?? false;
}

export async function fetchConnector(config: ConnectorStreamConfig): Promise<RawFeedItem[]> {
  const connector = getConnector(config.connectorId);
  if (!connector) {
    throw new Error(`Unknown connector: ${config.connectorId}`);
  }
  return connector.fetch(config.query, config.id);
}
