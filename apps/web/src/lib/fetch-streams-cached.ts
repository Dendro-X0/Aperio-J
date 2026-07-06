import type { RawFeedItem } from "@aperio-j/core";
import {
  fetchAllStreams,
  fetchStream,
  type StreamConfig,
  type StreamFetchResult,
} from "@aperio-j/discovery/fetch-streams";
import {
  hostBlockedRemainingMs,
  isHostFetchBlocked,
  recordHostFetchBlocked,
  recordHostFetchSuccess,
  waitForHostFetchSlot,
} from "@aperio-j/discovery/fetch-host-guard";
import { isWafBlockedHtml } from "@aperio-j/discovery/waf-detect";
import { dedupeRawFeedItems } from "@aperio-j/discovery/connectors/normalize";
import { loadCachedStreamFeed, saveCachedStreamFeed } from "./stream-feed-cache";

export interface CachedFetchSummary {
  cacheHits: number;
  hostSkips: number;
}

function isBlockedFetchResult(result: StreamFetchResult, htmlHint?: string): boolean {
  if (result.error && /429|403|too many|频繁|验证码/i.test(result.error)) return true;
  if (htmlHint && isWafBlockedHtml(htmlHint)) return true;
  if (result.items.length === 1) {
    const corpus = `${result.items[0]?.title ?? ""} ${result.items[0]?.body ?? ""}`;
    if (isWafBlockedHtml(corpus)) return true;
  }
  return false;
}

async function fetchStreamRespectingGuard(
  config: StreamConfig,
): Promise<StreamFetchResult> {
  if (isHostFetchBlocked(config.url)) {
    return {
      streamId: config.id,
      label: config.label,
      kind: config.kind,
      items: [],
      error: `host cooldown (${Math.ceil(hostBlockedRemainingMs(config.url) / 1000)}s)`,
    };
  }

  await waitForHostFetchSlot(config.url);
  const result = await fetchStream(config);
  recordHostFetchSuccess(config.url);

  if (isBlockedFetchResult(result)) {
    recordHostFetchBlocked(config.url);
  }

  return result;
}

export async function fetchAllStreamsWithCache(
  profileId: string,
  streams: StreamConfig[],
  options?: { forceRefresh?: boolean },
): Promise<{
  items: RawFeedItem[];
  errors: string[];
  results: StreamFetchResult[];
  cacheSummary: CachedFetchSummary;
}> {
  const forceRefresh = options?.forceRefresh === true;
  const items: RawFeedItem[] = [];
  const errors: string[] = [];
  const results: StreamFetchResult[] = [];
  const cacheSummary: CachedFetchSummary = { cacheHits: 0, hostSkips: 0 };

  const concurrency = Math.max(1, Number(process.env.APERO_J_STREAM_FETCH_CONCURRENCY ?? 4));

  for (let index = 0; index < streams.length; index += concurrency) {
    const batch = streams.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (stream) => {
        if (!forceRefresh) {
          const cached = await loadCachedStreamFeed(profileId, stream.id);
          if (cached) {
            cacheSummary.cacheHits += 1;
            return {
              streamId: stream.id,
              label: stream.label,
              kind: stream.kind,
              items: cached.items,
            } satisfies StreamFetchResult;
          }
        }

        if (isHostFetchBlocked(stream.url)) {
          cacheSummary.hostSkips += 1;
          const cached = await loadCachedStreamFeed(profileId, stream.id);
          if (cached) {
            cacheSummary.cacheHits += 1;
            return {
              streamId: stream.id,
              label: stream.label,
              kind: stream.kind,
              items: cached.items,
            } satisfies StreamFetchResult;
          }

          return {
            streamId: stream.id,
            label: stream.label,
            kind: stream.kind,
            items: [],
            error: `host cooldown (${Math.ceil(hostBlockedRemainingMs(stream.url) / 1000)}s)`,
          } satisfies StreamFetchResult;
        }

        const result = await fetchStreamRespectingGuard(stream);
        if (result.items.length > 0 && !isBlockedFetchResult(result)) {
          await saveCachedStreamFeed(profileId, stream.id, result.items);
        } else if (result.items.length === 0 || isBlockedFetchResult(result)) {
          const cached = await loadCachedStreamFeed(profileId, stream.id);
          if (cached) {
            cacheSummary.cacheHits += 1;
            return {
              ...result,
              items: cached.items,
              error: undefined,
            };
          }
        }

        return result;
      }),
    );

    results.push(...batchResults);

    for (const result of batchResults) {
      items.push(...result.items);
      if (result.error && result.items.length === 0) {
        errors.push(`${result.label}: ${result.error}`);
      }
    }
  }

  return {
    items: dedupeRawFeedItems(items),
    errors,
    results,
    cacheSummary,
  };
}
