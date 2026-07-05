import type { RawFeedItem } from "@aperio-j/core";
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

const REMOTEOK_API = "https://remoteok.com/api";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

interface RemoteOkJob {
  legal?: string;
  slug?: string;
  id?: string;
  epoch?: number;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  apply_url?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
}

type RemoteOkResponse = RemoteOkJob[];

function remoteOkJobUrl(job: RemoteOkJob): string | null {
  const direct = job.url?.trim() || job.apply_url?.trim();
  if (direct) return direct;
  if (job.slug?.trim()) return `https://remoteok.com/remote-jobs/${job.slug.trim()}`;
  if (job.id?.trim()) return `https://remoteok.com/remote-jobs/${job.id.trim()}`;
  return null;
}

function formatSalary(min?: number, max?: number): string | null {
  if (typeof min === "number" && typeof max === "number") {
    return `Salary: $${min.toLocaleString()} - $${max.toLocaleString()}`;
  }
  if (typeof min === "number") return `Salary: from $${min.toLocaleString()}`;
  if (typeof max === "number") return `Salary: up to $${max.toLocaleString()}`;
  return null;
}

function isRemoteOkLegalNotice(row: RemoteOkJob): boolean {
  return Boolean(row.legal) || !row.position?.trim();
}

function normalizeRemoteOkJob(
  job: RemoteOkJob,
  streamId: string,
  fetchedAt: string,
): RawFeedItem | null {
  const title = job.position?.trim();
  const url = remoteOkJobUrl(job);
  if (!title || !url) return null;

  return {
    title,
    body: joinBodyParts([
      job.company ? `Company: ${job.company}` : null,
      job.location ? `Location: ${job.location.trim()}` : "Location: Remote",
      formatSalary(job.salary_min, job.salary_max),
      job.tags?.length ? `Tags: ${job.tags.slice(0, 8).join(", ")}` : null,
      job.description,
    ]),
    url,
    sourceId: streamId,
    fetchedAt: job.date ? parseIsoDate(job.date) : fetchedAt,
  };
}

export function normalizeRemoteOkResponse(
  payload: RemoteOkResponse,
  streamId: string,
  query?: Pick<ConnectorQuery, "search">,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const search = query?.search?.trim();

  function collect(filterBySearch: boolean): RawFeedItem[] {
    const items: RawFeedItem[] = [];

    for (const row of payload) {
      if (isRemoteOkLegalNotice(row)) continue;
      if (filterBySearch && search && !matchesConnectorSearch(row.position ?? "", search)) continue;

      const item = normalizeRemoteOkJob(row, streamId, fetchedAt);
      if (item) items.push(item);
    }

    return items;
  }

  const filtered = search ? collect(true) : collect(false);
  const items = withConnectorSearchFallback(filtered, search ? collect(false) : filtered);

  return capItems(items, connectorMaxItems());
}

async function fetchRemoteOkLive(): Promise<RemoteOkResponse> {
  const response = await fetch(REMOTEOK_API, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`RemoteOK API HTTP ${response.status}`);
  }

  return (await response.json()) as RemoteOkResponse;
}

async function fetchRemoteOk(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("remoteok")) as RemoteOkResponse)
    : await fetchRemoteOkLive();

  return normalizeRemoteOkResponse(payload, streamId, query);
}

export const remoteokConnector: ConnectorDefinition = {
  id: "remoteok",
  label: "RemoteOK API",

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
      id: "remoteok",
      search,
      city: profile.constraints.primaryCity.trim(),
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchRemoteOk,
};
