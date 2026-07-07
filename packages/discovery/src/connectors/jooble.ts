import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { normalizeCityForApi, resolveAdzunaCountry } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const JOOBLE_API = "https://jooble.org/api";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";

interface JoobleJob {
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
  id?: number | string;
}

interface JoobleResponse {
  totalCount?: number;
  jobs?: JoobleJob[];
}

function joobleCredentials(): string | null {
  const apiKey = process.env.APERO_J_JOOBLE_API_KEY?.trim();
  return apiKey || null;
}

export function normalizeJoobleResponse(payload: JoobleResponse, streamId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.jobs ?? []) {
    const title = job.title?.trim();
    const url = job.link?.trim();
    if (!title || !url) continue;

    items.push({
      title,
      body: joinBodyParts([
        job.company ? `Company: ${job.company}` : null,
        job.location ? `Location: ${job.location}` : null,
        job.type ? `Type: ${job.type}` : null,
        job.salary ? `Salary: ${job.salary}` : null,
        job.source ? `Source: ${job.source}` : null,
        job.updated ? `Updated: ${job.updated}` : null,
        job.snippet,
      ]),
      url,
      sourceId: streamId,
      fetchedAt: job.updated ? parseIsoDate(job.updated) : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchJoobleLive(query: ConnectorQuery): Promise<JoobleResponse> {
  const apiKey = joobleCredentials();
  if (!apiKey) {
    throw new Error("Jooble API credentials missing (APERO_J_JOOBLE_API_KEY)");
  }

  const response = await fetch(`${JOOBLE_API}/${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      keywords: query.search.trim() || "developer",
      location: normalizeCityForApi(query.city),
      page: "1",
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Jooble API HTTP ${response.status}`);
  }

  return (await response.json()) as JoobleResponse;
}

async function fetchJooble(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const country = query.country ?? "de";
  const fixtureName = `jooble-${country}`;
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture(fixtureName).catch(() =>
        loadConnectorFixture("jooble-de"),
      )) as JoobleResponse)
    : await fetchJoobleLive(query);

  return normalizeJoobleResponse(payload, streamId);
}

export const joobleConnector: ConnectorDefinition = {
  id: "jooble",
  label: "Jooble API",
  experimental: true,

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city) return false;
    if (!resolveAdzunaCountry(city)) return false;
    return Boolean(joobleCredentials()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const city = profile.constraints.primaryCity.trim();
    const country = resolveAdzunaCountry(city);
    if (!country) return null;
    const search = profile.intent.desiredRoles.join(" ").trim() || "software developer";
    return {
      id: "jooble",
      search,
      city,
      country,
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchJooble,
};
