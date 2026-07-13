import type { SeekerProfile } from "@aperio-j/core";
import type { RegistryStreamDef } from "./probe-packs.js";
import { isRemoteOpsProfile } from "./probe-packs.js";

/**
 * Experimental CN freelance / gig intake (威客、远程零工).
 * Prefer RSS where available; list pages may need China IP or Playwright.
 */
export const CN_FREELANCE_REGISTRY_STREAMS: RegistryStreamDef[] = [
  {
    id: "cn-eleduck-rss",
    label: "电鸭社区·RSS",
    seedUrl: "https://eleduck.com/feed/latest.xml",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "cn-eleduck-jobs",
    label: "电鸭社区·远程招聘",
    seedUrl: "https://eleduck.com/jobs-channel",
    kind: "list_page",
    domainTier: "aggregator",
  },
  {
    id: "cn-zbj-demands",
    label: "猪八戒·需求大厅",
    seedUrl: "https://www.zbj.com/xq/",
    kind: "list_page",
    domainTier: "aggregator",
  },
  {
    id: "cn-epwk-home",
    label: "一品威客",
    seedUrl: "https://www.epwk.com/",
    kind: "list_page",
    domainTier: "aggregator",
  },
];

export const CN_FREELANCE_ROLE_KEYWORDS = [
  "威客",
  "自由职业",
  "零工",
  "零活",
  "兼职",
  "外包",
  "接单",
  "项目制",
  "freelance",
  "freelancer",
  "gig",
  "contractor",
  "电商运营",
  "直播运营",
  "店铺运营",
  "内容运营",
  "社群运营",
  "新媒体",
  "客服",
  "远程运营",
  "运营助理",
  "virtual assistant",
  "e-commerce",
  "ecommerce",
  "live stream",
  "livestream",
  "community manager",
  "social media",
  "content operations",
  "customer support",
];

function profileIntentCorpus(profile: Pick<SeekerProfile, "intent" | "artifacts">): string {
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

/** True when profile targets remote/gig/freelance work (ops, 威客, contract-friendly). */
export function isCnFreelanceIntentProfile(profile: SeekerProfile): boolean {
  if (profile.constraints.remotePreference === "onsite-only") return false;
  if (process.env.APERO_J_CN_FREELANCE_EXPERIMENTAL === "false") return false;
  if (isRemoteOpsProfile(profile)) return true;

  const corpus = profileIntentCorpus(profile);
  if (!corpus.trim()) return false;

  return CN_FREELANCE_ROLE_KEYWORDS.some((keyword) => {
    const norm = keyword.trim().toLowerCase();
    return norm.length >= 2 && corpus.includes(norm);
  });
}

export function isCnFreelanceStreamUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "eleduck.com" ||
      host.endsWith(".eleduck.com") ||
      host.endsWith("zbj.com") ||
      host.endsWith("epwk.com")
    );
  } catch {
    return false;
  }
}
