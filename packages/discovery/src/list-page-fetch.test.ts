import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseListPageHtml } from "./list-page-fetch.js";

const FIXTURE_HTML = `<!DOCTYPE html>
<html><body>
  <ul class="news-list">
    <li><a href="/xxgk/tzgg/202603/01.html">深圳市龙岗区某电子厂 IQC质检员招聘公告</a></li>
    <li><a href="/xxgk/tzgg/202603/02.html">深圳宝安仓储理货员岗位招聘</a></li>
    <li><a href="/about.html">关于我们</a></li>
  </ul>
  <a href="https://hrss.sz.gov.cn/jobs/line.htm">流水线普工招聘通知</a>
</body></html>`;

describe("parseListPageHtml", () => {
  it("extracts job-like anchor links", () => {
    const items = parseListPageHtml(
      FIXTURE_HTML,
      "https://hrss.sz.gov.cn/",
      "test-list",
      30,
      { profileCities: ["深圳"] },
    );

    assert.ok(items.length >= 2);
    assert.ok(items.some((item) => item.title.includes("质检")));
    assert.ok(items.every((item) => item.url.startsWith("http")));
    assert.ok(!items.some((item) => item.title.includes("关于我们")));
  });

  it("drops other-city hub links scraped from national boards", () => {
    const html = `<!DOCTYPE html><body>
      <a href="/chengdu/">成都招聘</a>
      <a href="/shenzhen/job/123.html">深圳全栈工程师招聘</a>
      <a href="/more">查看更多职位</a>
    </body></html>`;

    const items = parseListPageHtml(html, "https://www.zhipin.com/shenzhen/", "test", 30, {
      profileCities: ["深圳"],
    });

    assert.ok(items.some((item) => item.title.includes("深圳全栈")));
    assert.ok(!items.some((item) => item.title.includes("成都招聘")));
    assert.ok(!items.some((item) => item.title.includes("查看更多")));
  });

  it("accepts zhipin job detail links without 招聘 in title", () => {
    const html = `<!DOCTYPE html><body>
      <a href="https://www.zhipin.com/job_detail/abc123.html">高级全栈工程师</a>
    </body></html>`;

    const items = parseListPageHtml(html, "https://www.zhipin.com/shenzhen/", "test", 30, {
      profileCities: ["深圳"],
    });

    assert.equal(items.length, 1);
    assert.match(items[0]!.title, /全栈/);
  });
});
