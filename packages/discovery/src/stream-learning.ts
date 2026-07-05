import type { RemotePreference, SeekerProfile, StreamHealth } from "@aperio-j/core";
import { isRemoteBoardUrl } from "@aperio-j/core";

export const EMPTY_FETCH_DEAD_THRESHOLD = 3;

export interface StreamLearningRow {
  seedUrl: string;
  health: StreamHealth;
  enabled: boolean;
  opportunityYield: number;
  matchYield: number;
  learningWeight: number;
  emptyFetchCount: number;
  userBlocked: boolean;
}

export interface DiscoveryGap {
  needsLocalSources: boolean;
  needsRoleFocusedSearch: boolean;
  deadStreamCount: number;
}

export function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isBlockedDomain(url: string, blockedDomains: ReadonlySet<string>): boolean {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  if (blockedDomains.has(host)) return true;
  for (const blocked of blockedDomains) {
    if (host === blocked || host.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export function nextEmptyFetchCount(
  current: number,
  itemCount: number,
  failed: boolean,
): number {
  if (itemCount > 0) return 0;
  if (failed || itemCount === 0) return current + 1;
  return current;
}

export function shouldMarkStreamDead(emptyFetchCount: number): boolean {
  return emptyFetchCount >= EMPTY_FETCH_DEAD_THRESHOLD;
}

export function nextLearningWeight(
  current: number,
  opportunityYield: number,
  matchYield: number,
): number {
  let weight = current;

  if (opportunityYield > 0 && matchYield === 0) {
    weight = Math.max(0.25, weight * 0.85);
  } else if (matchYield > 0) {
    weight = Math.min(2.5, weight + 0.15 + Math.min(matchYield, 5) * 0.05);
  } else if (opportunityYield === 0) {
    weight = Math.max(0.2, weight * 0.95);
  }

  return Math.round(weight * 1000) / 1000;
}

function hasHealthyLocalSource(
  rows: StreamLearningRow[],
  remotePreference: RemotePreference,
): boolean {
  if (remotePreference === "remote-only") return true;

  return rows.some(
    (row) =>
      row.enabled &&
      row.health !== "dead" &&
      !row.userBlocked &&
      !isRemoteBoardUrl(row.seedUrl),
  );
}

export function analyzeDiscoveryGap(
  rows: StreamLearningRow[],
  profile: Pick<SeekerProfile, "constraints" | "intent">,
): DiscoveryGap {
  const city = profile.constraints.primaryCity.trim();
  const active = rows.filter((row) => !row.userBlocked);
  const deadStreamCount = active.filter((row) => row.health === "dead").length;

  const lowMatchStreams = active.filter(
    (row) => row.opportunityYield > 0 && row.matchYield === 0 && row.enabled,
  );

  return {
    needsLocalSources:
      Boolean(city) &&
      profile.constraints.remotePreference !== "remote-only" &&
      !hasHealthyLocalSource(active, profile.constraints.remotePreference),
    needsRoleFocusedSearch:
      profile.intent.desiredRoles.length > 0 &&
      (lowMatchStreams.length > 0 || deadStreamCount > 0),
    deadStreamCount,
  };
}

export function buildGapFocusedSearchQueries(
  profile: Pick<SeekerProfile, "constraints" | "intent">,
  gap: DiscoveryGap,
): string[] {
  const city = profile.constraints.primaryCity.trim().replace(/市$/u, "");
  if (!city) return [];

  const queries: string[] = [];
  const roles = profile.intent.desiredRoles.map((role) => role.trim()).filter(Boolean).slice(0, 2);

  if (gap.needsLocalSources) {
    queries.push(
      `${city} government employment portal`,
      `${city} public sector jobs site:.gov`,
      `${city} careers site:.gov`,
    );
  }

  if (gap.needsRoleFocusedSearch) {
    for (const role of roles) {
      queries.push(`${city} ${role} jobs`);
      queries.push(`${city} ${role} careers site:.gov`);
    }
  }

  return [...new Set(queries)];
}
