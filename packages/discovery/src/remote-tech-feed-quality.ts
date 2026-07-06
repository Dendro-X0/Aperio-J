import type { RawFeedItem, RoleCategory, SeekerProfile } from "@aperio-j/core";
import { isRemoteTechProfile } from "@aperio-j/probe";
import { countIntentHits, expandIntentTerms } from "./intent-expansion.js";
import { classifyRoleCategories, TECH_ROLE_CATEGORIES } from "./role-categories.js";

const TECH_SIGNAL =
  /\b(?:developer|engineer|programmer|devops|devsecops|sre|architect|full[- ]?stack|frontend|backend|software|platform|infrastructure|database|data\s+(?:scientist|engineer|analyst)|machine\s+learning|mlops|ai\s+engineer|cybersecurity|security\s+engineer|ux|ui|product\s+(?:manager|designer)|designer|figma|typescript|javascript|python|golang|rust|kubernetes|terraform)\b|开发工程师|软件工程师|程序员|前端|后端|全栈|运维|数据工程|算法工程师|产品经理|交互设计|视觉设计/iu;

const NON_TECH_REMOTE =
  /(?:ghostwriter|ghost\s*writer|administrative\s+assistant|executive\s+assistant|virtual\s+assistant|customer\s+support(?!\s+engineer)|technical\s+support\s+representative|call\s+center|data\s+entry|bookkeeper|billing\s+specialist|transcriptionist|telemarketer|appointment\s+setter|social\s+media\s+manager|content\s+moderator|onlyfans\s+chat|live\s+chat\s+agent|order\s+processor|receptionist|enrollment\s+specialist|claims\s+processor)/iu;

const TECH_ADJACENT_ALLOW =
  /(?:customer\s+success\s+engineer|support\s+engineer|solutions\s+engineer|sales\s+engineer|devrel|developer\s+advocate|technical\s+writer|qa\s+engineer|sdet|security\s+engineer)/iu;

export function isNonTechRemoteListing(title: string, body: string): boolean {
  const corpus = `${title} ${body}`;
  if (TECH_SIGNAL.test(corpus)) return false;
  if (TECH_ADJACENT_ALLOW.test(corpus)) return false;
  return NON_TECH_REMOTE.test(corpus);
}

function hasTechRoleRelevance(
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
  if (TECH_SIGNAL.test(corpus)) return true;
  if (roleCategories.some((category) => TECH_ROLE_CATEGORIES.includes(category))) return true;
  return false;
}

export function isIrrelevantListingForRemoteTechProfile(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
  roleCategories: RoleCategory[] = [],
): boolean {
  if (!isRemoteTechProfile(profile as SeekerProfile)) return false;
  if (isNonTechRemoteListing(title, body)) return true;

  const onlyNonTechCategories =
    roleCategories.length > 0 &&
    roleCategories.every(
      (category) =>
        category === "other" ||
        category === "office-admin" ||
        category === "sales" ||
        category === "food-service",
    );

  if (onlyNonTechCategories && !hasTechRoleRelevance(title, body, profile, roleCategories)) {
    return true;
  }

  return !hasTechRoleRelevance(title, body, profile, roleCategories);
}

export function shouldDiscardRemoteTechFeedItem(
  item: Pick<RawFeedItem, "title" | "body" | "url">,
  profile?: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
  options?: { roleCategories?: RoleCategory[] },
): boolean {
  if (!profile) return false;
  return isIrrelevantListingForRemoteTechProfile(
    item.title,
    item.body,
    profile,
    options?.roleCategories ?? [],
  );
}

export function filterRemoteTechFeedItemsForProfile(
  items: RawFeedItem[],
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints" | "skillTokens">,
): RawFeedItem[] {
  return items.filter((item) => {
    const categories = classifyRoleCategories(`${item.title} ${item.body}`);
    return !shouldDiscardRemoteTechFeedItem(item, profile, { roleCategories: categories });
  });
}
