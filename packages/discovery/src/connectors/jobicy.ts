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
import { resolveJobicyGeo } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const JOBICY_API = "https://jobicy.com/api/v2/remote-jobs";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

interface JobicyJob {
  id?: number;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

function formatJobicySalary(job: JobicyJob): string | null {
  const min = job.annualSalaryMin ?? job.salaryMin;
  const max = job.annualSalaryMax ?? job.salaryMax;
  if (min == null && max == null) return null;
  const currency = job.salaryCurrency ?? "USD";
  if (min != null && max != null) {
    return `Salary: ${currency} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }
  if (min != null) return `Salary: from ${currency} ${min.toLocaleString()}`;
  return `Salary: up to ${currency} ${max!.toLocaleString()}`;
}

function normalizeJobicyJob(
  job: JobicyJob,
  streamId: string,
  fetchedAt: string,
): RawFeedItem | null {
  const title = job.jobTitle?.trim();
  const url = job.url?.trim();
  if (!title || !url) return null;

  return {
    title,
    body: joinBodyParts([
      job.companyName ? `Company: ${job.companyName}` : null,
      job.jobGeo ? `Location: ${job.jobGeo}` : "Location: Remote",
      job.jobType?.length ? `Type: ${job.jobType.join(", ")}` : null,
      job.jobLevel && job.jobLevel !== "Any" ? `Level: ${job.jobLevel}` : null,
      job.jobIndustry?.length ? `Industry: ${job.jobIndustry.join(", ")}` : null,
      formatJobicySalary(job),
      job.jobExcerpt,
      job.jobDescription,
    ]),
    url,
    sourceId: streamId,
    fetchedAt: job.pubDate ? parseIsoDate(job.pubDate) : fetchedAt,
  };
}

export function normalizeJobicyResponse(
  payload: JobicyResponse,
  streamId: string,
  query?: Pick<ConnectorQuery, "search">,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const search = query?.search?.trim();

  function collect(filterBySearch: boolean): RawFeedItem[] {
    const items: RawFeedItem[] = [];

    for (const job of payload.jobs ?? []) {
      const haystack = [job.jobTitle, job.companyName, job.jobExcerpt, job.jobDescription]
        .filter(Boolean)
        .join(" ");
      if (filterBySearch && search && !matchesConnectorSearch(haystack, search)) continue;

      const item = normalizeJobicyJob(job, streamId, fetchedAt);
      if (item) items.push(item);
    }

    return items;
  }

  const filtered = search ? collect(true) : collect(false);
  const items = withConnectorSearchFallback(filtered, search ? collect(false) : filtered);

  return capItems(items, connectorMaxItems());
}

async function fetchJobicyLive(query: ConnectorQuery): Promise<JobicyResponse> {
  const url = new URL(JOBICY_API);
  url.searchParams.set("count", String(Math.min(100, connectorMaxItems())));
  url.searchParams.set("tag", query.search.trim() || "developer");

  const geo = query.geo ?? resolveJobicyGeo(query.city);
  if (geo) {
    url.searchParams.set("geo", geo);
  }

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Jobicy API HTTP ${response.status}`);
  }

  return (await response.json()) as JobicyResponse;
}

async function fetchJobicy(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("jobicy")) as JobicyResponse)
    : await fetchJobicyLive(query);

  return normalizeJobicyResponse(payload, streamId, query);
}

export const jobicyConnector: ConnectorDefinition = {
  id: "jobicy",
  label: "Jobicy API",

  supports(profile) {
    return profile.constraints.remotePreference !== "onsite-only";
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const city = profile.constraints.primaryCity.trim();
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "developer";
    const geo = resolveJobicyGeo(city) ?? undefined;
    return {
      id: "jobicy",
      search,
      city,
      geo,
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchJobicy,
};
