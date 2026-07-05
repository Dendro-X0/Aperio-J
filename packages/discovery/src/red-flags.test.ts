import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectRedFlagTiers } from "./red-flags.js";

describe("detectRedFlagTiers", () => {
  it("hard-excludes deposit scams (zh-CN)", () => {
    const tiers = detectRedFlagTiers("劳务公司招聘 交押金500元 入职", "zh-CN");
    assert.ok(tiers.hard.some((flag) => flag.includes("押金")));
  });

  it("hard-excludes deposit scams (en)", () => {
    const tiers = detectRedFlagTiers("劳务公司招聘 交押金500元 入职", "en");
    assert.ok(tiers.hard.some((flag) => flag.toLowerCase().includes("deposit")));
  });

  it("warns on off-platform contact without hard excluding", () => {
    const tiers = detectRedFlagTiers("公司直招质检 加微信详谈 深圳龙岗", "zh-CN");
    assert.ok(tiers.warn.some((flag) => flag.includes("站外")));
    assert.equal(tiers.hard.length, 0);
  });

  it("splits hard and warn for mixed scam post", () => {
    const tiers = detectRedFlagTiers("高薪直招 交培训费 日结预支 加微信", "zh-CN");
    assert.ok(tiers.hard.some((flag) => flag.includes("培训")));
    assert.ok(tiers.warn.length >= 2);
  });
});
