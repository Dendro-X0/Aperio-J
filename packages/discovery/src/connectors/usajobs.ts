import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isUsCity, normalizeCityForApi } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const USAJOBS_API = "https://data.usajobs.gov/api/search";

interface UsaJobsRemuneration {
  MinimumRange?: string;
  MaximumRange?: string;
  RateIntervalCode?: string;
}

interface UsaJobsDescriptor {
  PositionTitle?: string;
  OrganizationName?: string;
  PositionLocationDisplay?: string;
  PositionURI?: string;
  QualificationSummary?: string;
  PublicationStartDate?: string;
  PositionRemuneration?: UsaJobsRemuneration[];
}

interface UsaJobsItem {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: UsaJobsDescriptor;
}

interface UsaJobsResponse {
  SearchResult?: {
    SearchResultItems?: UsaJobsItem[];
  };
}

function usajobsCredentials(): { apiKey: string; email: string } | null {
  const apiKey = process.env.APERO_J_USAJOBS_API_KEY?.trim();
  const email = process.env.APERO_J_USAJOBS_EMAIL?.trim();
  if (!apiKey || !email) return null;
  return { apiKey, email };
}

function formatUsaJobsSalary(remuneration?: UsaJobsRemuneration[]): string | null {
  const row = remuneration?.[0];
  if (!row) return null;
  const min = row.MinimumRange?.trim();
  const max = row.MaximumRange?.trim();
  const interval = row.RateIntervalCode?.trim();
  const suffix = interval ? ` (${interval})` : "";
  if (min && max) return `Salary: ${min} – ${max}${suffix}`;
  if (min) return `Salary: from ${min}${suffix}`;
  if (max) return `Salary: up to ${max}${suffix}`;
  return null;
}

export function normalizeUsajobsResponse(payload: UsaJobsResponse, streamId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const row of payload.SearchResult?.SearchResultItems ?? []) {
    const descriptor = row.MatchedObjectDescriptor;
    const title = descriptor?.PositionTitle?.trim();
    const url = descriptor?.PositionURI?.trim();
    if (!title || !url || !descriptor) continue;

    items.push({
      title,
      body: joinBodyParts([
        descriptor.OrganizationName ? `Company: ${descriptor.OrganizationName}` : null,
        descriptor.PositionLocationDisplay
          ? `Location: ${descriptor.PositionLocationDisplay}`
          : null,
        formatUsaJobsSalary(descriptor.PositionRemuneration),
        descriptor.PublicationStartDate ? `Posted: ${descriptor.PublicationStartDate}` : null,
        row.MatchedObjectId ? `Ref: ${row.MatchedObjectId}` : null,
        descriptor.QualificationSummary,
      ]),
      url,
      sourceId: streamId,
      fetchedAt: descriptor.PublicationStartDate
        ? parseIsoDate(descriptor.PublicationStartDate)
        : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchUsajobsLive(query: ConnectorQuery): Promise<UsaJobsResponse> {
  const credentials = usajobsCredentials();
  if (!credentials) {
    throw new Error(
      "USAJobs API credentials missing (APERO_J_USAJOBS_API_KEY / APERO_J_USAJOBS_EMAIL)",
    );
  }

  const url = new URL(USAJOBS_API);
  url.searchParams.set("Keyword", query.search.trim() || "software developer");
  url.searchParams.set("LocationName", normalizeCityForApi(query.city));
  url.searchParams.set("ResultsPerPage", String(Math.min(50, connectorMaxItems())));

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      Host: "data.usajobs.gov",
      "User-Agent": credentials.email,
      "Authorization-Key": credentials.apiKey,
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`USAJobs API HTTP ${response.status}`);
  }

  return (await response.json()) as UsaJobsResponse;
}

async function fetchUsajobs(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("usajobs-us")) as UsaJobsResponse)
    : await fetchUsajobsLive(query);

  return normalizeUsajobsResponse(payload, streamId);
}

export const usajobsConnector: ConnectorDefinition = {
  id: "usajobs",
  label: "USAJobs (API)",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city || !isUsCity(city)) return false;
    return Boolean(usajobsCredentials()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "software developer";
    return {
      id: "usajobs",
      search,
      city: profile.constraints.primaryCity.trim(),
      country: "us",
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchUsajobs,
};
