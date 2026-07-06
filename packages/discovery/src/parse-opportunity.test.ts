import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOpportunity } from "./parse-opportunity.js";

describe("parseOpportunity", () => {
  it("classifies QC direct hire in Shenzhen", () => {
    const opp = parseOpportunity({
      title: "IQC质检员 公司直招",
      body: "深圳龙岗 电子厂 IQC来料检验 全职 高中以上学历 两班倒",
      url: "https://example.com/1",
      sourceId: "test",
      fetchedAt: "2026-07-03T00:00:00Z",
    });

    assert.ok(opp.roleCategories.includes("qc"));
    assert.equal(opp.posterType, "direct");
    assert.match(opp.locationText ?? "", /深圳/);
    assert.equal(opp.redFlags.length, 0);
  });

  it("flags labor agency deposit scam", () => {
    const opp = parseOpportunity({
      title: "高薪直招普工",
      body: "劳务公司招聘 流水线组装 交押金500元 日结预支 加微信",
      url: "https://example.com/2",
      sourceId: "test",
      fetchedAt: "2026-07-03T00:00:00Z",
    });

    assert.ok(opp.roleCategories.includes("production-line"));
    assert.ok(opp.redFlags.length >= 1);
    assert.ok((opp.trustWarnings ?? []).length >= 1);
  });

  it("classifies remote backend engineer listings", () => {
    const opp = parseOpportunity({
      title: "Senior Backend Engineer (Remote)",
      body: "Python FastAPI PostgreSQL EU timezone",
      url: "https://example.com/backend",
      sourceId: "remotive",
      fetchedAt: "2026-07-05T00:00:00Z",
    });

    assert.ok(opp.roleCategories.includes("backend-dev"));
  });
});
