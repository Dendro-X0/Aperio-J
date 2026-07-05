import { getTaxonomyNodes, taxonomyLabel } from "@aperio-j/core";

export type IndustryGroupId =
  | "all"
  | "manufacturing"
  | "logistics"
  | "technology"
  | "services"
  | "finance"
  | "public"
  | "other";

export const INDUSTRY_GROUP_IDS: Exclude<IndustryGroupId, "all">[] = [
  "manufacturing",
  "logistics",
  "technology",
  "services",
  "finance",
  "public",
  "other",
];

export interface IndustryOption {
  id: string;
  label: string;
  group: Exclude<IndustryGroupId, "all">;
  searchText: string;
}

export function industryOptions(locale: string): IndustryOption[] {
  return getTaxonomyNodes()
    .filter((node) => node.kind === "industry")
    .map((node) => {
      const label = taxonomyLabel(node, locale);
      const searchText = [
        label,
        taxonomyLabel(node, "zh-CN"),
        taxonomyLabel(node, "en"),
        ...node.matchTerms,
      ]
        .join(" ")
        .toLowerCase();

      return {
        id: node.id,
        label,
        group: (node.industryGroup ?? "other") as Exclude<IndustryGroupId, "all">,
        searchText,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

export function isCatalogIndustryLabel(value: string, locale: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return industryOptions(locale).some((option) => option.label === trimmed);
}

/** Resolve a stored industry label (any locale) to a taxonomy industry id. */
export function resolveIndustryIdFromLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  for (const locale of ["zh-CN", "en"] as const) {
    const match = industryOptions(locale).find((option) => option.label === trimmed);
    if (match) return match.id;
  }

  const lower = trimmed.toLowerCase();
  for (const locale of ["zh-CN", "en"] as const) {
    const match = industryOptions(locale).find(
      (option) => option.label.toLowerCase() === lower,
    );
    if (match) return match.id;
  }

  return null;
}

function inferIndustryGroupFromText(label: string): Exclude<IndustryGroupId, "all"> {
  const lower = label.toLowerCase();
  if (
    /it|software|软件|互联网|程序员|developer|devops|tech|saas|platform/.test(lower)
  ) {
    return "technology";
  }
  if (/logistics|warehouse|物流|仓储|配送|快递/.test(lower)) {
    return "logistics";
  }
  if (/manufactur|制造|工厂|产线|电子|auto|汽车/.test(lower)) {
    return "manufacturing";
  }
  if (/finance|bank|保险|金融|证券/.test(lower)) {
    return "finance";
  }
  if (/retail|餐饮|酒店|教育|医疗|服务|sales|销售/.test(lower)) {
    return "services";
  }
  if (/政府|public|事业单位/.test(lower)) {
    return "public";
  }
  return "other";
}

export function resolveIndustryGroupFromLabel(label: string): Exclude<IndustryGroupId, "all"> {
  const industryId = resolveIndustryIdFromLabel(label);
  if (industryId) {
    const node = getTaxonomyNodes().find((entry) => entry.id === industryId);
    return (node?.industryGroup ?? "other") as Exclude<IndustryGroupId, "all">;
  }
  return inferIndustryGroupFromText(label);
}

export function filterIndustryOptions(
  options: IndustryOption[],
  query: string,
  group: IndustryGroupId,
): IndustryOption[] {
  const normalized = query.trim().toLowerCase();

  return options.filter((option) => {
    if (group !== "all" && option.group !== group) return false;
    if (!normalized) return true;
    return option.searchText.includes(normalized) || option.label.toLowerCase().includes(normalized);
  });
}
