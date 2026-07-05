import { getTaxonomyNode, getTaxonomyNodes, taxonomyLabel } from "@aperio-j/core";

/** Normalize user input for alias lookup (trim, strip 市 suffix). */
export function normalizeCityInput(value: string): string {
  return value.trim().replace(/市$/u, "");
}

function exactTermMatch(normalized: string, term: string): boolean {
  const candidate = term.trim().toLowerCase();
  if (!candidate) return false;
  return normalized === candidate;
}

/**
 * Map geo API / user input to a display label when it matches a catalog city.
 * Unknown cities (Paris, Frankfurt am Main, etc.) are returned as-is — never forced to Remote.
 */
export function matchCityLabelFromGeo(cityName: string, locale: string): string | null {
  const trimmed = normalizeCityInput(cityName);
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();

  for (const node of getTaxonomyNodes()) {
    if (node.kind !== "city") continue;
    if (node.id === "city:remote") continue;

    const labels = [
      taxonomyLabel(node, locale),
      taxonomyLabel(node, "zh-CN"),
      taxonomyLabel(node, "en"),
      ...node.matchTerms,
    ];

    if (labels.some((term) => exactTermMatch(normalized, term))) {
      return taxonomyLabel(node, locale);
    }
  }

  return trimmed;
}

/** Canonical display label for a city tag — catalog hit or preserved free-form text. */
export function canonicalCityLabel(cityName: string, locale: string): string {
  const trimmed = normalizeCityInput(cityName);
  if (!trimmed) return "";
  return matchCityLabelFromGeo(trimmed, locale) ?? trimmed;
}

/**
 * Resolve partial draft text to a city label.
 * Uses exact catalog match first, then a unique prefix match among suggestions.
 */
export function resolveCityDraftLabel(
  draft: string,
  locale: string,
  suggestionLabels: string[],
): string {
  const trimmed = normalizeCityInput(draft);
  if (!trimmed) return "";

  const catalogHit = matchCityLabelFromGeo(trimmed, locale);
  if (catalogHit && catalogHit.toLowerCase() !== trimmed.toLowerCase()) {
    return catalogHit;
  }

  const query = trimmed.toLowerCase();
  const labelsToSearch = [
    ...new Set([
      ...suggestionLabels,
      ...getTaxonomyNodes()
        .filter((node) => node.kind === "city" && node.id !== "city:remote")
        .map((node) => taxonomyLabel(node, locale)),
    ]),
  ];

  const exactSuggestion = labelsToSearch.find((label) => label.toLowerCase() === query);
  if (exactSuggestion) return exactSuggestion;

  const prefixMatches = labelsToSearch.filter((label) =>
    label.toLowerCase().startsWith(query),
  );
  if (prefixMatches.length === 1) return prefixMatches[0];

  if (catalogHit) return catalogHit;
  return trimmed;
}

export function isRemoteCityLabel(cityName: string, locale: string): boolean {
  const normalized = normalizeCityInput(cityName).toLowerCase();
  if (!normalized) return false;
  if (/^(remote|远程|work from home|居家办公|在家办公)$/.test(normalized)) return true;

  const remoteNode = getTaxonomyNode("city:remote");
  if (!remoteNode) return false;

  const terms = [
    taxonomyLabel(remoteNode, locale),
    taxonomyLabel(remoteNode, "zh-CN"),
    taxonomyLabel(remoteNode, "en"),
    ...remoteNode.matchTerms,
  ];
  return terms.some((term) => exactTermMatch(normalized, term));
}
