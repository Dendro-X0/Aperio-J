import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCitySearchQueries,
  extractUrlsFromSearchHtml,
  extractUrlsFromSearxngJson,
  scoreDiscoveryUrl,
  selectStreamSeedsFromUrls,
} from "./search-probe.js";
import { isTrustedCrawlDomain } from "./seed-page-crawl.js";

const BAIDU_FIXTURE = `
<div id="content_left">
  <h3><a href="http://www.baidu.com/link?url=abc">公职人员招考-深圳市人力资源和社会保障局网站</a></h3>
  "mu":"http://hrss.sz.gov.cn/gzryzk/index.html"
  http://hrss.sz.gov.cn/gkmlpt/index
  http://www.sz.gov.cn/cn/xxgk/zfxxgj/tzgg/content/post_11522093.html
  http://job.mohrss.gov.cn/cjobs/jobinfolist/cb21/showdw?id=37202650
  http://beian.miit.gov.cn
</div>`;

describe("search-probe", () => {
  it("builds city-specific search queries", () => {
    const queries = buildCitySearchQueries("深圳市");
    assert.ok(queries.length >= 2);
    assert.ok(queries[0]?.includes("深圳"));
    assert.ok(queries.some((query) => query.includes("人力资源") || query.includes("人才网")));
  });

  it("extracts gov and job URLs from search HTML", () => {
    const urls = extractUrlsFromSearchHtml(BAIDU_FIXTURE);
    assert.ok(urls.some((url) => url.includes("hrss.sz.gov.cn")));
    assert.ok(!urls.some((url) => url.includes("beian.miit.gov.cn")));
  });

  it("ranks listing portals above single-article URLs", () => {
    const seeds = selectStreamSeedsFromUrls(
      [
        "http://hrss.sz.gov.cn/gzryzk/index.html",
        "http://www.sz.gov.cn/cn/xxgk/tzgg/content/post_11522093.html",
        "http://job.mohrss.gov.cn/cjobs/jobinfolist/cb21/showdw?id=1",
      ],
      "深圳",
      2,
    );

    assert.ok(seeds[0]?.includes("hrss.sz.gov.cn"));
    assert.ok(scoreDiscoveryUrl(seeds[0]!, "深圳") >= scoreDiscoveryUrl(seeds[1] ?? "", "深圳"));
  });

  it("ranks global government job portals highly", () => {
    const govScore = scoreDiscoveryUrl("https://www.arbeitsagentur.de/jobsuche/", "Bonn", "global");
    const blogScore = scoreDiscoveryUrl("https://example.com/blog/hiring-news", "Bonn", "global");
    assert.ok(govScore > blogScore);
  });

  it("extracts URLs from SearXNG JSON", () => {
    const json = JSON.stringify({
      results: [
        { url: "http://hrss.sz.gov.cn/gzryzk/index.html" },
        { url: "https://beian.miit.gov.cn/" },
      ],
    });
    const urls = extractUrlsFromSearxngJson(json);
    assert.ok(urls.some((url) => url.includes("hrss.sz.gov.cn")));
    assert.ok(!urls.some((url) => url.includes("beian.miit")));
  });

  it("flags gov domains for multi-hop follow-up crawl", () => {
    assert.equal(isTrustedCrawlDomain("https://www.arbeitsagentur.de/jobsuche/"), true);
    assert.equal(isTrustedCrawlDomain("https://remoteok.com/"), false);
  });
});
