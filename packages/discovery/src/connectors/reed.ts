import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isUkCity, normalizeCityForApi } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const REED_API = "https://www.reed.co.uk/api/1.0/search";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

interface ReedJob {
  jobId?: number;
  jobTitle?: string;
  employerName?: string;
  locationName?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  currency?: string;
  jobDescription?: string;
  datePosted?: string;
  jobUrl?: string;
  externalUrl?: string;
}

interface ReedResponse {
  results?: ReedJob[];
}

function reedCredentials(): string | null {
  const apiKey = process.env.APERO_J_REED_API_KEY?.trim();
  return apiKey || null;
}

function reedJobUrl(job: ReedJob): string | null {
  return job.externalUrl?.trim() || job.jobUrl?.trim() || null;
}

function formatSalary(job: ReedJob): string | null {
  if (job.minimumSalary == null && job.maximumSalary == null) return null;
  const currency = job.currency ?? "GBP";
  if (job.minimumSalary != null && job.maximumSalary != null) {
    return `Salary: ${currency} ${job.minimumSalary.toLocaleString()} – ${job.maximumSalary.toLocaleString()}`;
  }
  if (job.minimumSalary != null) {
    return `Salary: from ${currency} ${job.minimumSalary.toLocaleString()}`;
  }
  return `Salary: up to ${currency} ${job.maximumSalary!.toLocaleString()}`;
}

export function normalizeReedResponse(payload: ReedResponse, streamId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.results ?? []) {
    const title = job.jobTitle?.trim();
    const url = reedJobUrl(job);
    if (!title || !url) continue;

    items.push({
      title,
      body: joinBodyParts([
        job.employerName ? `Company: ${job.employerName}` : null,
        job.locationName ? `Location: ${job.locationName}` : null,
        formatSalary(job),
        job.datePosted ? `Posted: ${job.datePosted}` : null,
        job.jobDescription,
      ]),
      url,
      sourceId: streamId,
      fetchedAt: job.datePosted ? parseIsoDate(job.datePosted) : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchReedLive(query: ConnectorQuery): Promise<ReedResponse> {
  const apiKey = reedCredentials();
  if (!apiKey) {
    throw new Error("Reed API credentials missing (APERO_J_REED_API_KEY)");
  }

  const url = new URL(REED_API);
  url.searchParams.set("keywords", query.search.trim() || "developer");
  url.searchParams.set("locationName", normalizeCityForApi(query.city));
  url.searchParams.set("resultsToTake", String(Math.min(100, connectorMaxItems())));

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Reed API HTTP ${response.status}`);
  }

  return (await response.json()) as ReedResponse;
}

async function fetchReed(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("reed-gb")) as ReedResponse)
    : await fetchReedLive(query);

  return normalizeReedResponse(payload, streamId);
}

export const reedConnector: ConnectorDefinition = {
  id: "reed",
  label: "Reed.co.uk (API)",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city || !isUkCity(city)) return false;
    return Boolean(reedCredentials()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "developer";
    return {
      id: "reed",
      search,
      city: profile.constraints.primaryCity.trim(),
      country: "gb",
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchReed,
};
