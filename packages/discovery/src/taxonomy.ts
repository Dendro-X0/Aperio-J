import type {
  EngineLocale,
  Opportunity,
  RoleCategory,
  SeekerProfile,
  TaxonomyNodeDef,
  TaxonomyOverlap,
  TaxonomyRef,
} from "@aperio-j/core";
import {
  getTaxonomyNode,
  getTaxonomyNodes,
  loadTaxonomyCatalog,
  resolveEngineLocale,
  taxonomyLabel,
} from "@aperio-j/core";
import { corpusClaimsRemoteWork } from "./location.js";

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase().replace(/市/g, "");
}

function nodeToRef(node: TaxonomyNodeDef, locale: string): TaxonomyRef {
  return {
    id: node.id,
    kind: node.kind,
    label: taxonomyLabel(node, locale),
    parentId: node.parentId,
  };
}

function dedupeRefs(refs: TaxonomyRef[]): TaxonomyRef[] {
  const seen = new Set<string>();
  const result: TaxonomyRef[] = [];
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    result.push(ref);
  }
  return result;
}

export function resolveTaxonomyFromText(
  text: string,
  locale?: EngineLocale | string,
): TaxonomyRef[] {
  const resolvedLocale = typeof locale === "string" ? resolveEngineLocale(locale) : (locale ?? "zh-CN");
  const corpus = text.toLowerCase();
  const hits: TaxonomyRef[] = [];

  for (const node of getTaxonomyNodes()) {
    const matched = node.matchTerms.some((term) => {
      const normalized = normalizeTerm(term);
      if (!normalized) return false;
      if (node.id === "city:remote") {
        return corpusClaimsRemoteWork(corpus);
      }
      return corpus.includes(normalized);
    });
    if (matched) hits.push(nodeToRef(node, resolvedLocale));
  }

  return dedupeRefs(hits);
}

export function resolveTaxonomyFromRoleCategories(
  categories: RoleCategory[],
  locale?: EngineLocale | string,
): TaxonomyRef[] {
  const resolvedLocale = typeof locale === "string" ? resolveEngineLocale(locale) : (locale ?? "zh-CN");
  const categorySet = new Set(categories);
  const hits: TaxonomyRef[] = [];

  for (const node of getTaxonomyNodes()) {
    if (node.roleCategory && categorySet.has(node.roleCategory)) {
      hits.push(nodeToRef(node, resolvedLocale));
    }
  }

  return dedupeRefs(hits);
}

/** Include parent industry (and other ancestors) for matched sub-sectors. */
export function expandTaxonomyWithParents(
  refs: TaxonomyRef[],
  locale?: EngineLocale | string,
): TaxonomyRef[] {
  const resolvedLocale = typeof locale === "string" ? resolveEngineLocale(locale) : (locale ?? "zh-CN");
  const expanded = [...refs];
  const seen = new Set(refs.map((ref) => ref.id));

  for (const ref of refs) {
    let parentId = ref.parentId;
    while (parentId && !seen.has(parentId)) {
      const parent = getTaxonomyNode(parentId);
      if (!parent) break;
      const parentRef = nodeToRef(parent, resolvedLocale);
      expanded.push(parentRef);
      seen.add(parentId);
      parentId = parent.parentId;
    }
  }

  return dedupeRefs(expanded);
}

export function resolveOpportunityTaxonomy(
  opportunity: Pick<
    Opportunity,
    "title" | "body" | "locationText" | "roleCategories"
  >,
  locale?: EngineLocale | string,
): TaxonomyRef[] {
  const corpus = `${opportunity.title}\n${opportunity.body}\n${opportunity.locationText ?? ""}`;
  const fromText = resolveTaxonomyFromText(corpus, locale);
  const fromRoles = resolveTaxonomyFromRoleCategories(opportunity.roleCategories, locale);
  const refs = expandTaxonomyWithParents(dedupeRefs([...fromText, ...fromRoles]), locale);

  const hasConcreteLocation =
    opportunity.locationText &&
    !corpusClaimsRemoteWork(opportunity.locationText) &&
    opportunity.locationText !== "远程";

  if (hasConcreteLocation) {
    return refs.filter((ref) => ref.id !== "city:remote");
  }

  return refs;
}

export function buildSeekerTaxonomy(
  profile: SeekerProfile,
  locale?: EngineLocale | string,
): TaxonomyRef[] {
  const resolvedLocale = typeof locale === "string" ? resolveEngineLocale(locale) : (locale ?? "zh-CN");
  const corpusParts = [
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
    ...profile.intent.desiredIndustries,
    ...profile.intent.desiredRoles,
    ...profile.artifacts.map((artifact) => `${artifact.industry} ${artifact.duties} ${artifact.title}`),
    ...profile.skillTokens,
    ...profile.inferredCapabilities,
  ];

  const fromText = resolveTaxonomyFromText(corpusParts.join("\n"), resolvedLocale);

  const desiredRoleCorpus = profile.intent.desiredRoles.join(" ");
  const fromDesiredRoles = resolveTaxonomyFromText(desiredRoleCorpus, resolvedLocale).filter(
    (ref) => ref.kind === "subSector",
  );

  return dedupeRefs([...fromText, ...fromDesiredRoles]);
}

export function scoreTaxonomyOverlap(
  seekerRefs: TaxonomyRef[],
  opportunityRefs: TaxonomyRef[],
): TaxonomyOverlap {
  if (seekerRefs.length === 0 || opportunityRefs.length === 0) {
    return { score: 0, hits: [] };
  }

  const oppIds = new Set(opportunityRefs.map((ref) => ref.id));
  const oppParentIds = new Set(
    opportunityRefs.map((ref) => ref.parentId).filter((id): id is string => Boolean(id)),
  );
  const oppKinds = new Map(opportunityRefs.map((ref) => [ref.id, ref]));

  const hits: TaxonomyRef[] = [];

  for (const seekerRef of seekerRefs) {
    if (oppIds.has(seekerRef.id)) {
      hits.push(seekerRef);
      continue;
    }

    if (seekerRef.kind === "industry") {
      const childMatch = opportunityRefs.find(
        (oppRef) => oppRef.parentId === seekerRef.id || oppParentIds.has(seekerRef.id),
      );
      if (childMatch) {
        hits.push(seekerRef);
        continue;
      }
    }

    if (seekerRef.kind === "subSector" && seekerRef.parentId && oppIds.has(seekerRef.parentId)) {
      hits.push(oppKinds.get(seekerRef.parentId) ?? seekerRef);
    }
  }

  const uniqueHits = dedupeRefs(hits);
  if (uniqueHits.length === 0) return { score: 0, hits: [] };

  const cityHits = uniqueHits.filter((ref) => ref.kind === "city").length;
  const sectorHits = uniqueHits.filter((ref) => ref.kind !== "city").length;
  const score = Math.min(100, 35 + cityHits * 20 + sectorHits * 18);

  return { score, hits: uniqueHits };
}

export function defaultTaxonomyLocale(): string {
  return loadTaxonomyCatalog().meta.defaultLocale;
}
