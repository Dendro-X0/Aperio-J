import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  filterCnFeedItemsForProfile,
  isCnGigDeliveryListingForFactoryProfile,
  isCnIrrelevantListingForFactoryProfile,
  isCnLowValueListing,
  isCnPublicSectorListingForFactoryProfile,
  isCnWhiteCollarListingForFactoryProfile,
} from "./cn-feed-quality.js";

const factoryProfile = {
  intent: {
    desiredRoles: ["普工"],
    desiredIndustries: ["电子制造"],
    avoidRoles: [],
    avoidPhrases: [],
    industryProximity: "open-to-any" as const,
    excludeProductionLine: false,
    excludeSales: true,
    excludeFoodService: true,
  },
  artifacts: [],
  constraints: {
    primaryCity: "深圳",
    acceptableCities: [],
    remotePreference: "onsite-only",
    employmentTypes: ["full-time"],
    allowAgencyPostings: false,
    hideRedFlagListings: true,
    preferDirectHire: true,
  },
} satisfies Pick<SeekerProfile, "intent" | "artifacts" | "constraints">;

describe("cn-feed-quality", () => {
  it("drops gov service portals and attachment links", () => {
    assert.equal(isCnLowValueListing("人才园服务大厅办事预约", "https://hrss.sz.gov.cn/tzgg/"), true);
    assert.equal(
      isCnLowValueListing("附件1-1.深圳市事业单位2026年公开招聘", "https://hrss.sz.gov.cn/a.xls"),
      true,
    );
    assert.equal(
      isCnLowValueListing("深圳宝安仓储理货员岗位招聘", "https://hrss.sz.gov.cn/tzgg/01.html"),
      false,
    );
  });

  it("drops teacher and civil-service listings for factory profiles", () => {
    assert.equal(
      isCnPublicSectorListingForFactoryProfile(
        "深圳中学2026年赴外招聘教师岗位",
        "公开招聘中小学教师",
        factoryProfile,
      ),
      true,
    );
    assert.equal(
      isCnPublicSectorListingForFactoryProfile(
        "龙岗电子厂IQC质检员招聘",
        "普工 质检 电子制造",
        factoryProfile,
      ),
      false,
    );
  });

  it("drops gig delivery listings for factory profiles", () => {
    assert.equal(
      isCnGigDeliveryListingForFactoryProfile(
        "美团骑手/可以新手/就近安排/站点有配车 深圳",
        "餐饮外卖 系统派单",
        factoryProfile,
      ),
      true,
    );
    assert.equal(
      isCnGigDeliveryListingForFactoryProfile(
        "电子厂普工招聘坐班普通工衣工作轻松",
        "深圳龙华",
        factoryProfile,
      ),
      false,
    );
  });

  it("drops white-collar tech listings for factory profiles", () => {
    assert.equal(
      isCnWhiteCollarListingForFactoryProfile(
        "java开发——深圳",
        "后端开发 Spring Boot",
        factoryProfile,
      ),
      true,
    );
    assert.equal(
      isCnWhiteCollarListingForFactoryProfile(
        "SMT工艺工程师",
        "电子制造 波峰焊",
        factoryProfile,
      ),
      false,
    );
    assert.equal(
      isCnIrrelevantListingForFactoryProfile(
        "测试工程师",
        "软件测试 自动化",
        factoryProfile,
        ["other"],
      ),
      true,
    );
    assert.equal(
      isCnIrrelevantListingForFactoryProfile(
        "深圳龙华电子厂普工",
        "产线操作 两班倒",
        factoryProfile,
        ["production-line"],
      ),
      false,
    );
  });

  it("filters a mixed feed batch", () => {
    const filtered = filterCnFeedItemsForProfile(
      [
        {
          title: "人才园服务大厅办事预约",
          body: "",
          url: "https://hrss.sz.gov.cn/",
          sourceId: "a",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "深圳中学教师招聘岗位",
          body: "事业单位公开招聘",
          url: "https://hrss.sz.gov.cn/tzgg/teacher.html",
          sourceId: "a",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "java开发——深圳",
          body: "后端 Spring",
          url: "https://shenzhen.zhaopin.com/job/java.html",
          sourceId: "c",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "深圳龙华普工招聘",
          body: "电子厂产线操作工",
          url: "https://m.51job.com/jobs/1.html",
          sourceId: "b",
          fetchedAt: new Date().toISOString(),
        },
      ],
      factoryProfile,
    );

    assert.equal(filtered.length, 1);
    assert.match(filtered[0]!.title, /普工/);
  });
});
