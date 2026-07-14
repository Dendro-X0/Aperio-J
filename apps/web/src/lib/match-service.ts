import type { EngineLocale, MatchResult, Opportunity, RawFeedItem, SeekerProfile } from "@aperio-j/core";
import { resolveEngineLocale } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import { dedupeOpportunities } from "@aperio-j/discovery/dedupe-opportunities";
import { extractSourceSite } from "@aperio-j/discovery/contact-extract";
import { fetchAllStreamsWithCache } from "./fetch-streams-cached";
import type { StreamConfig } from "@aperio-j/discovery/fetch-streams";
import { filterCnFeedItemsForProfile } from "@aperio-j/discovery/cn-feed-quality";
import { filterRemoteTechFeedItemsForProfile } from "@aperio-j/discovery/remote-tech-feed-quality";
import { filterRemoteOpsFeedItemsForProfile } from "@aperio-j/discovery/remote-ops-feed-quality";
import { sanitizeRawFeedItems } from "@aperio-j/discovery/feed-text-quality";
import { shouldRunInitialScrapeDiscoveryForProfile, shouldRunScrapeDiscoveryForProfile } from "@aperio-j/discovery/discovery-fallback";
import { throwIfAborted } from "@aperio-j/discovery/discovery-abort";
import { isCnNetworkContext } from "@aperio-j/discovery/profile-network-context";
import { isChinaCityProfile, isCnLocalFirstOccupation, isCnRemoteFirstProfile, isCnFreelanceIntentProfile, isRemoteFirstProfile, isRemoteOpsProfile, isRemoteTechProfile } from "@aperio-j/probe";
import { localizeOpportunity, parseOpportunities } from "@aperio-j/discovery/parse-opportunity";
import { FIXTURE_FEED_ITEMS, partitionOpportunityMatches } from "@aperio-j/matcher";
import { findRelatedInboxItems } from "@/lib/related-inbox-items";
import {
  countEnabledStreams,
  discoverAndPersistStreams,
  listStreamRegistry,
  loadEnabledStreamConfigs,
  sanitizeCnRegistryStreams,
  sanitizeCnGovNoiseStreams,
  sanitizeCnGovStreamsForFactoryProfile,
  sanitizeMemoryDuplicateStreams,
  sanitizeCnRemoteFirstRegistryStreams,
  sanitizeRemoteBoardRegistryStreams,
  ensureCnCityRegistryStreams,
  ensureRemoteRegistryStreams,
  sanitizeRemoteStreamsForRoleFamily,
  ensureCnFreelanceRegistryStreams,
  ensureCnRemoteRegistryStreams,
} from "./source-registry";
import { applyStreamFetchResults, countHealthyStreams } from "./stream-health";
import {
  analyzeDiscoveryGapForProfile,
  applyMatchYieldLearning,
  runTargetedRediscovery,
} from "./stream-learning-service";
import {
  connectorSourceMeta,
  isConnectorStreamConfig,
  loadConnectorStreamConfigs,
  mergeStreamConfigsForProfile,
} from "./connector-service";
import { withProfileConnectorCredentials } from "./local-settings-store";
import {
  recordFetchMemoryFromResults,
  recordMatchMemoryFromResults,
} from "./discovery-memory-service";
import type { MatchPipelinePhase, MatchPipelineProgressOptions } from "./engine-phases";
import { loadMatchFeedbackContext } from "./feedback-service";

export interface OpportunitySourceMeta {
  id: string;
  label: string;
  seedUrl: string;
  kind: string;
  site: string;
}

export interface InboxItem {
  opportunity: Opportunity;
  match: MatchResult;
  source?: OpportunitySourceMeta;
}

interface StoredMatchResults {
  items: InboxItem[];
  excludedItems: InboxItem[];
}

function defaultContactHints(): Opportunity["contactHints"] {
  return { phones: [], emails: [], wechat: [], qq: [] };
}

function pickRicherText(primary: string, fallback: string): string {
  const a = primary.trim();
  const b = fallback.trim();
  if (!b) return a;
  if (!a) return b;
  return a.length >= b.length ? a : b;
}

function mergeContactHints(
  primary: Opportunity["contactHints"],
  fallback: Opportunity["contactHints"],
): Opportunity["contactHints"] {
  const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];
  return {
    phones: uniq([...primary.phones, ...fallback.phones]),
    emails: uniq([...primary.emails, ...fallback.emails]),
    wechat: uniq([...primary.wechat, ...fallback.wechat]),
    qq: uniq([...primary.qq, ...fallback.qq]),
  };
}

function mergeOpportunityRecords(stored: Opportunity, incoming: Opportunity): Opportunity {
  return normalizeOpportunity({
    ...incoming,
    ...stored,
    id: incoming.id || stored.id,
    title: pickRicherText(stored.title, incoming.title),
    body: pickRicherText(stored.body, incoming.body),
    url: incoming.url || stored.url,
    sourceId: incoming.sourceId || stored.sourceId,
    fetchedAt: pickRicherText(stored.fetchedAt, incoming.fetchedAt),
    sourceSite: stored.sourceSite ?? incoming.sourceSite,
    employerHint: stored.employerHint ?? incoming.employerHint,
    locationText: stored.locationText ?? incoming.locationText,
    employmentType:
      stored.employmentType !== "unknown" ? stored.employmentType : incoming.employmentType,
    posterType: stored.posterType !== "unknown" ? stored.posterType : incoming.posterType,
    roleCategories:
      stored.roleCategories.length > 0 ? stored.roleCategories : incoming.roleCategories,
    requiredSignals:
      stored.requiredSignals.length > 0 ? stored.requiredSignals : incoming.requiredSignals,
    redFlags: stored.redFlags.length > 0 ? stored.redFlags : incoming.redFlags,
    trustWarnings:
      stored.trustWarnings.length > 0 ? stored.trustWarnings : incoming.trustWarnings,
    contactHints: mergeContactHints(stored.contactHints, incoming.contactHints),
    taxonomyRefs:
      (stored.taxonomyRefs?.length ?? 0) > (incoming.taxonomyRefs?.length ?? 0)
        ? stored.taxonomyRefs
        : incoming.taxonomyRefs,
  });
}

async function hydrateOpportunitiesFromDb(
  opportunities: Opportunity[],
): Promise<Opportunity[]> {
  if (opportunities.length === 0) return [];

  const ids = opportunities.map((row) => row.id);
  const urls = opportunities.map((row) => row.url);
  const rows = await prisma.opportunityRecord.findMany({
    where: {
      OR: [{ id: { in: ids } }, { url: { in: urls } }],
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const byUrl = new Map(rows.map((row) => [row.url, row]));

  return opportunities.map((opportunity) => {
    const row = byId.get(opportunity.id) ?? byUrl.get(opportunity.url);
    if (!row) return normalizeOpportunity(opportunity);

    const fromDb = normalizeOpportunity(JSON.parse(row.parsedJson) as Opportunity);
    return mergeOpportunityRecords(fromDb, opportunity);
  });
}

function collectOpportunities(items: InboxItem[]): Opportunity[] {
  const byId = new Map<string, Opportunity>();
  for (const item of items) {
    byId.set(item.opportunity.id, normalizeOpportunity(item.opportunity));
  }
  return [...byId.values()];
}

function localizeOpportunities(
  opportunities: Opportunity[],
  locale: EngineLocale,
): Opportunity[] {
  return opportunities.map((opportunity) => localizeOpportunity(opportunity, locale));
}

function normalizeOpportunity(opportunity: Opportunity): Opportunity {
  return {
    ...opportunity,
    sourceSite: opportunity.sourceSite ?? extractSourceSite(opportunity.url),
    contactHints: opportunity.contactHints ?? defaultContactHints(),
    trustWarnings: opportunity.trustWarnings ?? [],
    taxonomyRefs: opportunity.taxonomyRefs ?? [],
  };
}

async function enrichInboxItems(
  profileId: string,
  items: InboxItem[],
  connectorByStreamId: Map<string, StreamConfig> = new Map(),
): Promise<InboxItem[]> {
  const streams = await listStreamRegistry(profileId);
  const byId = new Map(streams.map((row) => [row.id, row]));

  return items.map((item) => {
    const opportunity = normalizeOpportunity(item.opportunity);
    const stream = byId.get(opportunity.sourceId);

    if (stream) {
      let site = opportunity.sourceSite ?? "";
      try {
        site = new URL(stream.seedUrl).hostname.replace(/^www\./i, "");
      } catch {
        // keep opportunity site
      }

      return {
        ...item,
        opportunity,
        source: {
          id: stream.id,
          label: stream.label,
          seedUrl: stream.seedUrl,
          kind: stream.kind,
          site,
        },
      };
    }

    const connector = connectorByStreamId.get(opportunity.sourceId);
    if (connector && isConnectorStreamConfig(connector)) {
      return {
        ...item,
        opportunity,
        source: connectorSourceMeta(connector),
      };
    }

    const isCapture = opportunity.sourceId === "user-capture";

    return {
      ...item,
      opportunity,
      source: isCapture
        ? {
            id: "user-capture",
            label: "手动添加",
            seedUrl: opportunity.url,
            kind: "capture",
            site: opportunity.sourceSite ?? "capture",
          }
        : opportunity.sourceSite
          ? {
              id: opportunity.sourceId,
              label: opportunity.sourceSite,
              seedUrl: opportunity.url,
              kind: "unknown",
              site: opportunity.sourceSite,
            }
          : undefined,
    };
  });
}

export interface InboxPayload {
  profile: SeekerProfile;
  items: InboxItem[];
  excludedItems: InboxItem[];
  ranAt: string | null;
  opportunityCount: number;
  matchedCount: number;
  excludedCount: number;
  fetchErrors: string[];
  sourceDiscoveryErrors: string[];
  streamCount: number;
  usedFixtureFallback: boolean;
  cnCaptureFirst?: boolean;
  cnRemoteFirst?: boolean;
  cnNetworkContext?: boolean;
  remoteFirst?: boolean;
}

export async function upsertOpportunities(opportunities: Opportunity[]) {
  for (const opportunity of opportunities) {
    await prisma.opportunityRecord.upsert({
      where: { url: opportunity.url },
      create: {
        id: opportunity.id,
        title: opportunity.title,
        body: opportunity.body,
        url: opportunity.url,
        sourceId: opportunity.sourceId,
        fetchedAt: new Date(opportunity.fetchedAt),
        parsedJson: JSON.stringify(opportunity),
      },
      update: {
        title: opportunity.title,
        body: opportunity.body,
        sourceId: opportunity.sourceId,
        fetchedAt: new Date(opportunity.fetchedAt),
        parsedJson: JSON.stringify(opportunity),
      },
    });
  }
}

async function ensureStreamRegistry(
  profile: SeekerProfile,
  onPhase?: (phase: MatchPipelinePhase, detail?: string) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  const connectorCount = loadConnectorStreamConfigs(profile).length;
  const enabled = await countEnabledStreams(profile.id);
  const healthy = await countHealthyStreams(profile.id);

  if (
    !shouldRunInitialScrapeDiscoveryForProfile(profile, {
      connectorConfigCount: connectorCount,
      enabledRegistryCount: enabled,
      healthyRegistryCount: healthy,
    })
  ) {
    return [];
  }

  onPhase?.("discovering_sources");
  const manifest = await discoverAndPersistStreams(profile, { signal });
  return manifest.errors;
}

function parseStoredMatchResults(raw: string): StoredMatchResults {
  const parsed = JSON.parse(raw) as StoredMatchResults | InboxItem[];
  if (Array.isArray(parsed)) {
    return { items: parsed, excludedItems: [] };
  }
  return {
    items: parsed.items ?? [],
    excludedItems: parsed.excludedItems ?? [],
  };
}

export async function runMatchPipeline(
  profile: SeekerProfile,
  localeInput?: string,
  options?: MatchPipelineProgressOptions,
): Promise<InboxPayload> {
  const locale = resolveEngineLocale(localeInput);
  const emit = options?.onPhase;
  const signal = options?.signal;

  emit?.("preparing");
  throwIfAborted(signal);

  const cnRemoteFirst = isCnRemoteFirstProfile(
    profile.constraints.primaryCity,
    profile.constraints.acceptableCities,
    profile.constraints.remotePreference,
    profile,
  );
  const cnCaptureFirst =
    isChinaCityProfile(
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
    ) && !cnRemoteFirst;
  const cnNetworkContext = isCnNetworkContext(profile);

  if (cnRemoteFirst) {
    await sanitizeCnRemoteFirstRegistryStreams(profile.id);
  }
  if (cnRemoteFirst || isRemoteFirstProfile(profile)) {
    await ensureRemoteRegistryStreams(profile.id, profile);
    await sanitizeRemoteStreamsForRoleFamily(profile.id, profile);
  }
  if (isCnFreelanceIntentProfile(profile)) {
    await ensureCnFreelanceRegistryStreams(profile.id, profile);
  } else if (cnCaptureFirst) {
    await sanitizeRemoteBoardRegistryStreams(profile.id);
    await sanitizeCnRegistryStreams(profile.id, profile.constraints.primaryCity);
    await sanitizeCnGovNoiseStreams(profile.id);
    if (isCnLocalFirstOccupation(profile)) {
      await sanitizeCnGovStreamsForFactoryProfile(profile.id);
    }
    await sanitizeMemoryDuplicateStreams(profile.id);
    await ensureCnCityRegistryStreams(
      profile.id,
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
      profile,
    );
  }

  const sourceDiscoveryErrors = await ensureStreamRegistry(profile, emit, signal);
  const registryConfigs = await loadEnabledStreamConfigs(profile.id);
  const connectorConfigs = loadConnectorStreamConfigs(profile);
  const connectorByStreamId = new Map(connectorConfigs.map((row) => [row.id, row]));
  const streamConfigs = mergeStreamConfigsForProfile(profile, registryConfigs);
  const registryStreamIds = new Set(registryConfigs.map((row) => row.id));
  const feedback = await loadMatchFeedbackContext(profile.id);

  let rssItems: RawFeedItem[] = [];
  let fetchErrors: string[] = [];
  let usedFeedCache = false;
  let usedFixtureFallback = false;

  if (streamConfigs.length > 0) {
    emit?.("scanning_feeds", String(streamConfigs.length));
    const fetched = await withProfileConnectorCredentials(profile.id, () =>
      fetchAllStreamsWithCache(profile.id, streamConfigs),
    );
    rssItems = fetched.items;
    fetchErrors = fetched.errors;
    usedFeedCache = fetched.cacheSummary.cacheHits > 0;
    if (fetched.cacheSummary.cacheHits > 0) {
      fetchErrors.push(
        `feed-cache: reused ${fetched.cacheSummary.cacheHits} stream(s) (site may be rate-limiting live fetch)`,
      );
    }

    const registryResults = fetched.results.filter((row) => registryStreamIds.has(row.streamId));
    if (registryResults.length > 0) {
      await applyStreamFetchResults(registryResults, { cnNetworkContext });
      await recordFetchMemoryFromResults(profile, registryResults);
    }

    const gap = await analyzeDiscoveryGapForProfile(profile);
    if (
      shouldRunScrapeDiscoveryForProfile(profile, rssItems.length) &&
      (gap.deadStreamCount > 0 || gap.needsLocalSources || gap.needsRoleFocusedSearch)
    ) {
      emit?.("discovering_sources");
      const targetedErrors = await runTargetedRediscovery(profile, gap);
      sourceDiscoveryErrors.push(...targetedErrors);
    }

    if (shouldRunScrapeDiscoveryForProfile(profile, rssItems.length)) {
      emit?.("discovering_sources");
      throwIfAborted(signal);
      const rediscoverErrors = (await discoverAndPersistStreams(profile, { signal })).errors;
      sourceDiscoveryErrors.push(...rediscoverErrors);

      const retryRegistryConfigs = await loadEnabledStreamConfigs(profile.id);
      const retryConfigs = mergeStreamConfigsForProfile(profile, retryRegistryConfigs);
      const retryRegistryIds = new Set(retryRegistryConfigs.map((row) => row.id));
      if (retryConfigs.length > 0) {
        emit?.("scanning_feeds", String(retryConfigs.length));
        const retry = await withProfileConnectorCredentials(profile.id, () =>
          fetchAllStreamsWithCache(profile.id, retryConfigs),
        );
        rssItems = retry.items;
        fetchErrors.push(...retry.errors);
        usedFeedCache = usedFeedCache || retry.cacheSummary.cacheHits > 0;
        const retryRegistryResults = retry.results.filter((row) =>
          retryRegistryIds.has(row.streamId),
        );
        if (retryRegistryResults.length > 0) {
          await applyStreamFetchResults(retryRegistryResults, { cnNetworkContext });
          await recordFetchMemoryFromResults(profile, retryRegistryResults);
        }
      }
    }
  }

  const allowFixtures =
    process.env.APERO_J_USE_FIXTURES === "true" ||
    process.env.NODE_ENV === "development";

  if (rssItems.length === 0 && allowFixtures) {
    rssItems = [...FIXTURE_FEED_ITEMS];
    usedFixtureFallback = true;
  }

  rssItems = sanitizeRawFeedItems(rssItems);

  if (cnCaptureFirst) {
    rssItems = filterCnFeedItemsForProfile(rssItems, profile);
  } else if (isRemoteOpsProfile(profile)) {
    rssItems = filterRemoteOpsFeedItemsForProfile(rssItems, profile);
  } else if (isRemoteTechProfile(profile)) {
    rssItems = filterRemoteTechFeedItemsForProfile(rssItems, profile);
  }

  emit?.("parsing_listings", String(rssItems.length));
  const parsedFromFeed = parseOpportunities(rssItems, { locale });

  const activeSourceIds = streamConfigs.map((stream) => stream.id);
  const storedRows =
    activeSourceIds.length > 0
      ? await prisma.opportunityRecord.findMany({
          where: { sourceId: { in: activeSourceIds } },
          orderBy: { fetchedAt: "desc" },
          take: 200,
        })
      : [];
  const storedOpportunities = storedRows.map((row) =>
    localizeOpportunity(
      normalizeOpportunity(JSON.parse(row.parsedJson) as Opportunity),
      locale,
    ),
  );

  const byId = new Map<string, Opportunity>();
  for (const opportunity of dedupeOpportunities([...parsedFromFeed, ...storedOpportunities])) {
    byId.set(opportunity.id, opportunity);
  }
  const opportunities = await hydrateOpportunitiesFromDb([...byId.values()]);

  await upsertOpportunities(parsedFromFeed);

  emit?.("matching", String(opportunities.length));
  const partition = partitionOpportunityMatches(opportunities, profile, {
    feedback,
    locale,
    limit: 200,
    excludedLimit: 50,
  });
  const items = await enrichInboxItems(profile.id, partition.matched, connectorByStreamId);
  const excludedItems = await enrichInboxItems(
    profile.id,
    partition.excluded,
    connectorByStreamId,
  );

  const matchedBySourceId = new Map<string, number>();
  for (const item of items) {
    const sourceId = item.source?.id;
    if (!sourceId) continue;
    matchedBySourceId.set(sourceId, (matchedBySourceId.get(sourceId) ?? 0) + 1);
  }
  await applyMatchYieldLearning(profile.id, matchedBySourceId);
  await recordMatchMemoryFromResults(profile, matchedBySourceId);

  const ranAt = new Date().toISOString();

  emit?.("saving");
  await prisma.matchRun.create({
    data: {
      seekerProfileId: profile.id,
      ranAt: new Date(ranAt),
      opportunityCount: opportunities.length,
      matchedCount: items.length,
      resultsJson: JSON.stringify({ items, excludedItems }),
    },
  });

  return {
    profile,
    items,
    excludedItems,
    ranAt,
    opportunityCount: opportunities.length,
    matchedCount: items.length,
    excludedCount: excludedItems.length,
    fetchErrors,
    sourceDiscoveryErrors,
    streamCount: streamConfigs.length,
    usedFixtureFallback,
    cnCaptureFirst,
    cnRemoteFirst,
    cnNetworkContext,
    remoteFirst: isRemoteFirstProfile(profile),
  };
}

export async function loadLatestInbox(
  profile: SeekerProfile,
  localeInput?: string,
): Promise<InboxPayload> {
  const locale = resolveEngineLocale(localeInput);

  const latestRun = await prisma.matchRun.findFirst({
    where: { seekerProfileId: profile.id },
    orderBy: { ranAt: "desc" },
  });

  if (!latestRun) {
    return runMatchPipeline(profile, locale);
  }

  const stored = parseStoredMatchResults(latestRun.resultsJson);
  const feedback = await loadMatchFeedbackContext(profile.id);
  const collected = collectOpportunities([...stored.items, ...stored.excludedItems]);
  const hydrated = await hydrateOpportunitiesFromDb(collected);
  const opportunities = localizeOpportunities(hydrated, locale);
  const partition = partitionOpportunityMatches(opportunities, profile, {
    feedback,
    locale,
    limit: 200,
    excludedLimit: 50,
  });
  const items = await enrichInboxItems(profile.id, partition.matched);
  const excludedItems = await enrichInboxItems(profile.id, partition.excluded);
  const streamCount = await countEnabledStreams(profile.id);

  return {
    profile,
    items,
    excludedItems,
    ranAt: latestRun.ranAt.toISOString(),
    opportunityCount: latestRun.opportunityCount,
    matchedCount: latestRun.matchedCount,
    excludedCount: excludedItems.length,
    fetchErrors: [],
    sourceDiscoveryErrors: [],
    streamCount,
    usedFixtureFallback: false,
    cnRemoteFirst: isCnRemoteFirstProfile(
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
      profile.constraints.remotePreference,
      profile,
    ),
    cnCaptureFirst:
      isChinaCityProfile(
        profile.constraints.primaryCity,
        profile.constraints.acceptableCities,
      ) &&
      !isCnRemoteFirstProfile(
        profile.constraints.primaryCity,
        profile.constraints.acceptableCities,
        profile.constraints.remotePreference,
        profile,
      ),
    remoteFirst: isRemoteFirstProfile(profile),
    cnNetworkContext: isCnNetworkContext(profile),
  };
}

export async function loadInboxItem(
  profile: SeekerProfile,
  opportunityId: string,
  localeInput?: string,
): Promise<{ item: InboxItem; excluded: boolean; related: InboxItem[] } | null> {
  const inbox = await loadLatestInbox(profile, localeInput);
  const allItems = [...inbox.items, ...inbox.excludedItems];
  const item = allItems.find((row) => row.opportunity.id === opportunityId);
  if (!item) return null;
  const excluded = inbox.excludedItems.some((row) => row.opportunity.id === opportunityId);
  const related = findRelatedInboxItems(item, inbox.items, { limit: 6 });
  return { item, excluded, related };
}

export async function refreshSourceDiscovery(profile: SeekerProfile) {
  return discoverAndPersistStreams(profile);
}
