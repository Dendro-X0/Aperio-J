export interface StreamRow {
  id: string;
  label: string;
  kind: string;
  seedUrl: string;
  regionHint: string;
  workCategory: "remote" | "onsite";
  confidence: number;
  sampleItemCount: number;
  enabled: boolean;
  health: string;
  opportunityYield: number;
  learningWeight: number;
  lastValidatedAt: string;
  discoveredVia: string;
  origin: "user" | "auto";
  authMode: "none" | "cookie" | "bearer";
  hasSessionAuth: boolean;
  intakeType: "api" | "rss" | "scraped" | "custom";
  connectorId?: string;
  ephemeral?: boolean;
}

export interface SourcesProfileSummary {
  city: string;
  roles: string[];
  remotePreference: "remote-only" | "hybrid-ok" | "onsite-only";
}

export interface LastDiscoveryStats {
  found: number;
  enabled: number;
}

export interface SourcesRegistryProps {
  initialStreams: StreamRow[];
  lastDiscoveryAt: string | null;
  lastDiscoveryStats: LastDiscoveryStats | null;
  profileSummary: SourcesProfileSummary;
}
