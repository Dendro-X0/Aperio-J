import type { RawFeedItem, RemotePreference } from "@aperio-j/core";
import type { StreamConfig } from "../fetch-streams.js";

export type ConnectorId =
  | "remotive"
  | "remoteok"
  | "arbeitnow"
  | "adzuna"
  | "bundesagentur"
  | "himalayas"
  | "jobicy"
  | "mycareersfuture"
  | "reed"
  | "usajobs"
  | "francetravail"
  | "worknet"
  | "careerjet"
  | "jooble";

export interface ConnectorQuery {
  id: ConnectorId;
  /** Space-joined search terms from profile intent. */
  search: string;
  city: string;
  country?: string;
  /** Jobicy region slug, e.g. `singapore`, `japan`. */
  geo?: string;
  remotePreference: RemotePreference;
}

export interface ConnectorStreamConfig extends StreamConfig {
  kind: "connector";
  connectorId: ConnectorId;
  query: ConnectorQuery;
}

export interface ConnectorDefinition {
  id: ConnectorId;
  label: string;
  /** When false, profile resolution skips this connector (C3+ implementation). */
  ready?: boolean;
  /** When true, requires APERO_J_CONNECTORS_EXPERIMENTAL or explicit allowlist entry. */
  experimental?: boolean;
  supports(profile: {
    constraints: { primaryCity: string; remotePreference: RemotePreference };
  }): boolean;
  buildQuery(profile: {
    constraints: { primaryCity: string; remotePreference: RemotePreference };
    intent: { desiredRoles: string[] };
  }): ConnectorQuery | null;
  fetch(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]>;
}

export function connectorSeedUrl(id: ConnectorId, query: ConnectorQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.city) params.set("city", query.city);
  if (query.country) params.set("country", query.country);
  return `connector://${id}?${params.toString()}`;
}

export function connectorStreamId(profileId: string, id: ConnectorId, query: ConnectorQuery): string {
  const raw = `${profileId}:${id}:${query.search}:${query.city}:${query.country ?? ""}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `connector-${id}-${hash.toString(16)}`;
}
