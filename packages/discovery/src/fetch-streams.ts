import type { RawFeedItem, StreamKind } from "@aperio-j/core";
import { dedupeRawFeedItems } from "./connectors/normalize.js";
import { fetchConnector } from "./connectors/registry.js";
import type { ConnectorStreamConfig } from "./connectors/types.js";
import {
  classifyStreamFetchFailure,
  formatClassifiedStreamFetchError,
} from "./fetch-error-classify.js";
import type { StreamSessionAuth } from "./stream-auth.js";
import { fetchListPage } from "./list-page-fetch.js";
import { fetchRssFeed } from "./rss-fetch.js";
import { prepareCnStreamFetchUrl, shouldSuppressCnFetchError } from "./cn-sources.js";

export interface StreamConfig {
  id: string;
  label: string;
  url: string;
  kind: StreamKind;
  sessionAuth?: StreamSessionAuth;
  connectorId?: ConnectorStreamConfig["connectorId"];
  query?: ConnectorStreamConfig["query"];
  /** Profile city hint — used to filter CN aggregator navigation links. */
  regionHint?: string;
}

export interface StreamFetchResult {
  streamId: string;
  label: string;
  kind: StreamKind;
  items: RawFeedItem[];
  error?: string;
}

function isConnectorConfig(config: StreamConfig): config is ConnectorStreamConfig {
  return config.kind === "connector" && Boolean(config.connectorId && config.query);
}

export async function fetchStream(config: StreamConfig): Promise<StreamFetchResult> {
  try {
    const fetchUrl =
      config.regionHint?.trim() && config.kind === "list_page"
        ? prepareCnStreamFetchUrl(config.url, config.regionHint)
        : config.url;

    const items = isConnectorConfig(config)
      ? await fetchConnector(config)
      : config.kind === "list_page"
        ? await fetchListPage(
            fetchUrl,
            config.id,
            undefined,
            config.sessionAuth,
            config.regionHint ? [config.regionHint] : undefined,
          )
        : await fetchRssFeed(fetchUrl, config.id, config.sessionAuth);

    return {
      streamId: config.id,
      label: config.label,
      kind: config.kind,
      items,
    };
  } catch (error) {
    return {
      streamId: config.id,
      label: config.label,
      kind: config.kind,
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchAllStreams(
  streams: StreamConfig[],
): Promise<{ items: RawFeedItem[]; errors: string[]; results: StreamFetchResult[] }> {
  const items: RawFeedItem[] = [];
  const errors: string[] = [];
  const results: StreamFetchResult[] = [];
  const concurrency = Math.max(1, Number(process.env.APERO_J_STREAM_FETCH_CONCURRENCY ?? 4));

  for (let index = 0; index < streams.length; index += concurrency) {
    const batch = streams.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (stream) => {
        const result = await fetchStream(stream);
        return { stream, result };
      }),
    );
    results.push(...batchResults.map(({ result }) => result));

    for (const { stream, result } of batchResults) {
      items.push(...result.items);
      if (shouldSuppressCnFetchError(stream.url, result.items.length, result.error)) {
        continue;
      }
      if (result.error) {
        errors.push(
          formatClassifiedStreamFetchError(
            classifyStreamFetchFailure(result.label, result.error, stream),
          ),
        );
      } else if (result.items.length === 0) {
        errors.push(
          formatClassifiedStreamFetchError(
            classifyStreamFetchFailure(result.label, "0 items", stream),
          ),
        );
      }
    }
  }

  return { items: dedupeRawFeedItems(items), errors, results };
}
