import type { RoleCategory } from "@aperio-j/core";
import { getTaxonomyNode, taxonomyLabel } from "@aperio-j/core";
import {
  inboxPresetIdsForRoleFamilies,
  opportunityMatchesRoleFamily,
  resolveRoleFamilies,
  type RoleFamilyId,
} from "@aperio-j/probe";
import type { InboxItem } from "@/lib/match-service";
import {
  resolveIndustryGroupFromLabel,
  resolveIndustryIdFromLabel,
  type IndustryGroupId,
} from "@/lib/industry-options";

/** Special preset id for listings that don't match a specific sub-sector. */
export const INBOX_PRESET_OTHER = "other";

const MANUFACTURING_PRESET_IDS = [
  "subSector:qc",
  "subSector:warehouse",
  "subSector:materials",
  "subSector:office-admin",
  "subSector:equipment-maintenance",
  "subSector:production-line",
  "subSector:sales",
  INBOX_PRESET_OTHER,
] as const;

const LOGISTICS_PRESET_IDS = [
  "subSector:warehouse",
  "subSector:materials",
  INBOX_PRESET_OTHER,
] as const;

const TECHNOLOGY_PRESET_IDS = [
  "subSector:frontend-dev",
  "subSector:backend-dev",
  "subSector:fullstack-dev",
  "subSector:devops",
  "subSector:mobile-dev",
  "subSector:game-dev",
  "subSector:data-ml",
  "subSector:qa-automation",
  "subSector:product-design",
  INBOX_PRESET_OTHER,
] as const;

const OPS_PRESET_IDS = [
  "subSector:ecommerce-ops",
  "subSector:livestream-ops",
  "subSector:customer-support",
  "subSector:content-ops",
  "subSector:community-ops",
  "subSector:sales",
  "subSector:office-admin",
  INBOX_PRESET_OTHER,
] as const;

const SERVICES_PRESET_IDS = [
  "subSector:office-admin",
  "subSector:sales",
  "subSector:food-service",
  INBOX_PRESET_OTHER,
] as const;

const GENERIC_PRESET_IDS = [
  "subSector:office-admin",
  "subSector:sales",
  INBOX_PRESET_OTHER,
] as const;

const GROUP_PRESET_IDS: Record<Exclude<IndustryGroupId, "all">, readonly string[]> = {
  manufacturing: MANUFACTURING_PRESET_IDS,
  logistics: LOGISTICS_PRESET_IDS,
  technology: TECHNOLOGY_PRESET_IDS,
  services: SERVICES_PRESET_IDS,
  finance: GENERIC_PRESET_IDS,
  public: ["subSector:office-admin", INBOX_PRESET_OTHER],
  other: GENERIC_PRESET_IDS,
};

/** Industry-specific overrides when a catalog industry needs a tailored chip row. */
const INDUSTRY_PRESET_OVERRIDES: Record<string, readonly string[]> = {
  "industry:it-software": TECHNOLOGY_PRESET_IDS,
  "industry:internet-platform": OPS_PRESET_IDS,
  "industry:retail-ecommerce": OPS_PRESET_IDS,
  "industry:media-creative": [
    "subSector:content-ops",
    "subSector:community-ops",
    "subSector:product-design",
    "subSector:sales",
    INBOX_PRESET_OTHER,
  ],
  "industry:telecom": [
    "subSector:backend-dev",
    "subSector:devops",
    "subSector:mobile-dev",
    "subSector:qa-automation",
    INBOX_PRESET_OTHER,
  ],
  "industry:electronics-manufacturing": MANUFACTURING_PRESET_IDS,
  "industry:general-manufacturing": MANUFACTURING_PRESET_IDS,
  "industry:automotive": MANUFACTURING_PRESET_IDS,
  "industry:logistics-warehousing": LOGISTICS_PRESET_IDS,
  "industry:transport-delivery": LOGISTICS_PRESET_IDS,
  "industry:food-service": ["subSector:food-service", "subSector:sales", INBOX_PRESET_OTHER],
};

export function resolveInboxFilterPresetIds(industryLabel: string): string[] {
  const trimmed = industryLabel.trim();
  if (!trimmed) return [...MANUFACTURING_PRESET_IDS];

  const industryId = resolveIndustryIdFromLabel(trimmed);
  if (industryId && industryId in INDUSTRY_PRESET_OVERRIDES) {
    return [...INDUSTRY_PRESET_OVERRIDES[industryId]];
  }

  const group = resolveIndustryGroupFromLabel(trimmed);
  return [...GROUP_PRESET_IDS[group]];
}

export function resolveInboxFilterPresetIdsForIndustries(industryLabels: string[]): string[] {
  const seen = new Set<string>();
  const presetIds: string[] = [];

  for (const label of industryLabels) {
    for (const presetId of resolveInboxFilterPresetIds(label)) {
      if (seen.has(presetId)) continue;
      seen.add(presetId);
      presetIds.push(presetId);
    }
  }

  return presetIds;
}

/** Prefer role-family chips when profile intent is clear (ops / tech / design…). */
export function resolveInboxFilterPresetIdsForProfile(input: {
  industries: string[];
  roles: string[];
  remoteOnly?: boolean;
}): string[] {
  const families = resolveRoleFamilies({
    id: "inbox-presets",
    constraints: {
      primaryCity: "",
      acceptableCities: [],
      remotePreference: input.remoteOnly === false ? "hybrid-ok" : "remote-only",
      employmentTypes: ["full-time", "part-time", "contract"],
      allowAgencyPostings: true,
      hideRedFlagListings: true,
      preferDirectHire: false,
    },
    intent: {
      desiredRoles: input.roles,
      desiredIndustries: input.industries,
      avoidRoles: [],
      avoidPhrases: [],
      industryProximity: "open-to-any",
      excludeProductionLine: false,
      excludeSales: false,
      excludeFoodService: false,
    },
    artifacts: [],
    skillTokens: [],
    certificates: [],
    experienceYears: 0,
    educationLevel: "high-school",
    languages: [],
    inferredCapabilities: [],
    seekerDigest: "",
  });

  if (families.length > 0 && families.length < 5) {
    const familyPresets = inboxPresetIdsForRoleFamilies(families);
    if (familyPresets.length > 0) {
      return [...familyPresets, INBOX_PRESET_OTHER];
    }
  }

  const fromIndustry = resolveInboxFilterPresetIdsForIndustries(input.industries);
  if (fromIndustry.length > 0) return fromIndustry;
  return [...OPS_PRESET_IDS];
}

export function inboxItemMatchesRoleFamily(
  item: InboxItem,
  family: RoleFamilyId,
): boolean {
  return opportunityMatchesRoleFamily(item.opportunity.roleCategories, family);
}

export function inboxFilterPresetLabel(presetId: string, locale: string): string | null {
  if (presetId === INBOX_PRESET_OTHER) return null;
  const node = getTaxonomyNode(presetId);
  if (!node) return null;
  return taxonomyLabel(node, locale);
}

function opportunityCorpus(item: InboxItem): string {
  return [
    item.opportunity.title,
    item.opportunity.body,
    item.opportunity.employerHint,
    item.match.explanation,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function taxonomyRefsForItem(item: InboxItem): string[] {
  const refs = [
    ...(item.opportunity.taxonomyRefs ?? []),
    ...(item.match.taxonomyHits ?? []),
  ];
  return refs.map((ref) => ref.id);
}

function matchesOtherPreset(item: InboxItem, activePresetIds: string[]): boolean {
  if (item.opportunity.roleCategories.includes("other" as RoleCategory)) return true;
  const specificPresets = activePresetIds.filter((id) => id !== INBOX_PRESET_OTHER);
  return !specificPresets.some((presetId) => matchesSpecificPreset(item, presetId));
}

function matchesSpecificPreset(item: InboxItem, presetId: string): boolean {
  const node = getTaxonomyNode(presetId);
  if (!node) return false;

  const corpus = opportunityCorpus(item);
  if (node.matchTerms?.some((term) => corpus.includes(term.toLowerCase()))) {
    return true;
  }

  if (taxonomyRefsForItem(item).includes(presetId)) {
    return true;
  }

  if (node.roleCategory && item.opportunity.roleCategories.includes(node.roleCategory)) {
    return true;
  }

  return false;
}

export function inboxItemMatchesPreset(
  item: InboxItem,
  presetId: string,
  activePresetIds: string[],
): boolean {
  if (presetId === INBOX_PRESET_OTHER) {
    return matchesOtherPreset(item, activePresetIds);
  }
  return matchesSpecificPreset(item, presetId);
}
