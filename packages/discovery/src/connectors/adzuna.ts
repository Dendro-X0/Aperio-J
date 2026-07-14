import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isAdzunaCountrySupported, normalizeCityForApi, resolveAdzunaCountry } from "./geo.js";
import { isMeaningfulSalaryAmount } from "../salary-format.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const ADZUNA_API = "https://api.adzuna.com/v1/api/jobs";

interface AdzunaJob {
  id?: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  location?: { display_name?: string };
  company?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  contract_time?: string;
}

interface AdzunaResponse {
  results?: AdzunaJob[];
}

function adzunaCredentials(): { appId: string; appKey: string } | null {
  const appId = process.env.APERO_J_ADZUNA_APP_ID?.trim();
  const appKey = process.env.APERO_J_ADZUNA_APP_KEY?.trim();
  if (!appId || !appKey) return null;
  return { appId, appKey };
}

function formatSalary(min?: number, max?: number): string | null {
  const minOk = isMeaningfulSalaryAmount(min);
  const maxOk = isMeaningfulSalaryAmount(max);
  if (!minOk && !maxOk) return null;
  if (minOk && maxOk) return `Salary: ${min} – ${max}`;
  if (minOk) return `Salary from: ${min}`;
  return `Salary up to: ${max}`;
}

export function normalizeAdzunaResponse(payload: AdzunaResponse, streamId: string): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.results ?? []) {
    const title = job.title?.trim();
    const url = job.redirect_url?.trim();
    if (!title || !url) continue;

    items.push({
      title,
      body: joinBodyParts([
        job.company?.display_name ? `Company: ${job.company.display_name}` : null,
        job.location?.display_name ? `Location: ${job.location.display_name}` : null,
        formatSalary(job.salary_min, job.salary_max),
        job.contract_type ? `Contract: ${job.contract_type}` : null,
        job.contract_time ? `Time: ${job.contract_time}` : null,
        job.description,
      ]),
      url,
      sourceId: streamId,
      fetchedAt: job.created ? parseIsoDate(job.created) : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchAdzunaLive(query: ConnectorQuery): Promise<AdzunaResponse> {
  const credentials = adzunaCredentials();
  if (!credentials) {
    throw new Error("Adzuna API credentials missing (APERO_J_ADZUNA_APP_ID / APERO_J_ADZUNA_APP_KEY)");
  }

  const country = query.country ?? "de";
  const url = new URL(`${ADZUNA_API}/${country}/search/1`);
  url.searchParams.set("app_id", credentials.appId);
  url.searchParams.set("app_key", credentials.appKey);
  url.searchParams.set("results_per_page", String(Math.min(50, connectorMaxItems())));
  url.searchParams.set("what", query.search);
  url.searchParams.set("where", normalizeCityForApi(query.city));
  url.searchParams.set("max_days_old", "14");
  url.searchParams.set("content-type", "application/json");

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      "User-Agent": "aperio-j/0.3 (+connector; https://github.com/aperio-j)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Adzuna API HTTP ${response.status} for ${country}`);
  }

  return (await response.json()) as AdzunaResponse;
}

async function fetchAdzuna(query: ConnectorQuery, streamId: string): Promise<RawFeedItem[]> {
  const country = query.country ?? "de";
  const fixtureName = country === "de" ? "adzuna-de" : `adzuna-${country}`;
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture(fixtureName).catch(() =>
        loadConnectorFixture("adzuna-de"),
      )) as AdzunaResponse)
    : await fetchAdzunaLive(query);

  return normalizeAdzunaResponse(payload, streamId);
}

export const adzunaConnector: ConnectorDefinition = {
  id: "adzuna",
  label: "Adzuna API",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city) return false;
    const country = resolveAdzunaCountry(city);
    if (!country || !isAdzunaCountrySupported(country)) return false;
    return Boolean(adzunaCredentials()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const city = profile.constraints.primaryCity.trim();
    const country = resolveAdzunaCountry(city);
    if (!country) return null;
    const search = profile.intent.desiredRoles.join(" ").trim() || "software developer";
    return {
      id: "adzuna",
      search,
      city,
      country,
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchAdzuna,
};
