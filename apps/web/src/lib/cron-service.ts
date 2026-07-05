import type { SeekerProfile } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import { runMatchPipeline } from "./match-service";
import { loadConnectorStreamConfigs } from "./connector-service";
import { shouldRunInitialScrapeDiscovery } from "@aperio-j/discovery/discovery-fallback";
import { parseSeekerProfile } from "./profile-store";
import { countEnabledStreams, discoverAndPersistStreams } from "./source-registry";
import { countHealthyStreams } from "./stream-health";

const DEFAULT_MATCH_INTERVAL_HOURS = 6;
const DEFAULT_REDISCOVERY_DAYS = 7;

export interface CronRefreshOptions {
  /** Run source discovery even if interval not elapsed. */
  forceRediscover?: boolean;
  /** Run match pipeline even if interval not elapsed. */
  forceMatch?: boolean;
  /** Limit to one profile; omit for all completed profiles. */
  profileId?: string;
}

export interface CronProfileResult {
  profileId: string;
  primaryCity: string;
  skipped: boolean;
  skipReason?: string;
  rediscovered: boolean;
  matched: boolean;
  streamCount: number;
  opportunityCount: number;
  matchedCount: number;
  errors: string[];
}

export interface CronRefreshSummary {
  ranAt: string;
  profilesChecked: number;
  profilesRefreshed: number;
  results: CronProfileResult[];
}

function matchIntervalMs(): number {
  const hours = Number(process.env.APERO_J_CRON_MATCH_INTERVAL_HOURS ?? DEFAULT_MATCH_INTERVAL_HOURS);
  return Math.max(1, hours) * 60 * 60 * 1000;
}

function rediscoveryIntervalMs(): number {
  const days = Number(process.env.APERO_J_CRON_REDISCOVERY_DAYS ?? DEFAULT_REDISCOVERY_DAYS);
  return Math.max(1, days) * 24 * 60 * 60 * 1000;
}

export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

async function loadCompletedProfiles(profileId?: string) {
  return prisma.seekerProfileRecord.findMany({
    where: {
      onboardingComplete: true,
      ...(profileId ? { id: profileId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function shouldRediscoverSources(profileId: string): Promise<boolean> {
  const [enabled, healthy, deadCount, lastDiscovery] = await Promise.all([
    countEnabledStreams(profileId),
    countHealthyStreams(profileId),
    prisma.streamRegistryEntry.count({
      where: { seekerProfileId: profileId, health: "dead" },
    }),
    prisma.sourceDiscoveryRun.findFirst({
      where: { seekerProfileId: profileId },
      orderBy: { ranAt: "desc" },
    }),
  ]);

  if (enabled === 0 || healthy === 0) return true;
  if (deadCount > 0) return true;
  if (!lastDiscovery) return true;

  return Date.now() - lastDiscovery.ranAt.getTime() >= rediscoveryIntervalMs();
}

export async function shouldRefreshMatches(profileId: string): Promise<boolean> {
  const lastRun = await prisma.matchRun.findFirst({
    where: { seekerProfileId: profileId },
    orderBy: { ranAt: "desc" },
  });

  if (!lastRun) return true;
  return Date.now() - lastRun.ranAt.getTime() >= matchIntervalMs();
}

async function refreshProfile(
  profile: SeekerProfile,
  options: CronRefreshOptions,
): Promise<CronProfileResult> {
  const errors: string[] = [];
  let rediscovered = false;
  let matched = false;
  let streamCount = 0;
  let opportunityCount = 0;
  let matchedCount = 0;

  const needsRediscover = options.forceRediscover || (await shouldRediscoverSources(profile.id));
  const needsMatch = options.forceMatch || (await shouldRefreshMatches(profile.id));

  if (!needsRediscover && !needsMatch) {
    return {
      profileId: profile.id,
      primaryCity: profile.constraints.primaryCity,
      skipped: true,
      skipReason: "interval not elapsed",
      rediscovered: false,
      matched: false,
      streamCount: await countEnabledStreams(profile.id),
      opportunityCount: 0,
      matchedCount: 0,
      errors: [],
    };
  }

  if (needsRediscover) {
    const connectorCount = loadConnectorStreamConfigs(profile).length;
    const enabled = await countEnabledStreams(profile.id);
    const healthy = await countHealthyStreams(profile.id);
    if (
      shouldRunInitialScrapeDiscovery({
        connectorConfigCount: connectorCount,
        enabledRegistryCount: enabled,
        healthyRegistryCount: healthy,
      })
    ) {
      try {
        await discoverAndPersistStreams(profile);
        rediscovered = true;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "source discovery failed");
      }
    }
  }

  if (needsMatch || rediscovered) {
    try {
      const inbox = await runMatchPipeline(profile);
      matched = true;
      streamCount = inbox.streamCount;
      opportunityCount = inbox.opportunityCount;
      matchedCount = inbox.matchedCount;
      errors.push(...inbox.fetchErrors, ...inbox.sourceDiscoveryErrors);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "match pipeline failed");
    }
  }

  return {
    profileId: profile.id,
    primaryCity: profile.constraints.primaryCity,
    skipped: false,
    rediscovered,
    matched,
    streamCount,
    opportunityCount,
    matchedCount,
    errors,
  };
}

export async function runScheduledRefresh(
  options: CronRefreshOptions = {},
): Promise<CronRefreshSummary> {
  const records = await loadCompletedProfiles(options.profileId);

  if (options.profileId && records.length === 0) {
    throw new Error(`Profile not found or onboarding incomplete: ${options.profileId}`);
  }

  const results: CronProfileResult[] = [];

  for (const record of records) {
    const profile = parseSeekerProfile(record);
    results.push(await refreshProfile(profile, options));
  }

  const profilesRefreshed = results.filter((result) => !result.skipped).length;

  return {
    ranAt: new Date().toISOString(),
    profilesChecked: results.length,
    profilesRefreshed,
    results,
  };
}
