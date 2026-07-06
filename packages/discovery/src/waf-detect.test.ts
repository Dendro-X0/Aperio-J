import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWafBlockedHtml } from "./waf-detect.js";

describe("waf-detect", () => {
  it("detects cn anti-bot pages", () => {
    assert.equal(
      isWafBlockedHtml("访问过于频繁，本次访问做以下验证码校验。请在五分钟内完成验证"),
      true,
    );
    assert.equal(isWafBlockedHtml("<html><body>深圳招聘普工</body></html>"), false);
  });
});
