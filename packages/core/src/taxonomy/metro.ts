import catalog from "../catalogs/metros.json" with { type: "json" };
import type { MetroCatalog, MetroEntry, MetroSearchResult } from "./metro-types.js";

const metroCatalog = catalog as MetroCatalog;

let metroByIdCache: Map<string, MetroEntry> | null = null;
let metroByTermCache: Map<string, MetroEntry> | null = null;

const OFFLINE_METRO_SYNONYMS: Record<string, string> = {
  nyc: "new york",
  "new york city": "new york",
  "bay area": "san francisco",
  "san francisco bay area": "san francisco",
  sfba: "san francisco",
  dc: "washington",
  "d c": "washington",
  "washington dc": "washington",
  "washington d c": "washington",
  gta: "toronto",
  "greater toronto area": "toronto",
  la: "los angeles",
  "los angeles metro": "los angeles",
};

export const ADZUNA_SUPPORTED_COUNTRIES = new Set([
  "de",
  "gb",
  "us",
  "au",
  "at",
  "be",
  "br",
  "ca",
  "ch",
  "es",
  "fr",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "sg",
  "za",
]);

function normalizeMetroInput(value: string): string {
  return value
    .trim()
    .replace(/市$/u, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function metroResolutionVariants(value: string): string[] {
  const variants = new Set<string>();

  function addVariant(candidate: string): void {
    const normalized = normalizeMetroInput(candidate);
    if (normalized) variants.add(normalized);
  }

  addVariant(value);

  const withoutParens = value.replace(/\([^)]*\)/g, " ");
  addVariant(withoutParens);

  const commaHead = withoutParens.split(",")[0] ?? "";
  addVariant(commaHead);

  const withoutAdministrativeSuffix = commaHead.replace(
    /\b(city|metro|metropolitan area|municipality|region|prefecture|province|state|district)\b/gi,
    " ",
  );
  addVariant(withoutAdministrativeSuffix);

  const suffixSynonym = OFFLINE_METRO_SYNONYMS[withoutAdministrativeSuffix];
  if (suffixSynonym) addVariant(suffixSynonym);

  const commaSynonym = OFFLINE_METRO_SYNONYMS[commaHead];
  if (commaSynonym) addVariant(commaSynonym);

  const normalizedSynonym = OFFLINE_METRO_SYNONYMS[normalizeMetroInput(value)];
  if (normalizedSynonym) addVariant(normalizedSynonym);

  return [...variants];
}

function buildMetroIndexes(): void {
  if (metroByIdCache && metroByTermCache) return;

  metroByIdCache = new Map();
  metroByTermCache = new Map();

  for (const metro of metroCatalog.metros) {
    metroByIdCache.set(metro.id, metro);

    const terms = new Set<string>();
    for (const label of Object.values(metro.labels)) {
      const normalized = normalizeMetroInput(label);
      if (normalized) terms.add(normalized);
    }
    for (const term of metro.matchTerms) {
      const normalized = normalizeMetroInput(term);
      if (normalized) terms.add(normalized);
    }

    for (const term of terms) {
      if (!metroByTermCache.has(term)) {
        metroByTermCache.set(term, metro);
      }
    }
  }
}

export function getMetroCatalog(): MetroCatalog {
  return metroCatalog;
}

export function getMetroEntries(): MetroEntry[] {
  return metroCatalog.metros;
}

export function getMetroById(id: string): MetroEntry | undefined {
  buildMetroIndexes();
  return metroByIdCache!.get(id);
}

/** Resolve a stored or user-entered city string to a metro catalog entry. */
export function resolveMetro(cityName: string): MetroEntry | undefined {
  buildMetroIndexes();
  for (const variant of metroResolutionVariants(cityName)) {
    const match = metroByTermCache!.get(variant);
    if (match) return match;
  }
  return undefined;
}

export function metroDisplayLabel(metro: MetroEntry, locale = "en"): string {
  return metro.labels[locale] ?? metro.labels.en ?? metro.slug;
}

export function metroMatchTerms(metro: MetroEntry): string[] {
  const terms = new Set<string>();
  for (const label of Object.values(metro.labels)) {
    const normalized = normalizeMetroInput(label);
    if (normalized) terms.add(normalized);
  }
  for (const term of metro.matchTerms) {
    const normalized = normalizeMetroInput(term);
    if (normalized) terms.add(normalized);
  }
  return [...terms];
}

function metroSearchScore(metro: MetroEntry, query: string, locale: string): number {
  const label = normalizeMetroInput(metroDisplayLabel(metro, locale));
  const enLabel = normalizeMetroInput(metroDisplayLabel(metro, "en"));

  if (label === query || enLabel === query) return 100;
  if (label.startsWith(query) || enLabel.startsWith(query)) return 80;

  for (const term of metroMatchTerms(metro)) {
    if (term === query) return 70;
    if (term.startsWith(query)) return 60;
  }

  if (label.includes(query) || enLabel.includes(query)) return 40;
  if (metroMatchTerms(metro).some((term) => term.includes(query))) return 30;

  return 0;
}

/** Search metros for autocomplete — empty query returns featured metros. */
export function searchMetros(
  query: string,
  locale = "en",
  limit = 8,
  excludeKeys: ReadonlySet<string> = new Set(),
): MetroSearchResult[] {
  const trimmed = query.trim();
  const normalizedQuery = normalizeMetroInput(trimmed);

  const candidates = metroCatalog.metros.filter((metro) => {
    if (excludeKeys.has(metro.id)) return false;
    if (metro.taxonomyId && excludeKeys.has(metro.taxonomyId)) return false;
    return true;
  });

  if (!normalizedQuery) {
    return candidates
      .slice()
      .sort((a, b) => {
        const aFeatured = a.taxonomyId ? 1 : 0;
        const bFeatured = b.taxonomyId ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        return metroDisplayLabel(a, locale).localeCompare(metroDisplayLabel(b, locale), locale);
      })
      .slice(0, limit)
      .map((metro) => ({
        id: metro.id,
        label: metroDisplayLabel(metro, locale),
        countryCode: metro.countryCode,
      }));
  }

  return candidates
    .map((metro) => ({ metro, score: metroSearchScore(metro, normalizedQuery, locale) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return metroDisplayLabel(a.metro, locale).localeCompare(metroDisplayLabel(b.metro, locale), locale);
    })
    .slice(0, limit)
    .map(({ metro }) => ({
      id: metro.id,
      label: metroDisplayLabel(metro, locale),
      countryCode: metro.countryCode,
    }));
}

/** Adzuna API routing for a profile city — country slug + where clause. */
export function resolveAdzunaRoute(cityName: string): { country: string; where: string } | null {
  const metro = resolveMetro(cityName);
  if (!metro?.adzuna) return null;
  if (!ADZUNA_SUPPORTED_COUNTRIES.has(metro.adzuna.country)) return null;
  return metro.adzuna;
}

export function isAdzunaCountrySupported(country: string): boolean {
  return ADZUNA_SUPPORTED_COUNTRIES.has(country);
}
