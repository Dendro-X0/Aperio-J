import type {
  EngineLocale,
  EngineTranslator,
  MatchConfidence,
  MatchResult,
  Opportunity,
  RoleCategory,
  SeekerProfile,
  TaxonomyRef,
} from "@aperio-j/core";
import { clampScore, createEngineTranslator, getTaxonomyNode, taxonomyLabel } from "@aperio-j/core";
import { buildCapabilityHaystack } from "@aperio-j/discovery/transferable";
import { shouldDiscardCnFeedItem } from "@aperio-j/discovery/cn-feed-quality";
import { shouldDiscardRemoteTechFeedItem } from "@aperio-j/discovery/remote-tech-feed-quality";
import { shouldDiscardRemoteOpsFeedItem } from "@aperio-j/discovery/remote-ops-feed-quality";
import { countIntentHits, expandIntentTerms } from "@aperio-j/discovery/intent-expansion";
import { localizeLocationText, locationMatchesProfile } from "@aperio-j/discovery/text-utils";
import { corpusMatchesDistrict } from "@aperio-j/discovery/text-utils";
import {
  buildSeekerTaxonomy,
  scoreTaxonomyOverlap,
} from "@aperio-j/discovery/taxonomy";
import {
  EMPTY_FEEDBACK_CONTEXT,
  type MatchFeedbackContext,
} from "./feedback-context.js";

const PRODUCTION_LINE_CATEGORIES: RoleCategory[] = ["production-line", "general-labor"];
const SALES_CATEGORIES: RoleCategory[] = ["sales"];
const FOOD_CATEGORIES: RoleCategory[] = ["food-service"];

export interface MatchLocaleOptions {
  locale?: EngineLocale | EngineTranslator;
}

function resolveTranslator(options?: MatchLocaleOptions): EngineTranslator {
  if (options?.locale && typeof options.locale === "object" && "t" in options.locale) {
    return options.locale;
  }
  return createEngineTranslator(options?.locale as EngineLocale | undefined);
}

function matchesCity(
  profile: SeekerProfile,
  locationText: string | null,
  corpus: string,
): boolean {
  return locationMatchesProfile(profile.constraints, locationText, corpus);
}

function hasCategoryOverlap(categories: RoleCategory[], avoidLabels: string[]): boolean {
  const avoidSet = new Set(
    avoidLabels.map((label) => label.toLowerCase()),
  );

  const categoryLabels: Record<RoleCategory, string[]> = {
    "production-line": ["流水线", "产线", "普工", "组装", "production-line"],
    qc: ["质检", "品检", "qc"],
    warehouse: ["仓储", "仓库", "warehouse"],
    materials: ["物料", "materials"],
    "equipment-maintenance": ["机修", "设备维护", "equipment-maintenance"],
    "office-admin": ["文职", "行政", "office-admin"],
    sales: ["销售", "sales"],
    "food-service": ["服务员", "餐饮", "food-service"],
    "general-labor": ["普工", "general-labor"],
    "frontend-dev": ["前端", "frontend", "front-end"],
    "backend-dev": ["后端", "backend", "back-end"],
    "fullstack-dev": ["全栈", "fullstack", "full-stack"],
    devops: ["devops", "sre", "运维"],
    "mobile-dev": ["mobile", "ios", "android"],
    "game-dev": ["game", "unity", "unreal"],
    "data-ml": ["data", "machine learning", "ml"],
    "qa-automation": ["qa", "sdet", "测试"],
    "product-design": ["product", "ux", "ui"],
    "ecommerce-ops": ["电商运营", "ecommerce-ops", "e-commerce"],
    "livestream-ops": ["直播运营", "livestream-ops", "live stream"],
    "customer-support": ["客服", "customer-support", "customer support"],
    "content-ops": ["内容运营", "content-ops", "content operations"],
    "community-ops": ["社群运营", "community-ops", "community manager"],
    other: [],
  };

  for (const category of categories) {
    const labels = categoryLabels[category] ?? [];
    if (labels.some((label) => avoidSet.has(label.toLowerCase()))) return true;
    if (avoidSet.has(category)) return true;
  }

  return false;
}

function checkHardGates(
  opportunity: Opportunity,
  profile: SeekerProfile,
  translator: EngineTranslator,
): string | null {
  const corpus = `${opportunity.title} ${opportunity.body}`.toLowerCase();
  const { constraints, intent } = profile;
  const { t, joinList } = translator;

  if (!matchesCity(profile, opportunity.locationText, corpus)) {
    return t("matcher.exclusion.locationOutOfRange");
  }

  if (
    shouldDiscardCnFeedItem(
      { title: opportunity.title, body: opportunity.body, url: opportunity.url },
      profile,
      { roleCategories: opportunity.roleCategories },
    )
  ) {
    return t("matcher.exclusion.irrelevantListing");
  }

  if (
    shouldDiscardRemoteOpsFeedItem(
      { title: opportunity.title, body: opportunity.body, url: opportunity.url },
      profile,
      { roleCategories: opportunity.roleCategories },
    )
  ) {
    return t("matcher.exclusion.irrelevantListing");
  }

  if (
    shouldDiscardRemoteTechFeedItem(
      { title: opportunity.title, body: opportunity.body, url: opportunity.url },
      profile,
      { roleCategories: opportunity.roleCategories },
    )
  ) {
    return t("matcher.exclusion.irrelevantListing");
  }

  if (
    constraints.employmentTypes.length > 0 &&
    opportunity.employmentType !== "unknown" &&
    !constraints.employmentTypes.includes(opportunity.employmentType)
  ) {
    return t("matcher.exclusion.employmentTypeMismatch");
  }

  if (hasCategoryOverlap(opportunity.roleCategories, intent.avoidRoles)) {
    return t("matcher.exclusion.avoidRoleCategory");
  }

  for (const phrase of intent.avoidPhrases) {
    if (phrase && corpus.includes(phrase.toLowerCase())) {
      return t("matcher.exclusion.avoidPhrase", { phrase });
    }
  }

  if (
    intent.excludeProductionLine &&
    opportunity.roleCategories.some((category) =>
      PRODUCTION_LINE_CATEGORIES.includes(category),
    )
  ) {
    return t("matcher.exclusion.productionLine");
  }

  if (
    intent.excludeSales &&
    opportunity.roleCategories.some((category) => SALES_CATEGORIES.includes(category))
  ) {
    return t("matcher.exclusion.sales");
  }

  if (
    intent.excludeFoodService &&
    opportunity.roleCategories.some((category) => FOOD_CATEGORIES.includes(category))
  ) {
    return t("matcher.exclusion.foodService");
  }

  if (!constraints.allowAgencyPostings && opportunity.posterType === "agency") {
    return t("matcher.exclusion.agencyFiltered");
  }

  if (constraints.hideRedFlagListings && opportunity.redFlags.length > 0) {
    return t("matcher.exclusion.redFlags", {
      flags: joinList(opportunity.redFlags),
    });
  }

  return null;
}

function scoreIntent(
  opportunity: Opportunity,
  profile: SeekerProfile,
  seekerTaxonomy: ReturnType<typeof buildSeekerTaxonomy>,
): {
  score: number;
  hits: string[];
  taxonomyHits: TaxonomyRef[];
} {
  const expanded = expandIntentTerms([
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
  ]);
  const corpus = `${opportunity.title} ${opportunity.body}`;
  const hits = countIntentHits(corpus, expanded);
  const taxonomy = scoreTaxonomyOverlap(seekerTaxonomy, opportunity.taxonomyRefs ?? []);

  let score = hits.length === 0 ? 15 : clampScore(35 + hits.length * 12);
  if (taxonomy.score > 0) {
    score = clampScore(Math.round(score * 0.7 + taxonomy.score * 0.3));
  }

  return { score, hits, taxonomyHits: taxonomy.hits };
}

function scoreCapability(opportunity: Opportunity, profile: SeekerProfile): {
  score: number;
  hits: string[];
} {
  const haystack = buildCapabilityHaystack(profile.artifacts, [
    ...profile.skillTokens,
    ...profile.inferredCapabilities,
  ]);
  const corpus = `${opportunity.title} ${opportunity.body}`.toLowerCase();
  const hits = haystack.filter((token) => corpus.includes(token.toLowerCase()));

  const signalHits = opportunity.requiredSignals.filter((signal) =>
    haystack.some((token) => token.toLowerCase().includes(signal) || signal.includes(token.toLowerCase())),
  );

  const allHits = [...new Set([...hits, ...signalHits])];
  if (allHits.length === 0) return { score: 20, hits: [] };

  return { score: clampScore(30 + allHits.length * 10), hits: allHits };
}

function scoreTrust(opportunity: Opportunity, profile: SeekerProfile): number {
  let score = 50;

  if (opportunity.posterType === "direct") score += 25;
  if (opportunity.posterType === "agency") score -= 30;
  if (opportunity.employerHint) score += 10;
  if (opportunity.redFlags.length > 0) score -= opportunity.redFlags.length * 15;
  const warnings = opportunity.trustWarnings ?? [];
  if (warnings.length > 0) score -= Math.min(25, warnings.length * 8);
  if (profile.constraints.preferDirectHire && opportunity.posterType === "unknown") {
    score -= 5;
  }

  return clampScore(score);
}

function scoreGeo(opportunity: Opportunity, profile: SeekerProfile): number {
  if (!opportunity.locationText) return 40;

  const primary = profile.constraints.primaryCity.replace(/市/g, "").toLowerCase();
  const location = opportunity.locationText.toLowerCase();
  const districts = profile.constraints.preferredDistricts ?? [];
  const districtCorpus = `${opportunity.locationText} ${opportunity.title} ${opportunity.body}`;
  const noGeoProfile =
    !profile.constraints.primaryCity.trim() &&
    profile.constraints.acceptableCities.every((city) => !city.trim());

  if (noGeoProfile) {
    return /remote|远程/.test(location) ? 85 : 35;
  }

  if (districts.length > 0 && corpusMatchesDistrict(districtCorpus, districts)) return 98;
  if (primary && location.includes(primary)) return 90;
  if (matchesCity(profile, opportunity.locationText, `${opportunity.title} ${opportunity.body}`)) {
    return 70;
  }
  if (/remote|远程/.test(location)) return 60;

  return 20;
}

function resolveConfidence(
  finalScore: number,
  hitCount: number,
): MatchConfidence {
  if (finalScore >= 72 && hitCount >= 3) return "high";
  if (finalScore >= 55) return "medium";
  return "low";
}

function taxonomyHitLabel(ref: TaxonomyRef, locale: EngineLocale): string {
  const node = getTaxonomyNode(ref.id);
  if (node) return taxonomyLabel(node, locale);
  return ref.label;
}

function buildExplanation(
  opportunity: Opportunity,
  intentHits: string[],
  capabilityHits: string[],
  taxonomyHits: TaxonomyRef[],
  cautions: string[],
  translator: EngineTranslator,
): string {
  const { t, joinList, catalog } = translator;
  const parts: string[] = [];

  if (taxonomyHits.length > 0) {
    parts.push(
      t("matcher.explanation.taxonomyMatch", {
        hits: joinList(taxonomyHits.map((ref) => taxonomyHitLabel(ref, translator.locale))),
      }),
    );
  }

  if (intentHits.length > 0) {
    parts.push(
      t("matcher.explanation.intentMatch", {
        hits: joinList(intentHits.slice(0, 4)),
      }),
    );
  }

  if (capabilityHits.length > 0) {
    parts.push(
      t("matcher.explanation.capabilityMatch", {
        hits: joinList(capabilityHits.slice(0, 4)),
      }),
    );
  }

  const localizedLocation = localizeLocationText(opportunity.locationText, translator.locale);
  if (localizedLocation) {
    parts.push(
      t("matcher.explanation.location", { location: localizedLocation }),
    );
  }

  if (opportunity.posterType === "direct") {
    parts.push(t("matcher.explanation.posterDirect"));
  } else if (opportunity.posterType === "agency") {
    parts.push(t("matcher.explanation.posterAgency"));
  }

  if (cautions.length > 0) {
    parts.push(
      t("matcher.explanation.cautions", {
        items: cautions.join(catalog.cautionSeparator),
      }),
    );
  }

  if (parts.length === 0) {
    return t("matcher.explanation.fallback");
  }

  return parts.join(catalog.sentenceSeparator) + catalog.explanationSuffix;
}

function notRecommendedExplanation(reason: string, translator: EngineTranslator): string {
  return translator.t("matcher.notRecommended", { reason });
}

function feedbackExclusionReason(
  opportunity: Opportunity,
  feedback: MatchFeedbackContext,
  translator: EngineTranslator,
): string | null {
  for (const signal of feedback.signals) {
    if (signal.action === "not-interested" && signal.opportunityId === opportunity.id) {
      return translator.t("matcher.exclusion.notInterested");
    }
  }
  return null;
}

function applyFeedbackAdjustments(
  opportunity: Opportunity,
  feedback: MatchFeedbackContext,
  scores: {
    intentScore: number;
    capabilityScore: number;
    trustScore: number;
    geoScore: number;
  },
  cautions: string[],
  translator: EngineTranslator,
): number {
  let { intentScore, trustScore } = scores;

  const appliedCategories = new Set<RoleCategory>();
  const interestedCategories = new Set<RoleCategory>();
  const dismissedCategories = new Set<RoleCategory>();
  const scamSources = new Set<string>();

  for (const signal of feedback.signals) {
    if (signal.action === "applied") {
      for (const category of signal.roleCategories) appliedCategories.add(category);
    }
    if (signal.action === "interested") {
      for (const category of signal.roleCategories) interestedCategories.add(category);
    }
    if (signal.action === "not-interested") {
      for (const category of signal.roleCategories) dismissedCategories.add(category);
    }
    if (signal.action === "agency-scam") {
      scamSources.add(signal.sourceId);
    }
  }

  if (scamSources.has(opportunity.sourceId)) {
    trustScore = clampScore(trustScore - 20);
    cautions.push(translator.t("matcher.caution.sourceAgencyScam"));
  }

  if (opportunity.roleCategories.some((category) => dismissedCategories.has(category))) {
    intentScore = clampScore(intentScore - 15);
    cautions.push(translator.t("matcher.caution.dismissedCategory"));
  }

  if (opportunity.roleCategories.some((category) => appliedCategories.has(category))) {
    intentScore = clampScore(intentScore + 8);
  }

  if (opportunity.roleCategories.some((category) => interestedCategories.has(category))) {
    intentScore = clampScore(intentScore + 4);
  }

  const sourceWeight = feedback.sourceWeights[opportunity.sourceId] ?? 1;
  const weighted = clampScore(
    Math.round(
      (intentScore * 0.35 +
        scores.capabilityScore * 0.3 +
        trustScore * 0.2 +
        scores.geoScore * 0.15) *
        sourceWeight,
    ),
  );

  return weighted;
}

export function scoreOpportunity(
  opportunity: Opportunity,
  profile: SeekerProfile,
  feedback: MatchFeedbackContext = EMPTY_FEEDBACK_CONTEXT,
  options?: MatchLocaleOptions,
): MatchResult {
  const translator = resolveTranslator(options);

  const feedbackReason = feedbackExclusionReason(opportunity, feedback, translator);
  if (feedbackReason) {
    return {
      opportunityId: opportunity.id,
      excluded: true,
      exclusionReason: feedbackReason,
      breakdown: {
        intentScore: 0,
        capabilityScore: 0,
        trustScore: 0,
        geoScore: 0,
        finalScore: 0,
      },
      confidence: "low",
      intentHits: [],
      capabilityHits: [],
      taxonomyHits: [],
      cautions: [feedbackReason],
      explanation: notRecommendedExplanation(feedbackReason, translator),
    };
  }

  const exclusionReason = checkHardGates(opportunity, profile, translator);

  if (exclusionReason) {
    return {
      opportunityId: opportunity.id,
      excluded: true,
      exclusionReason,
      breakdown: {
        intentScore: 0,
        capabilityScore: 0,
        trustScore: 0,
        geoScore: 0,
        finalScore: 0,
      },
      confidence: "low",
      intentHits: [],
      capabilityHits: [],
      taxonomyHits: [],
      cautions: [exclusionReason],
      explanation: notRecommendedExplanation(exclusionReason, translator),
    };
  }

  const seekerTaxonomy = buildSeekerTaxonomy(profile, translator.locale);
  const intent = scoreIntent(opportunity, profile, seekerTaxonomy);
  const capability = scoreCapability(opportunity, profile);
  const trustScore = scoreTrust(opportunity, profile);
  const geoScore = scoreGeo(opportunity, profile);

  const cautions: string[] = [];
  if (opportunity.posterType === "unknown" && profile.constraints.preferDirectHire) {
    cautions.push(translator.t("matcher.caution.unknownPoster"));
  }
  if ((opportunity.trustWarnings ?? []).length > 0) {
    cautions.push(...(opportunity.trustWarnings ?? []));
  }
  if (opportunity.redFlags.length > 0) {
    cautions.push(...opportunity.redFlags);
  }

  const finalScore = applyFeedbackAdjustments(
    opportunity,
    feedback,
    {
      intentScore: intent.score,
      capabilityScore: capability.score,
      trustScore,
      geoScore,
    },
    cautions,
    translator,
  );

  const hitCount = intent.hits.length + capability.hits.length + intent.taxonomyHits.length;

  return {
    opportunityId: opportunity.id,
    excluded: false,
    breakdown: {
      intentScore: intent.score,
      capabilityScore: capability.score,
      trustScore,
      geoScore,
      finalScore,
    },
    confidence: resolveConfidence(finalScore, hitCount),
    intentHits: intent.hits,
    capabilityHits: capability.hits,
    taxonomyHits: intent.taxonomyHits,
    cautions,
    explanation: buildExplanation(
      opportunity,
      intent.hits,
      capability.hits,
      intent.taxonomyHits,
      cautions,
      translator,
    ),
  };
}

export function rankOpportunities(
  opportunities: Opportunity[],
  profile: SeekerProfile,
  options?: {
    includeExcluded?: boolean;
    limit?: number;
    feedback?: MatchFeedbackContext;
    locale?: EngineLocale | EngineTranslator;
  },
): Array<{ opportunity: Opportunity; match: MatchResult }> {
  const partition = partitionOpportunityMatches(opportunities, profile, options);
  if (options?.includeExcluded) {
    return [...partition.matched, ...partition.excluded];
  }
  return partition.matched;
}

export function partitionOpportunityMatches(
  opportunities: Opportunity[],
  profile: SeekerProfile,
  options?: {
    limit?: number;
    excludedLimit?: number;
    feedback?: MatchFeedbackContext;
    locale?: EngineLocale | EngineTranslator;
  },
): {
  matched: Array<{ opportunity: Opportunity; match: MatchResult }>;
  excluded: Array<{ opportunity: Opportunity; match: MatchResult }>;
} {
  const limit = options?.limit ?? 50;
  const excludedLimit = options?.excludedLimit ?? 30;
  const feedback = options?.feedback ?? EMPTY_FEEDBACK_CONTEXT;
  const translator = resolveTranslator(options);

  const scored = opportunities.map((opportunity) => ({
    opportunity,
    match: scoreOpportunity(opportunity, profile, feedback, { locale: translator }),
  }));

  const matched = scored
    .filter((row) => !row.match.excluded)
    .sort((a, b) => b.match.breakdown.finalScore - a.match.breakdown.finalScore)
    .slice(0, limit);

  const excluded = scored
    .filter((row) => row.match.excluded)
    .sort((a, b) =>
      a.opportunity.title.localeCompare(b.opportunity.title, translator.locale),
    )
    .slice(0, excludedLimit);

  return { matched, excluded };
}
