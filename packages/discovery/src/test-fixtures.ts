import type { SeekerProfile } from "@aperio-j/core";

/** Minimal seeker profile for discovery package tests. */
export function createTestSeekerProfile(): SeekerProfile {
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
    artifacts: [
      {
        id: "art-1",
        title: "手机组装操作员",
        industry: "电子代工",
        employerType: "代工厂",
        duties: "流水线组装 Google Pixel 类手机，外观检查，ESD 防护",
        tools: ["防静电手环", "扭矩螺丝刀"],
        period: "2022–present",
      },
    ],
    skillTokens: ["组装", "外观检查", "ESD", "老化测试"],
    certificates: [],
    experienceYears: 4,
    educationLevel: "high-school",
    languages: ["普通话"],
    inferredCapabilities: ["assembly", "visual-inspection", "esd-handling"],
  };
}
