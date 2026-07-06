import type { Opportunity, RawFeedItem } from "@aperio-j/core";
import type { EngineLocale, EngineTranslator } from "@aperio-j/core";
import { classifyRoleCategories } from "./role-categories.js";
import { detectRedFlagTiers } from "./red-flags.js";
import { classifyPosterType, extractEmployerHint } from "./poster-type.js";
import {
  classifyEmploymentType,
  extractLocationText,
  inferCityHintFromListingUrl,
  localizeLocationText,
  tokenizeRequirements,
} from "./text-utils.js";
import {
  extractContactHints,
  extractSourceSite,
} from "./contact-extract.js";
import { resolveOpportunityTaxonomy } from "./taxonomy.js";

function stableId(url: string, title: string): string {
  const raw = `${url}::${title}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `opp-${hash.toString(16)}`;
}

export interface ParseOpportunityOptions {
  locale?: EngineLocale | EngineTranslator;
}

function resolveLocaleOption(locale?: EngineLocale | EngineTranslator): EngineLocale | undefined {
  if (!locale) return undefined;
  if (typeof locale === "object" && "locale" in locale) return locale.locale;
  return locale;
}

export function parseOpportunity(
  item: RawFeedItem,
  options?: ParseOpportunityOptions,
): Opportunity {
  const corpus = `${item.title}\n${item.body}`;
  const roleCategories = classifyRoleCategories(corpus);
  const redFlagTiers = detectRedFlagTiers(corpus, options?.locale);
  const posterType = classifyPosterType(corpus);
  const cityHint = inferCityHintFromListingUrl(item.url);
  const locationText = extractLocationText(corpus, cityHint ? [cityHint] : []);
  const locale = resolveLocaleOption(options?.locale);
  const taxonomyRefs = resolveOpportunityTaxonomy(
    {
      title: item.title,
      body: item.body,
      locationText,
      roleCategories,
    },
    locale,
  );

  return {
    id: stableId(item.url, item.title),
    title: item.title.trim(),
    body: item.body.trim(),
    url: item.url,
    sourceId: item.sourceId,
    fetchedAt: item.fetchedAt,
    sourceSite: extractSourceSite(item.url),
    employerHint: extractEmployerHint(corpus),
    locationText,
    employmentType: classifyEmploymentType(corpus),
    posterType,
    roleCategories,
    requiredSignals: tokenizeRequirements(corpus),
    redFlags: redFlagTiers.hard,
    trustWarnings: redFlagTiers.warn,
    contactHints: extractContactHints(corpus),
    taxonomyRefs,
  };
}

export function localizeOpportunity(
  opportunity: Opportunity,
  locale?: EngineLocale | EngineTranslator,
): Opportunity {
  const corpus = `${opportunity.title}\n${opportunity.body}`;
  const redFlagTiers = detectRedFlagTiers(corpus, locale);
  const resolvedLocale = resolveLocaleOption(locale);
  const taxonomyRefs = resolveOpportunityTaxonomy(opportunity, resolvedLocale);
  return {
    ...opportunity,
    locationText: localizeLocationText(opportunity.locationText, resolvedLocale),
    redFlags: redFlagTiers.hard,
    trustWarnings: redFlagTiers.warn,
    taxonomyRefs,
  };
}

export function parseOpportunities(
  items: RawFeedItem[],
  options?: ParseOpportunityOptions,
): Opportunity[] {
  const seen = new Set<string>();
  const results: Opportunity[] = [];

  for (const item of items) {
    const parsed = parseOpportunity(item, options);
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    results.push(parsed);
  }

  return results;
}
