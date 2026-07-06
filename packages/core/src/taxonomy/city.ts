import { getTaxonomyNodes, taxonomyLabel } from "./load-catalog.js";
import type { TaxonomyNodeDef } from "./types.js";

function normalizeCityInput(value: string): string {
  return value.trim().replace(/市$/u, "");
}

function exactTermMatch(normalized: string, term: string): boolean {
  const candidate = term.trim().toLowerCase();
  if (!candidate) return false;
  return normalized === candidate;
}

function cityNodeTerms(node: TaxonomyNodeDef): string[] {
  return [
    ...Object.values(node.labels),
    ...node.matchTerms,
  ];
}

/** Resolve a stored or user-entered city string to a taxonomy city node. */
export function resolveCityNode(cityName: string): TaxonomyNodeDef | undefined {
  const trimmed = normalizeCityInput(cityName);
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();

  for (const node of getTaxonomyNodes()) {
    if (node.kind !== "city" || node.id === "city:remote") continue;

    if (cityNodeTerms(node).some((term) => exactTermMatch(normalized, term))) {
      return node;
    }
  }

  return undefined;
}

/** Stable identity for deduping and profile location keys (`city:shenzhen` or free-form). */
export function cityIdentityKey(cityName: string): string {
  const node = resolveCityNode(cityName);
  if (node) return node.id;
  return normalizeCityInput(cityName).toLowerCase();
}

/** Locale-aware display label for profile tags and shell UI. */
export function displayCityLabel(cityName: string, locale = "zh-CN"): string {
  const trimmed = normalizeCityInput(cityName);
  if (!trimmed) return "";

  const node = resolveCityNode(trimmed);
  if (node) return taxonomyLabel(node, locale);

  return trimmed;
}

/** All lowercase match aliases for corpus / connector search. */
export function cityMatchTerms(cityName: string): string[] {
  const node = resolveCityNode(cityName);
  if (!node) {
    const key = normalizeCityInput(cityName).toLowerCase();
    return key ? [key] : [];
  }

  const terms = new Set<string>();
  for (const term of cityNodeTerms(node)) {
    const normalized = normalizeCityInput(term).toLowerCase();
    if (normalized) terms.add(normalized);
  }
  return [...terms];
}

export function citiesShareIdentity(a: string, b: string): boolean {
  return cityIdentityKey(a) === cityIdentityKey(b);
}

/** Re-localize a city tag list for the active UI locale without duplicates. */
export function localizeCityList(cities: string[], locale: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const city of cities) {
    const label = displayCityLabel(city, locale);
    if (!label) continue;
    const key = cityIdentityKey(city);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
}

/** True when the city catalog entry is China-region (zh label uses CJK). */
export function cityIsChinaRegion(cityName: string): boolean {
  const node = resolveCityNode(cityName);
  if (node) return /[\u4e00-\u9fff]/.test(taxonomyLabel(node, "zh-CN"));
  return /[\u4e00-\u9fff]/.test(cityName);
}
