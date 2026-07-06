import type { RawFeedItem, RoleCategory, SeekerProfile } from "@aperio-j/core";
import { isCnLocalFirstOccupation } from "@aperio-j/probe";
import { isGovCnHost } from "./cn-sources.js";
import { countIntentHits, expandIntentTerms } from "./intent-expansion.js";

const ATTACHMENT_URL = /\.(?:xls|xlsx|doc|docx|pdf|zip|rar)(?:\?|$)/i;

const LOW_VALUE_TITLE =
  /^(?:附件\d*|下载|履职|专栏|通知|公示栏|迁移公告)$/u;

const LOW_VALUE_TEXT =
  /(?:预约平台|服务大厅|办事预约|社保业务预约|人才园.*预约|网站迁移|专栏建设|绩效.*文件|反馈意见|热线电话|履职件|施工许可|职业伤害|工伤认定|认定决定书|认定结论|查询详细信息|规范性文件|岗位清单)/u;

const GOV_ADMIN_TITLE =
  /^关于.{2,40}(?:施工许可|职业伤害|工伤|认定|注销|变更|备案|公示)(?!.*(?:招聘|招考|岗位|诚聘))/u;

const PUBLIC_SECTOR_TEXT =
  /(?:事业单位|中小学教师|中学(?:教|)?师|小学教师|大学教师|教职人员|公职人员|公务员招考|公开招聘工作人员|招考简章|赴外招聘|教师招聘岗位)/u;

const FACTORY_SIGNAL =
  /(?:普工|产线|质检|工厂|制造|技工|仓储|操作工|电子厂|组装|iqc|物料员|生产员|包装工|smt|贴片|波峰焊)/i;

const FACTORY_ROLE_CATEGORIES: RoleCategory[] = [
  "production-line",
  "qc",
  "warehouse",
  "materials",
  "equipment-maintenance",
  "general-labor",
];

const WHITE_COLLAR_TEXT =
  /(?:java|python|golang|go开发|前端|后端|全栈|软件工程师|开发工程师|测试工程师|产品经理|ui设计|ux设计|视觉设计|运营(?:经理|主管|专员|组长)|财务(?:助理|主管|经理)?|会计|出纳|人事专员|hr专员|猎头|跨境电商|亚马逊|oa开发|泛微|android开发|ios开发|php开发|\.net|c\+\+开发|数据分析师|算法工程师|架构师|nlp|深度学习|机器学习|ai工程师|大模型|新媒体|直播运营|视频剪辑|客服工程师|海外财务|电商客服)/iu;

const FACTORY_ADJACENT_ENGINEER =
  /(?:工艺工程师|设备工程师|质量工程师|品保工程师|制造工程师|生产工程师|pe工程师|ie工程师|smt工程师|npi工程师)/iu;

/** Gov portal navigation / service pages that are not job listings. */
export function isCnLowValueListing(title: string, url: string): boolean {
  const trimmed = title.trim();
  const corpus = `${trimmed} ${url}`;

  if (ATTACHMENT_URL.test(url)) return true;
  if (LOW_VALUE_TITLE.test(trimmed)) return true;
  if (LOW_VALUE_TEXT.test(corpus)) return true;
  if (GOV_ADMIN_TITLE.test(trimmed)) return true;
  if (/附件\d*[-.]?/i.test(trimmed) && /\.(?:xls|doc|pdf)/i.test(corpus)) return true;

  if (isGovCnHost(url)) {
    if (/(?:预约|大厅|平台|指南|专栏)(?!.*(?:招聘|招考|岗位))/u.test(trimmed)) {
      if (!/(?:招聘|招考|岗位|诚聘|用工)/u.test(trimmed)) return true;
    }
    if (/^关于.*(?:有限公司|股份公司).*(?:申请|注销|变更|备案)/u.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/** Teacher / civil-service listings when the profile targets factory/blue-collar roles. */
export function isCnPublicSectorListingForFactoryProfile(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
): boolean {
  if (!isCnLocalFirstOccupation(profile as SeekerProfile)) return false;

  const corpus = `${title} ${body}`;
  if (!PUBLIC_SECTOR_TEXT.test(corpus)) return false;
  if (FACTORY_SIGNAL.test(corpus)) return false;
  return true;
}

const GIG_DELIVERY_TEXT =
  /(?:骑手|配送员|送餐|外卖员|跑腿|驻店配送|美团骑手|朴朴|站点直招骑手|骑车配送|配车配(?:电|车)|\d+元一单|瑞幸咖啡驻店)/u;

const WAF_BODY =
  /(?:访问过于频繁|验证码校验|证码校验|请在五分钟内完成验证)/u;

function stripWafPollutedBody(item: RawFeedItem): RawFeedItem {
  if (!WAF_BODY.test(item.body)) return item;
  return { ...item, body: item.title };
}

/** Gig-economy delivery listings when the profile targets factory/blue-collar roles. */
export function isCnGigDeliveryListingForFactoryProfile(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
): boolean {
  if (!isCnLocalFirstOccupation(profile as SeekerProfile)) return false;

  const corpus = `${title} ${body}`;
  if (!GIG_DELIVERY_TEXT.test(corpus)) return false;
  if (FACTORY_SIGNAL.test(corpus)) return false;
  return true;
}

/** Office / software / e-commerce listings when the profile targets factory/blue-collar roles. */
export function isCnWhiteCollarListingForFactoryProfile(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
): boolean {
  if (!isCnLocalFirstOccupation(profile as SeekerProfile)) return false;

  const corpus = `${title} ${body}`;
  if (FACTORY_SIGNAL.test(corpus)) return false;
  if (FACTORY_ADJACENT_ENGINEER.test(corpus)) return false;
  return WHITE_COLLAR_TEXT.test(corpus);
}

function hasFactoryRoleRelevance(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
  roleCategories: RoleCategory[] = [],
): boolean {
  const corpus = `${title} ${body}`;
  const expanded = expandIntentTerms([
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
  ]);
  if (countIntentHits(corpus, expanded).length > 0) return true;
  if (FACTORY_SIGNAL.test(corpus)) return true;
  if (roleCategories.some((category) => FACTORY_ROLE_CATEGORIES.includes(category))) return true;
  return false;
}

export function isCnIrrelevantListingForFactoryProfile(
  title: string,
  body: string,
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
  roleCategories: RoleCategory[] = [],
): boolean {
  if (!isCnLocalFirstOccupation(profile as SeekerProfile)) return false;
  if (isCnWhiteCollarListingForFactoryProfile(title, body, profile)) return true;
  if (isCnPublicSectorListingForFactoryProfile(title, body, profile)) return true;
  if (isCnGigDeliveryListingForFactoryProfile(title, body, profile)) return true;
  return !hasFactoryRoleRelevance(title, body, profile, roleCategories);
}

export function shouldDiscardCnFeedItem(
  item: Pick<RawFeedItem, "title" | "body" | "url">,
  profile?: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
  options?: { roleCategories?: RoleCategory[] },
): boolean {
  if (isCnLowValueListing(item.title, item.url)) return true;
  if (
    profile &&
    isCnIrrelevantListingForFactoryProfile(
      item.title,
      item.body,
      profile,
      options?.roleCategories ?? [],
    )
  ) {
    return true;
  }
  return false;
}

export function filterCnFeedItemsForProfile(
  items: RawFeedItem[],
  profile: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
): RawFeedItem[] {
  return items
    .map(stripWafPollutedBody)
    .filter((item) => !shouldDiscardCnFeedItem(item, profile));
}
