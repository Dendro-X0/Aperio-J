import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCnPlaywrightEnabled,
  needsPlaywrightRender,
} from "./cn-playwright-fetch.js";

describe("cn-playwright-fetch", () => {
  it("is disabled in test environment by default", () => {
    assert.equal(isCnPlaywrightEnabled(), false);
  });

  it("detects SPA shells that need rendering", () => {
    const shell = `<!DOCTYPE html><html><body><div id="root"></div><script>window.__INITIAL_STATE__={}</script></body></html>`;
    assert.equal(
      needsPlaywrightRender(shell, "https://www.zhipin.com/shenzhen/", 0),
      true,
    );
  });

  it("skips playwright when job links are already present", () => {
    const html = `<a href="/job_detail/abc123.html">深圳全栈工程师</a>`;
    assert.equal(
      needsPlaywrightRender(html, "https://www.zhipin.com/shenzhen/", 0),
      false,
    );
    assert.equal(
      needsPlaywrightRender("<html></html>", "https://www.zhipin.com/shenzhen/", 3),
      false,
    );
  });

  it("does not escalate for gov portals", () => {
    assert.equal(
      needsPlaywrightRender("<html></html>", "https://hrss.sz.gov.cn/tzgg/", 0),
      false,
    );
  });
});
