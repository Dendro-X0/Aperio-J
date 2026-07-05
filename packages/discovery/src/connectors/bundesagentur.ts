import type { RawFeedItem, RemotePreference } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isGermanCity, normalizeCityForApi } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const JOBSUCHE_API =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs";
const API_KEY = "jobboerse-jobsuche";

interface BundesagenturJob {
  refnr?: string;
  beruf?: string;
  arbeitgeber?: string;
  aktuelleVeroeffentlichungsdatum?: string;
  arbeitsort?: { ort?: string; plz?: number | string; land?: string };
  externeUrl?: string | null;
}

interface BundesagenturResponse {
  stellenangebote?: BundesagenturJob[];
}

function arbeitszeitForPreference(preference: RemotePreference): string {
  if (preference === "remote-only") return "ho";
  if (preference === "onsite-only") return "vz;tz";
  return "vz;tz;ho";
}

export function bundesagenturJobUrl(refnr: string, externeUrl?: string | null): string {
  if (externeUrl?.trim()) return externeUrl.trim();
  return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(refnr)}`;
}

export function normalizeBundesagenturResponse(
  payload: BundesagenturResponse,
  streamId: string,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const job of payload.stellenangebote ?? []) {
    const refnr = job.refnr?.trim();
    const title = job.beruf?.trim();
    if (!refnr || !title) continue;

    const locationParts = [
      job.arbeitsort?.ort,
      job.arbeitsort?.plz != null ? String(job.arbeitsort.plz) : null,
      job.arbeitsort?.land,
    ].filter(Boolean);

    items.push({
      title,
      body: joinBodyParts([
        job.arbeitgeber ? `Company: ${job.arbeitgeber}` : null,
        locationParts.length > 0 ? `Location: ${locationParts.join(", ")}` : null,
        job.aktuelleVeroeffentlichungsdatum
          ? `Posted: ${job.aktuelleVeroeffentlichungsdatum}`
          : null,
        `Ref: ${refnr}`,
      ]),
      url: bundesagenturJobUrl(refnr, job.externeUrl),
      sourceId: streamId,
      fetchedAt: job.aktuelleVeroeffentlichungsdatum
        ? parseIsoDate(job.aktuelleVeroeffentlichungsdatum)
        : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchBundesagenturLive(query: ConnectorQuery): Promise<BundesagenturResponse> {
  const url = new URL(JOBSUCHE_API);
  url.searchParams.set("angebotsart", "1");
  url.searchParams.set("was", query.search);
  url.searchParams.set("wo", normalizeCityForApi(query.city));
  url.searchParams.set("umkreis", "50");
  url.searchParams.set("page", "1");
  url.searchParams.set("size", String(Math.min(100, connectorMaxItems())));
  url.searchParams.set("pav", "false");
  url.searchParams.set("veroeffentlichtseit", "30");
  url.searchParams.set("arbeitszeit", arbeitszeitForPreference(query.remotePreference));

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      "X-API-Key": API_KEY,
      "User-Agent": "aperio-j/0.3 (+connector; https://github.com/aperio-j)",
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`Bundesagentur API HTTP ${response.status}`);
  }

  return (await response.json()) as BundesagenturResponse;
}

async function fetchBundesagentur(
  query: ConnectorQuery,
  streamId: string,
): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("bundesagentur-de")) as BundesagenturResponse)
    : await fetchBundesagenturLive(query);

  return normalizeBundesagenturResponse(payload, streamId);
}

export const bundesagenturConnector: ConnectorDefinition = {
  id: "bundesagentur",
  label: "Bundesagentur für Arbeit (API)",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city) return false;
    return isGermanCity(city);
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search = profile.intent.desiredRoles.join(" ").trim() || "Softwareentwickler";
    return {
      id: "bundesagentur",
      search,
      city: profile.constraints.primaryCity.trim(),
      country: "de",
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchBundesagentur,
};
