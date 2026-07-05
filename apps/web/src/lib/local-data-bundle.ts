import type { SeekerProfile } from "@aperio-j/core";

export const LOCAL_DATA_BUNDLE_VERSION = 1 as const;

export interface LocalDataStreamExport {
  label: string;
  kind: string;
  seedUrl: string;
  discoveredVia: string;
  regionHint: string;
  confidence: number;
  sampleItemCount: number;
  enabled: boolean;
  health: string;
  pollLane: string;
  opportunityYield: number;
  matchYield: number;
  learningWeight: number;
  lastValidatedAt: string;
  authMode: string;
  authSecret: string | null;
}

export interface LocalDataExportBundle {
  version: typeof LOCAL_DATA_BUNDLE_VERSION;
  exportedAt: string;
  app: "aperio-j";
  profile: {
    displayName: string | null;
    profileJson: string;
    onboardingComplete: boolean;
  };
  streams: LocalDataStreamExport[];
}

export function isLocalDataExportBundle(value: unknown): value is LocalDataExportBundle {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.version !== LOCAL_DATA_BUNDLE_VERSION) return false;
  if (record.app !== "aperio-j") return false;
  if (typeof record.exportedAt !== "string") return false;
  if (!record.profile || typeof record.profile !== "object") return false;
  const profile = record.profile as Record<string, unknown>;
  if (typeof profile.profileJson !== "string") return false;
  if (typeof profile.onboardingComplete !== "boolean") return false;
  if (!Array.isArray(record.streams)) return false;
  return record.streams.every((stream) => {
    if (!stream || typeof stream !== "object") return false;
    const row = stream as Record<string, unknown>;
    return typeof row.seedUrl === "string" && typeof row.label === "string";
  });
}

export function parseSeekerProfileFromBundle(bundle: LocalDataExportBundle): SeekerProfile {
  const parsed = JSON.parse(bundle.profile.profileJson) as SeekerProfile;
  return parsed;
}
