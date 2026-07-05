import type { RawFeedItem, RemotePreference } from "@aperio-j/core";
import {
  capItems,
  connectorMaxItems,
  joinBodyParts,
  matchesConnectorSearch,
  parseIsoDate,
  withConnectorSearchFallback,
} from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api";

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

function arbeitnowJobMatchesRemotePreference(
  job: ArbeitnowJob,
  remotePreference: RemotePreference,
): boolean {
  if (remotePreference === "remote-only") return job.remote === true;
  return true;
}

function normalizeArbeitnowJob(
  job: ArbeitnowJob,
  streamId: string,
  fetchedAt: string,
): RawFeedItem | null {
  const title = job.title?.trim();
  const url = job.url?.trim();
  if (!title || !url) return null;

  return {
    title,
    body: joinBodyParts([
      job.company_name ? `Company: ${job.company_name}` : null,
      job.remote && !job.location
        ? "Location: Remote"
        : job.location
          ? `Location: ${job.location}${job.remote ? " (remote)" : ""}`
          : null,
      job.job_types?.length ? `Type: ${job.job_types.join(", ")}` : null,
      job.tags?.length ? `Tags: ${job.tags.join(", ")}` : null,
      job.description,
    ]),
    url,
    sourceId: streamId,
    fetchedAt: job.created_at ? parseIsoDate(job.created_at) : fetchedAt,
  };
}

export function normalizeArbeitnowResponse(
  payload: ArbeitnowResponse,
  streamId: string,
  query?: Pick<ConnectorQuery, "search" | "remotePreference">,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const search = query?.search?.trim();

  function collect(filterBySearch: boolean): RawFeedItem[] {
    const items: RawFeedItem[] = [];

    for (const job of payload.data ?? []) {
      if (query?.remotePreference && !arbeitnowJobMatchesRemotePreference(job, query.remotePreference)) {
        continue;
      }

      const searchHaystack = [job.title, job.company_name, job.location, job.description]
        .filter(Boolean)
        .join(" ");
      if (filterBySearch && search && !matchesConnectorSearch(searchHaystack, search)) continue;

      const item = normalizeArbeitnowJob(job, streamId, fetchedAt);
      if (item) items.push(item);
    }

    return items;
  }

  const filtered = search ? collect(true) : collect(false);
  const items = withConnectorSearchFallback(filtered, search ? collect(false) : filtered);

  return capItems(items, connectorMaxItems());
}

async function fetchArbeitnowLive(): Promise<ArbeitnowResponse> {
  const response = await fetch(ARBEITNOW_API, {
    headers: {
      Accept: "application/json",
      "User-Agent": "aperio-j/0.3 (+connector; https://github.com/aperio-j)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Arbeitnow API HTTP ${response.status}`);
  }

  return (await response.json()) as ArbeitnowResponse;
}

async function fetchArbeitnow(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("arbeitnow")) as ArbeitnowResponse)
    : await fetchArbeitnowLive();

  return normalizeArbeitnowResponse(payload, streamId, query);
}

export const arbeitnowConnector: ConnectorDefinition = {
  id: "arbeitnow",
  label: "Arbeitnow API",

  supports(profile) {
    return profile.constraints.remotePreference !== "onsite-only";
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "developer";
    return {
      id: "arbeitnow",
      search,
      city: profile.constraints.primaryCity.trim(),
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchArbeitnow,
};
