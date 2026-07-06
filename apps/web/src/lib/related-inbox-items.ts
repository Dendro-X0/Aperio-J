import type { RoleCategory, TaxonomyRef } from "@aperio-j/core";
import type { InboxItem } from "@/lib/match-service";
import { inboxItemWorkMode } from "@/lib/inbox-work-mode";

const MEANINGFUL_ROLE_CATEGORIES = new Set<RoleCategory>([
  "production-line",
  "qc",
  "warehouse",
  "materials",
  "equipment-maintenance",
  "office-admin",
  "sales",
  "food-service",
  "general-labor",
  "frontend-dev",
  "backend-dev",
  "fullstack-dev",
  "devops",
  "mobile-dev",
  "game-dev",
  "data-ml",
  "qa-automation",
  "product-design",
]);

export interface RelatedInboxItemsOptions {
  limit?: number;
  minScore?: number;
}

function taxonomyIds(refs: TaxonomyRef[] | undefined): Set<string> {
  return new Set((refs ?? []).map((ref) => ref.id));
}

function titleTokens(title: string): Set<string> {
  const tokens = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  return new Set(tokens);
}

function roleCategoryOverlap(anchor: InboxItem, candidate: InboxItem): number {
  const anchorCats = new Set(
    anchor.opportunity.roleCategories.filter((category) =>
      MEANINGFUL_ROLE_CATEGORIES.has(category),
    ),
  );
  if (anchorCats.size === 0) return 0;

  let hits = 0;
  for (const category of candidate.opportunity.roleCategories) {
    if (anchorCats.has(category)) hits += 1;
  }
  return hits;
}

function taxonomyOverlap(anchorIds: Set<string>, candidateIds: Set<string>): number {
  let hits = 0;
  for (const id of candidateIds) {
    if (anchorIds.has(id)) hits += 1;
  }
  return hits;
}

function titleOverlap(anchorTitle: string, candidateTitle: string): number {
  const anchor = titleTokens(anchorTitle);
  const candidate = titleTokens(candidateTitle);
  if (anchor.size === 0 || candidate.size === 0) return 0;

  let hits = 0;
  for (const token of candidate) {
    if (anchor.has(token)) hits += 1;
  }
  return hits;
}

/** Deterministic similarity score for listing-to-listing relatedness. */
export function scoreRelatedInboxItem(anchor: InboxItem, candidate: InboxItem): number {
  if (anchor.opportunity.id === candidate.opportunity.id) return -1;
  if (candidate.match.excluded) return -1;
  if (anchor.opportunity.url === candidate.opportunity.url) return -1;

  const anchorTaxonomy = taxonomyIds([
    ...(anchor.opportunity.taxonomyRefs ?? []),
    ...(anchor.match.taxonomyHits ?? []),
  ]);
  const candidateTaxonomy = taxonomyIds([
    ...(candidate.opportunity.taxonomyRefs ?? []),
    ...(candidate.match.taxonomyHits ?? []),
  ]);

  let score = 0;
  score += roleCategoryOverlap(anchor, candidate) * 22;
  score += taxonomyOverlap(anchorTaxonomy, candidateTaxonomy) * 14;
  score += titleOverlap(anchor.opportunity.title, candidate.opportunity.title) * 9;

  if (inboxItemWorkMode(anchor) === inboxItemWorkMode(candidate)) {
    score += 10;
  }

  if (anchor.opportunity.employerHint && candidate.opportunity.employerHint) {
    const a = anchor.opportunity.employerHint.toLowerCase();
    const b = candidate.opportunity.employerHint.toLowerCase();
    if (a === b || a.includes(b) || b.includes(a)) {
      score += 18;
    }
  }

  score += Math.round(candidate.match.breakdown.finalScore * 0.2);

  return score;
}

export function findRelatedInboxItems(
  anchor: InboxItem,
  pool: InboxItem[],
  options: RelatedInboxItemsOptions = {},
): InboxItem[] {
  const limit = options.limit ?? 6;
  const minScore = options.minScore ?? 28;

  const ranked = pool
    .map((candidate) => ({
      candidate,
      score: scoreRelatedInboxItem(anchor, candidate),
    }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.candidate.match.breakdown.finalScore - a.candidate.match.breakdown.finalScore;
    });

  return ranked.slice(0, limit).map((row) => row.candidate);
}
