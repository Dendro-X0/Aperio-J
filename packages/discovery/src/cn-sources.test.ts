import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterCnListPageItems,
  isCnCityHubListing,
  isCnNonJobGovNotice,
  isNationalAggregatorRootUrl,
  resolveCnCityListingUrl,
  seedUrlMatchesCityProfile,
} from "./cn-sources.js";

describe("cn-sources", () => {
  it("detects national aggregator root URLs", () => {
    assert.equal(isNationalAggregatorRootUrl("https://www.51job.com/"), true);
    assert.equal(isNationalAggregatorRootUrl("https://www.lagou.com/"), true);
    assert.equal(isNationalAggregatorRootUrl("https://www.zhipin.com/"), true);
    assert.equal(isNationalAggregatorRootUrl("https://www.zhipin.com/shenzhen/"), false);
    assert.equal(isNationalAggregatorRootUrl("https://shenzhen.zhaopin.com/"), false);
  });

  it("matches city-scoped aggregator seeds", () => {
    assert.equal(seedUrlMatchesCityProfile("https://www.51job.com/", "深圳"), false);
    assert.equal(seedUrlMatchesCityProfile("https://www.zhipin.com/shenzhen/", "深圳"), true);
    assert.equal(seedUrlMatchesCityProfile("https://shenzhen.zhaopin.com/", "深圳"), true);
    assert.equal(seedUrlMatchesCityProfile("https://hrss.sz.gov.cn/tzgg/", "深圳"), true);
  });

  it("flags city hub navigation listings", () => {
    assert.equal(isCnCityHubListing("安庆招聘网", ["深圳"]), true);
    assert.equal(isCnCityHubListing("深圳招聘网", ["深圳"]), false);
    assert.equal(isCnCityHubListing("查看更多职位", ["深圳"]), true);
  });

  it("flags non-job gov subsidy notices", () => {
    assert.equal(
      isCnNonJobGovNotice("深圳市人力资源和社会保障局关于实施2025年职业技能培训补贴项目"),
      true,
    );
    assert.equal(isCnNonJobGovNotice("深圳市龙岗区某电子厂 IQC质检员招聘公告"), false);
  });

  it("filters city hub items from list page results", () => {
    const filtered = filterCnListPageItems(
      [
        {
          title: "安庆招聘网",
          body: "安庆招聘网",
          url: "https://www.51job.com/anhui/",
          sourceId: "test",
          fetchedAt: new Date().toISOString(),
        },
        {
          title: "深圳宝安仓储理货员岗位招聘",
          body: "深圳宝安仓储理货员岗位招聘",
          url: "https://hrss.sz.gov.cn/xxgk/tzgg/202603/02.html",
          sourceId: "test",
          fetchedAt: new Date().toISOString(),
        },
      ],
      { profileCities: ["深圳"] },
    );

    assert.equal(filtered.length, 1);
    assert.match(filtered[0]!.title, /深圳/);
  });

  it("rewrites national aggregator roots to city listing URLs", () => {
    assert.equal(
      resolveCnCityListingUrl("https://www.zhipin.com/", "深圳"),
      "https://www.zhipin.com/shenzhen/",
    );
    assert.equal(
      resolveCnCityListingUrl("https://www.51job.com/", "深圳"),
      "https://shenzhen.zhaopin.com/",
    );
  });
});
