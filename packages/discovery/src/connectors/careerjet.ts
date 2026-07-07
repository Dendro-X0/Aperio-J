import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import {
  isCareerjetCountrySupported,
  normalizeCityForApi,
  resolveAdzunaCountry,
  resolveCareerjetLocale,
} from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const CAREERJET_API = "https://search.api.careerjet.net/v4/query";
const USER_AGENT = "aperio-j/0.3 (+connector; https://github.com/aperio-j)";
const DEFAULT_REFERER = "https://github.com/aperio-j/aperio-j";

interface CareerjetJob {
  title?: string;
  company?: string;
  locations?: string;
  description?: string;
  salary?: string;
  date?: string;
  url?: string;
  site?: string;
}

interface CareerjetResponse {
  type?: string;
  jobs?: CareerjetJob[];
  message?: string;
}

function careerjetCredentials(): string | null {
  const apiKey = process.env.APERO_J_CAREERJET_API_KEY?.trim();
  return apiKey || null;
}

function careerjetReferer(): string {
  return process.env.APERO_J_CAREERJET_REFERER?.trim() || DEFAULT_REFERER;
}

function careerjetUserIp(): string {
  return process.env.APERO_J_CONNECTOR_USER_IP?.trim() || "127.0.0.1";
}

export function normalizeCareerjetResponse(
  payload: CareerjetResponse,
  streamId: string,
): RawFeedItem[] {
  if (payload.type && payload.type !== "JOBS") {
    return [];
  }

  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.jobs ?? []) {
    const title = job.title?.trim();
    const url = job.url?.trim();
    if (!title || !url) continue;

    items.push({
      title,
      body: joinBodyParts([
        job.company ? `Company: ${job.company}` : null,
        job.locations ? `Location: ${job.locations}` : null,
        job.salary ? `Salary: ${job.salary}` : null,
        job.site ? `Source: ${job.site}` : null,
        job.date ? `Posted: ${job.date}` : null,
        job.description,
      ]),
      url,
      sourceId: streamId,
      fetchedAt: job.date ? parseIsoDate(job.date) : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchCareerjetLive(query: ConnectorQuery): Promise<CareerjetResponse> {
  const apiKey = careerjetCredentials();
  if (!apiKey) {
    throw new Error("Careerjet API credentials missing (APERO_J_CAREERJET_API_KEY)");
  }

  const country = query.country ?? "gb";
  const locale = resolveCareerjetLocale(country);
  if (!locale) {
    throw new Error(`Careerjet locale unsupported for country ${country}`);
  }

  const url = new URL(CAREERJET_API);
  url.searchParams.set("locale_code", locale);
  url.searchParams.set("keywords", query.search.trim() || "developer");
  url.searchParams.set("location", normalizeCityForApi(query.city));
  url.searchParams.set("sort", "date");
  url.searchParams.set("page_size", String(Math.min(100, connectorMaxItems())));
  url.searchParams.set("user_ip", careerjetUserIp());
  url.searchParams.set("user_agent", USER_AGENT);

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      Referer: careerjetReferer(),
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Careerjet API HTTP ${response.status}`);
  }

  return (await response.json()) as CareerjetResponse;
}

async function fetchCareerjet(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const country = query.country ?? "gb";
  const fixtureName = `careerjet-${country}`;
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture(fixtureName).catch(() =>
        loadConnectorFixture("careerjet-gb"),
      )) as CareerjetResponse)
    : await fetchCareerjetLive(query);

  return normalizeCareerjetResponse(payload, streamId);
}

export const careerjetConnector: ConnectorDefinition = {
  id: "careerjet",
  label: "Careerjet API",
  experimental: true,

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city) return false;
    const country = resolveAdzunaCountry(city);
    if (!country || !isCareerjetCountrySupported(country)) return false;
    return Boolean(careerjetCredentials()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const city = profile.constraints.primaryCity.trim();
    const country = resolveAdzunaCountry(city);
    if (!country) return null;
    const search = profile.intent.desiredRoles.join(" ").trim() || "software developer";
    return {
      id: "careerjet",
      search,
      city,
      country,
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchCareerjet,
};
