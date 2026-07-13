import type { RawFeedItem, RoleCategory, SeekerProfile } from "@aperio-j/core";
import { isRemoteOpsProfile } from "@aperio-j/probe";
import { countIntentHits, expandIntentTerms } from "./intent-expansion.js";
import {
  classifyRoleCategories,
  OPS_ROLE_CATEGORIES,
  TECH_ROLE_CATEGORIES,
} from "./role-categories.js";

const TECH_SIGNAL =
  /\b(?:developer|engineer|programmer|devops|devsecops|sre|architect|full[- ]?stack|frontend|backend|software|platform|infrastructure|database|data\s+(?:scientist|engineer|analyst)|machine\s+learning|mlops|ai\s+engineer|cybersecurity|security\s+engineer|ux|ui|product\s+(?:manager|designer)|figma|typescript|javascript|python|golang|rust|kubernetes|terraform)\b|开发工程师|软件工程师|程序员|前端开发|后端开发|全栈开发|运维工程师|数据工程|算法工程师|测试工程师/iu;

const OPS_SIGNAL =
  /\b(?:operations|ops|customer\s+(?:support|success|service)|community\s+manager|social\s+media|content\s+(?:creator|moderator|operations)|e-?commerce|ecommerce|live\s*stream|livestream|virtual\s+assistant|moderator|copywriter|growth|marketing\s+assistant|freelance|freelancer|gig|contractor)\b|运营|电商|直播|客服|内容运营|社群|新媒体|店铺运营|带货|威客|零工|外包|接单/iu;

const FACTORY_SIGNAL = /流水线|产线|普工|组装|操作工|production line|assembly line|warehouse picker|factory worker/iu;

function hasOpsRoleRelevance(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
  roleCategories: RoleCategory[] = [],
): boolean {
  const corpus = `${title} ${body}`;
  const expanded = expandIntentTerms([
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    ...profile.skillTokens,
  ]);
  if (countIntentHits(corpus, expanded).length > 0) return true;
  if (OPS_SIGNAL.test(corpus)) return true;
  if (roleCategories.some((category) => OPS_ROLE_CATEGORIES.includes(category))) return true;
  return false;
}

export function isIrrelevantListingForRemoteOpsProfile(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
  roleCategories: RoleCategory[] = [],
): boolean {
  if (!isRemoteOpsProfile(profile as SeekerProfile)) return false;
  if (hasOpsRoleRelevance(title, body, profile, roleCategories)) return false;

  const corpus = `${title} ${body}`;
  if (FACTORY_SIGNAL.test(corpus)) return true;

  const onlyTechCategories =
    roleCategories.length > 0 &&
    roleCategories.every((category) => TECH_ROLE_CATEGORIES.includes(category));

  if (onlyTechCategories || (TECH_SIGNAL.test(corpus) && !OPS_SIGNAL.test(corpus))) {
    return true;
  }

  return false;
}

export function shouldDiscardRemoteOpsFeedItem(
  item: Pick<RawFeedItem, "title" | "body" | "url">,
  profile?: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
  options?: { roleCategories?: RoleCategory[] },
): boolean {
  if (!profile) return false;
  return isIrrelevantListingForRemoteOpsProfile(
    item.title,
    item.body,
    profile,
    options?.roleCategories ?? [],
  );
}

export function filterRemoteOpsFeedItemsForProfile(
  items: RawFeedItem[],
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
): RawFeedItem[] {
  return items.filter((item) => {
    const categories = classifyRoleCategories(`${item.title} ${item.body}`);
    return !shouldDiscardRemoteOpsFeedItem(item, profile, { roleCategories: categories });
  });
}
