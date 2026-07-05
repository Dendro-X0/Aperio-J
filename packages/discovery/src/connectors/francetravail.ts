import type { RawFeedItem } from "@aperio-j/core";
import { capItems, connectorMaxItems, joinBodyParts, parseIsoDate } from "./normalize.js";
import { loadConnectorFixture, useConnectorFixtures } from "./fixtures.js";
import { isFrenchCity, normalizeCityForApi } from "./geo.js";
import type { ConnectorDefinition, ConnectorQuery } from "./types.js";

const TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
const OAUTH_SCOPE = "api_offresdemploiv2 o2dsoffre";

interface FranceTravailCredentials {
  clientId: string;
  clientSecret: string;
}

interface FranceTravailOffer {
  id?: string;
  intitule?: string;
  description?: string;
  dateCreation?: string;
  salaire?: { libelle?: string };
  lieuTravail?: { libelle?: string; commune?: string };
  entreprise?: { nom?: string };
  origineOffre?: { urlOrigine?: string };
}

interface FranceTravailResponse {
  resultats?: FranceTravailOffer[];
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function francetravailCredentials(): FranceTravailCredentials | null {
  const clientId = process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function fetchFranceTravailToken(
  credentials: FranceTravailCredentials,
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: OAUTH_SCOPE,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`France Travail OAuth HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  const token = payload.access_token?.trim();
  if (!token) {
    throw new Error("France Travail OAuth token missing");
  }

  const ttlMs = Math.max(60, Number(payload.expires_in ?? 1500)) * 1000;
  cachedToken = { value: token, expiresAt: Date.now() + ttlMs - 30_000 };
  return token;
}

function francetravailJobUrl(offer: FranceTravailOffer): string | null {
  const direct = offer.origineOffre?.urlOrigine?.trim();
  if (direct) return direct;
  const id = offer.id?.trim();
  if (id) return `https://candidat.francetravail.fr/offres/recherche/detail/${id}`;
  return null;
}

export function normalizeFranceTravailResponse(
  payload: FranceTravailResponse,
  streamId: string,
): RawFeedItem[] {
  const fetchedAt = new Date().toISOString();
  const items: RawFeedItem[] = [];

  for (const offer of payload.resultats ?? []) {
    const title = offer.intitule?.trim();
    const url = francetravailJobUrl(offer);
    if (!title || !url) continue;

    const location =
      offer.lieuTravail?.libelle?.trim() ||
      offer.lieuTravail?.commune?.trim() ||
      null;

    items.push({
      title,
      body: joinBodyParts([
        offer.entreprise?.nom ? `Company: ${offer.entreprise.nom}` : null,
        location ? `Location: ${location}` : null,
        offer.salaire?.libelle ? `Salary: ${offer.salaire.libelle}` : null,
        offer.dateCreation ? `Posted: ${offer.dateCreation}` : null,
        offer.id ? `Ref: ${offer.id}` : null,
        offer.description,
      ]),
      url,
      sourceId: streamId,
      fetchedAt: offer.dateCreation ? parseIsoDate(offer.dateCreation) : fetchedAt,
    });
  }

  return capItems(items, connectorMaxItems());
}

async function fetchFranceTravailLive(query: ConnectorQuery): Promise<FranceTravailResponse> {
  const credentials = francetravailCredentials();
  if (!credentials) {
    throw new Error(
      "France Travail credentials missing (APERO_J_FRANCE_TRAVAIL_CLIENT_ID / APERO_J_FRANCE_TRAVAIL_CLIENT_SECRET)",
    );
  }

  const token = await fetchFranceTravailToken(credentials);
  const url = new URL(SEARCH_URL);
  url.searchParams.set("motsCles", query.search.trim() || "développeur");
  url.searchParams.set("commune", normalizeCityForApi(query.city));
  url.searchParams.set("range", `0-${Math.min(49, connectorMaxItems() - 1)}`);

  const response = await fetch(url.href, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`France Travail API HTTP ${response.status}`);
  }

  return (await response.json()) as FranceTravailResponse;
}

async function fetchFranceTravail(
  query: ConnectorQuery,
  streamId: string,
): Promise<RawFeedItem[]> {
  const payload = useConnectorFixtures()
    ? ((await loadConnectorFixture("francetravail-fr")) as FranceTravailResponse)
    : await fetchFranceTravailLive(query);

  return normalizeFranceTravailResponse(payload, streamId);
}

export const francetravailConnector: ConnectorDefinition = {
  id: "francetravail",
  label: "France Travail (API)",

  supports(profile) {
    const city = profile.constraints.primaryCity.trim();
    if (!city || !isFrenchCity(city)) return false;
    return Boolean(francetravailCredentials()) || useConnectorFixtures();
  },

  buildQuery(profile) {
    if (!this.supports(profile)) return null;
    const search =
      profile.intent.desiredRoles.join(" ").trim() ||
      profile.intent.desiredRoles[0]?.trim() ||
      "développeur";
    return {
      id: "francetravail",
      search,
      city: profile.constraints.primaryCity.trim(),
      country: "fr",
      remotePreference: profile.constraints.remotePreference,
    };
  },

  fetch: fetchFranceTravail,
};

/** Test helper — reset cached OAuth token between runs. */
export function resetFranceTravailTokenCache(): void {
  cachedToken = null;
}
