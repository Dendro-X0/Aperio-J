import type { RoleCategory } from "../index.js";

export type TaxonomyKind = "city" | "industry" | "subSector";

export interface TaxonomyNodeDef {
  id: string;
  kind: TaxonomyKind;
  parentId?: string;
  roleCategory?: RoleCategory;
  /** Industry picker filter group (industry nodes only). */
  industryGroup?: string;
  labels: Record<string, string>;
  matchTerms: string[];
}

export interface TaxonomyCatalog {
  meta: {
    version: string;
    defaultLocale: string;
  };
  nodes: TaxonomyNodeDef[];
}

/** Resolved reference attached to profiles and opportunities at match time. */
export interface TaxonomyRef {
  id: string;
  kind: TaxonomyKind;
  label: string;
  parentId?: string;
}

export interface TaxonomyOverlap {
  score: number;
  hits: TaxonomyRef[];
}
