import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { isCnXhrApiUrl, parseCnXhrJsonBodies } from "./cn-xhr-json-parse.js";

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/cn-xhr");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

describe("cn-xhr-json-parse", () => {
  it("detects CN board XHR API URLs", () => {
    assert.equal(isCnXhrApiUrl("https://www.zhipin.com/wapi/zpgeek/search/joblist.json"), true);
    assert.equal(isCnXhrApiUrl("https://shenzhen.zhaopin.com/api/search/positions"), true);
    assert.equal(isCnXhrApiUrl("https://example.com/static/app.js"), false);
  });

  it("parses BOSS Zhipin joblist JSON", () => {
    const items = parseCnXhrJsonBodies(
      [loadFixture("zhipin-joblist.json")],
      "https://www.zhipin.com/shenzhen/",
      "test-zhipin",
    );
    assert.ok(items.length >= 2);
    assert.ok(items[0]?.url.includes("zhipin.com/job_detail/"));
    assert.ok(items.some((item) => item.title.includes("普工") || item.title.includes("质检")));
  });

  it("parses Zhaopin positions JSON", () => {
    const items = parseCnXhrJsonBodies(
      [loadFixture("zhaopin-positions.json")],
      "https://shenzhen.zhaopin.com/",
      "test-zhaopin",
    );
    assert.ok(items.length >= 1);
    assert.ok(items[0]?.url.includes("zhaopin.com"));
  });

  it("dedupes jobs across multiple JSON bodies", () => {
    const body = loadFixture("zhipin-joblist.json");
    const items = parseCnXhrJsonBodies([body, body], "https://www.zhipin.com/shenzhen/", "dup");
    const urls = new Set(items.map((item) => item.url));
    assert.equal(urls.size, items.length);
  });
});
