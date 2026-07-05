import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractContactHints, extractSourceSite } from "./contact-extract.js";

describe("contact-extract", () => {
  it("extracts phones, email, wechat, and qq", () => {
    const hints = extractContactHints(
      "联系人：张先生 手机13800138000 座机0755-12345678 邮箱 hr@example.com 微信号 szhr2024 QQ：123456789",
    );

    assert.ok(hints.phones.includes("13800138000"));
    assert.ok(hints.phones.some((p) => p.includes("0755")));
    assert.deepEqual(hints.emails, ["hr@example.com"]);
    assert.ok(hints.wechat.includes("szhr2024"));
    assert.deepEqual(hints.qq, ["123456789"]);
  });

  it("extracts source site hostname", () => {
    assert.equal(extractSourceSite("https://hrss.sz.gov.cn/tzgg/1.html"), "hrss.sz.gov.cn");
  });
});
