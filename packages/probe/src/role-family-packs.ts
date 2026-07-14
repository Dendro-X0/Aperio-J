import type { RoleCategory, SeekerProfile } from "@aperio-j/core";
import {
  REMOTE_REGISTRY_STREAMS,
  isRemoteOpsProfile,
  isRemoteTechProfile,
  type RegistryStreamDef,
} from "./probe-packs.js";

/** Coarse role families used to pick remote boards and inbox chips. */
export type RoleFamilyId = "tech" | "ops" | "design" | "product" | "support";

export const ROLE_FAMILY_IDS: RoleFamilyId[] = [
  "ops",
  "support",
  "design",
  "product",
  "tech",
];

/** Role categories belonging to each family (inbox / match filtering). */
export const ROLE_FAMILY_CATEGORIES: Record<RoleFamilyId, RoleCategory[]> = {
  tech: [
    "frontend-dev",
    "backend-dev",
    "fullstack-dev",
    "devops",
    "mobile-dev",
    "game-dev",
    "data-ml",
    "qa-automation",
  ],
  ops: [
    "ecommerce-ops",
    "livestream-ops",
    "content-ops",
    "community-ops",
    "sales",
  ],
  design: ["product-design"],
  product: ["product-design"],
  support: ["customer-support", "office-admin"],
};

/** Inbox taxonomy chip ids preferred for each family. */
export const ROLE_FAMILY_INBOX_PRESETS: Record<RoleFamilyId, string[]> = {
  tech: [
    "subSector:frontend-dev",
    "subSector:backend-dev",
    "subSector:fullstack-dev",
    "subSector:devops",
    "subSector:mobile-dev",
    "subSector:game-dev",
    "subSector:data-ml",
    "subSector:qa-automation",
    "subSector:product-design",
  ],
  ops: [
    "subSector:ecommerce-ops",
    "subSector:livestream-ops",
    "subSector:content-ops",
    "subSector:community-ops",
    "subSector:customer-support",
    "subSector:sales",
    "subSector:office-admin",
  ],
  design: ["subSector:product-design"],
  product: ["subSector:product-design", "subSector:backend-dev"],
  support: [
    "subSector:customer-support",
    "subSector:office-admin",
    "subSector:content-ops",
    "subSector:community-ops",
  ],
};

/**
 * Remote RSS stream ids preferred per family.
 * Mixed general boards stay available as supplements.
 */
const FAMILY_STREAM_IDS: Record<RoleFamilyId, string[]> = {
  tech: [
    "wwr-programming",
    "wwr-devops",
    "remotive-feed",
    "remoteok-feed",
    "hn-hiring",
    "arbeitnow-feed",
    "dynamitejobs-feed",
    "jobspresso-feed",
    "workingnomads-feed",
    "remoteco-feed",
  ],
  ops: [
    "wwr-customer-support",
    "wwr-sales-marketing",
    "wwr-all-other",
    "wwr-design",
    "remoteco-feed",
    "jobspresso-feed",
    "dynamitejobs-feed",
    "workingnomads-feed",
  ],
  design: ["wwr-design", "wwr-product", "remoteco-feed", "jobspresso-feed"],
  product: [
    "wwr-product",
    "wwr-design",
    "wwr-sales-marketing",
    "remotive-feed",
    "remoteco-feed",
  ],
  support: [
    "wwr-customer-support",
    "wwr-all-other",
    "wwr-sales-marketing",
    "remoteco-feed",
    "jobspresso-feed",
  ],
};

/** Tech-skewed boards that ops/support profiles should not auto-enable. */
const TECH_HEAVY_STREAM_IDS = new Set([
  "wwr-programming",
  "wwr-devops",
  "hn-hiring",
  "remotive-feed",
  "remoteok-feed",
  "arbeitnow-feed",
  "wwr-all-remote",
]);

const DESIGN_INTENT =
  /\b(?:designer|design|figma|ui\/ux|ux\/ui)\b|设计师|交互设计|视觉设计|平面设计/iu;
const PRODUCT_INTENT =
  /\b(?:product\s+manager|product\s+owner|\bpm\b)\b|产品经理|产品运营/iu;
const SUPPORT_INTENT =
  /\b(?:customer\s+support|customer\s+service|help\s+desk|virtual\s+assistant)\b|客服|客户支持|助理/iu;

function profileCorpus(profile: Pick<SeekerProfile, "intent" | "artifacts">): string {
  return [
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    ...profile.artifacts.map((artifact) => artifact.title),
    ...profile.artifacts.map((artifact) => artifact.duties),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Resolve one or more role families from profile intent. */
export function resolveRoleFamilies(profile: SeekerProfile): RoleFamilyId[] {
  if (profile.constraints.remotePreference === "onsite-only") return [];

  const corpus = profileCorpus(profile);
  const families = new Set<RoleFamilyId>();

  if (isRemoteOpsProfile(profile)) {
    families.add("ops");
    families.add("support");
  }
  if (SUPPORT_INTENT.test(corpus)) families.add("support");
  if (DESIGN_INTENT.test(corpus)) families.add("design");
  if (PRODUCT_INTENT.test(corpus)) families.add("product");
  if (isRemoteTechProfile(profile) && !isRemoteOpsProfile(profile)) {
    families.add("tech");
  }

  // Pure remote with empty / vague intent: keep broad discovery.
  if (families.size === 0) {
    if (profile.constraints.remotePreference === "remote-only" || !profile.constraints.primaryCity) {
      return ["tech", "design", "ops", "support", "product"];
    }
    return ["tech", "design"];
  }

  return ROLE_FAMILY_IDS.filter((id) => families.has(id));
}

export function isTechHeavyRemoteStreamId(streamId: string): boolean {
  return TECH_HEAVY_STREAM_IDS.has(streamId);
}

export function remoteStreamIdsForFamilies(families: RoleFamilyId[]): Set<string> {
  const ids = new Set<string>();
  for (const family of families) {
    for (const streamId of FAMILY_STREAM_IDS[family] ?? []) {
      ids.add(streamId);
    }
  }
  return ids;
}

export function selectRemoteRegistryStreams(
  profile: SeekerProfile,
  options?: { hybridCap?: number },
): RegistryStreamDef[] {
  const families = resolveRoleFamilies(profile);
  if (families.length === 0) return [];

  const allowIds = remoteStreamIdsForFamilies(families);
  const byId = new Map(REMOTE_REGISTRY_STREAMS.map((stream) => [stream.id, stream]));
  const selected: RegistryStreamDef[] = [];

  for (const streamId of allowIds) {
    const stream = byId.get(streamId);
    if (stream) selected.push(stream);
  }

  // Preserve catalog order for stability.
  const order = new Map(REMOTE_REGISTRY_STREAMS.map((stream, index) => [stream.id, index]));
  selected.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const city = profile.constraints.primaryCity.trim();
  const preference = profile.constraints.remotePreference;
  if (city && preference === "hybrid-ok") {
    const cap = options?.hybridCap ?? 8;
    return selected.slice(0, cap);
  }
  return selected;
}

export function streamIdForRemoteSeedUrl(seedUrl: string): string | null {
  const match = REMOTE_REGISTRY_STREAMS.find((stream) => stream.seedUrl === seedUrl);
  return match?.id ?? null;
}

export function inboxPresetIdsForRoleFamilies(families: RoleFamilyId[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const family of families) {
    for (const presetId of ROLE_FAMILY_INBOX_PRESETS[family] ?? []) {
      if (seen.has(presetId)) continue;
      seen.add(presetId);
      ids.push(presetId);
    }
  }
  return ids;
}

export function opportunityMatchesRoleFamily(
  roleCategories: RoleCategory[],
  family: RoleFamilyId,
): boolean {
  const allowed = new Set(ROLE_FAMILY_CATEGORIES[family]);
  return roleCategories.some((category) => allowed.has(category));
}
