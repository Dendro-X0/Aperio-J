import type { RawFeedItem, SeekerProfile } from "@aperio-j/core";
import { inferCapabilitiesFromArtifacts } from "@aperio-j/discovery/transferable";

/** Fixture seeker: electronics assembly background, wants to leave production line. */
export function createFixtureSeekerProfile(): SeekerProfile {
  const artifacts = [
    {
      id: "art-1",
      title: "手机组装操作员",
      industry: "电子代工",
      employerType: "代工厂",
      duties: "流水线组装 Google Pixel 类手机，外观检查，ESD 防护",
      tools: ["防静电手环", "扭矩螺丝刀"],
      period: "2022–present",
    },
    {
      id: "art-2",
      title: "显示器生产",
      industry: "电子制造",
      duties: "老化测试，包装，外观检",
      tools: [],
      period: "2020–2022",
    },
  ];

  return {
    id: "seeker-fixture-1",
    constraints: {
      primaryCity: "深圳",
      acceptableCities: ["东莞", "惠州"],
      remotePreference: "onsite-only",
      employmentTypes: ["full-time", "part-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
    },
    intent: {
      desiredRoles: ["质检", "仓储", "物料", "设备维护"],
      desiredIndustries: ["电子"],
      avoidRoles: ["流水线", "普工", "销售", "服务员"],
      avoidPhrases: ["劳务", "押金"],
      industryProximity: "same-industry-non-production",
      excludeProductionLine: true,
      excludeSales: true,
      excludeFoodService: true,
    },
    artifacts,
    skillTokens: ["组装", "外观检查", "ESD", "老化测试"],
    certificates: [],
    experienceYears: 4,
    educationLevel: "high-school",
    languages: ["普通话"],
    inferredCapabilities: inferCapabilitiesFromArtifacts(artifacts),
  };
}

export const FIXTURE_FEED_ITEMS: RawFeedItem[] = [
  {
    title: "IQC质检员 公司直招",
    body: "深圳龙岗电子厂 IQC来料检验 全职 经验不限 长白班 企业直招",
    url: "https://example.com/jobs/iqc",
    sourceId: "fixture",
    fetchedAt: "2026-07-03T00:00:00Z",
  },
  {
    title: "仓库理货员",
    body: "深圳宝安 仓储物料管理 熟悉电子元件优先 全职",
    url: "https://example.com/jobs/warehouse",
    sourceId: "fixture",
    fetchedAt: "2026-07-03T00:00:00Z",
  },
  {
    title: "流水线普工 高薪直招",
    body: "劳务公司 深圳 流水线组装 交押金 日结预支 两班倒",
    url: "https://example.com/jobs/line",
    sourceId: "fixture",
    fetchedAt: "2026-07-03T00:00:00Z",
  },
  {
    title: "电话销售",
    body: "深圳福田 推广手机配件 底薪加提成 全职",
    url: "https://example.com/jobs/sales",
    sourceId: "fixture",
    fetchedAt: "2026-07-03T00:00:00Z",
  },
  {
    title: "设备维护辅助",
    body: "深圳龙岗 电子厂 设备保养 机修辅助 全职 企业直招",
    url: "https://example.com/jobs/maint",
    sourceId: "fixture",
    fetchedAt: "2026-07-03T00:00:00Z",
  },
];
