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
import { resolveAdzunaCountry } from "./geo.js";
import { formatSalaryRange } from "../salary-format.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const HIMALAYAS_SEARCH_API = "https://himalayas.app/jobs/api/search";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

interface HimalayasJob {
  title?: string;
  excerpt?: string;
  companyName?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  salaryPeriod?: string;
  currency?: string;
  seniority?: string[];
  locationRestrictions?: string[];
  description?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
}

interface HimalayasResponse {
  jobs?: HimalayasJob[];
}

function himalayasJobUrl(job: HimalayasJob): string | null {
  return job.applicationLink?.trim() || job.guid?.trim() || null;
}

function normalizeHimalayasJob(
  job: HimalayasJob,
  streamId: string,
  fetchedAt: string,
): RawFeedItem | null {
  const title = job.title?.trim();
  const url = himalayasJobUrl(job);
  if (!title || !url) return null;

  const location =
    job.locationRestrictions?.length === 1
      ? job.locationRestrictions[0]
      : job.locationRestrictions?.length
        ? job.locationRestrictions.join(", ")
        : "Remote";

  return {
    title,
    body: joinBodyParts([
      job.companyName ? `Company: ${job.companyName}` : null,
      location ? `Location: ${location}` : null,
      job.employmentType ? `Type: ${job.employmentType}` : null,
      job.seniority?.length ? `Seniority: ${job.seniority.join(", ")}` : null,
      formatSalaryRange(job.minSalary, job.maxSalary, {
        currency: job.currency ?? "USD",
        prefix: `Salary${job.salaryPeriod ? ` (${job.salaryPeriod})` : ""}`,
      }),
      job.excerpt,
      job.description,
    ]),
    url,
    sourceId: streamId,
    fetchedAt: job.pubDate ? parseIsoDate(job.pubDate) : fetchedAt,
  };
}

export function normalizeHimalayasResponse(
  payload: HimalayasResponse,
  streamId: string,
  query?: Pick<ConnectorQuery, "search">,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const search = query?.search?.trim();

  function collect(filterBySearch: boolean): RawFeedItem[] {
    const items: RawFeedItem[] = [];

    for (const job of payload.jobs ?? []) {
      const haystack = [job.title, job.companyName, job.excerpt, job.description]
        .filter(Boolean)
        .join(" ");
      if (filterBySearch && search && !matchesConnectorSearch(haystack, search)) continue;

      const item = normalizeHimalayasJob(job, streamId, fetchedAt);
      if (item) items.push(item);
    }

    return items;
  }

  const filtered = search ? collect(true) : collect(false);
  const items = withConnectorSearchFallback(filtered, search ? collect(false) : filtered);

  return capItems(items, connectorMaxItems());
}

async function fetchHimalayasLive(query: ConnectorQuery): Promise<HimalayasResponse> {
  const url = new URL(HIMALAYAS_SEARCH_API);
  url.searchParams.set("q", query.search.trim() || "developer");
  url.searchParams.set("limit", String(Math.min(20, connectorMaxItems())));
  url.searchParams.set("page", "1");
  url.searchParams.set("sort", "recent");

  const country = query.country ?? resolveAdzunaCountry(query.city);
  if (country) {
    url.searchParams.set("country", country);
  }

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Himalayas API HTTP ${response.status}`);
  }

  return (await response.json()) as HimalayasResponse;
}

async function fetchHimalayas(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("himalayas")) as HimalayasResponse)
    : await fetchHimalayasLive(query);

  return normalizeHimalayasResponse(payload, streamId, query);
}

export const himalayasConnector: ConnectorDefinition = {
  id: "himalayas",
  label: "Himalayas API",

  supports(profile) {
    return profile.constraints.remotePreference !== "onsite-only";
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "developer";
    const city = profile.constraints.primaryCity.trim();
    const country = resolveAdzunaCountry(city) ?? undefined;
    return {
      id: "himalayas",
      search,
      city,
      country,
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchHimalayas,
};
