import type { TaxonomyCatalog, TaxonomyNodeDef } from "./types.js";
import nodes from "../catalogs/taxonomies/nodes.json" with { type: "json" };

const catalog = nodes as TaxonomyCatalog;

let nodesByIdCache: Map<string, TaxonomyNodeDef> | null = null;

export function loadTaxonomyCatalog(): TaxonomyCatalog {
  return catalog;
}

export function getTaxonomyNodes(): TaxonomyNodeDef[] {
  return catalog.nodes;
}

export function getTaxonomyNode(id: string): TaxonomyNodeDef | undefined {
  if (!nodesByIdCache) {
    nodesByIdCache = new Map(getTaxonomyNodes().map((node) => [node.id, node]));
  }
  return nodesByIdCache.get(id);
}

export function taxonomyLabel(
  node: TaxonomyNodeDef,
  locale = catalog.meta.defaultLocale,
): string {
  return node.labels[locale] ?? node.labels["zh-CN"] ?? node.id;
}
