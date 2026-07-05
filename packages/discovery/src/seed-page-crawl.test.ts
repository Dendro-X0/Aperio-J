import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SourceProbe } from "@aperio-j/core";
import {
  discoverFollowUpCandidates,
  extractCrawlSeedUrls,
  isTrustedCrawlDomain,
} from "./seed-page-crawl.js";

const GOV_LANDING = `
<html>
  <head>
    <link rel="alternate" type="application/rss+xml" href="/jobs/feed.xml">
  </head>
  <body>
    <a href="/jobs/vacancies">Open vacancies</a>
    <a href="/about/contact">Contact us</a>
    <a href="https://evil.example/phish">Bad link</a>
    <a href="/careers/current-openings">Current openings</a>
  </body>
</html>`;

describe("seed-page-crawl", () => {
  it("accepts gov and edu domains for follow-up crawl", () => {
    assert.equal(isTrustedCrawlDomain("https://www.arbeitsagentur.de/jobsuche/"), true);
    assert.equal(isTrustedCrawlDomain("https://hrss.sz.gov.cn/"), true);
    assert.equal(isTrustedCrawlDomain("https://www.stepstone.de/jobs"), false);
  });

  it("extracts job-like links from trusted landing pages", () => {
    const seeds = extractCrawlSeedUrls(
      GOV_LANDING,
      "https://careers.example.gov.uk/",
      5,
    );
    assert.ok(seeds.some((url) => url.includes("/jobs/vacancies")));
    assert.ok(seeds.some((url) => url.includes("/careers/current-openings")));
    assert.ok(!seeds.some((url) => url.includes("evil.example")));
    assert.ok(!seeds.some((url) => url.includes("/about/contact")));
  });

  it("discovers crawl candidates from fixture HTML without network", async () => {
    const probe: SourceProbe = {
      id: "probe-search-test",
      kind: "search_discovery",
      label: "Search test",
      seed: "https://careers.example.gov.uk/",
      regionHint: "London",
      intentTerms: ["engineer"],
      rationale: "test",
    };

    const candidates = await discoverFollowUpCandidates(
      "https://careers.example.gov.uk/",
      probe,
      { fixtureHtml: GOV_LANDING, maxRssLinks: 0 },
    );

    assert.ok(candidates.length >= 1);
    assert.ok(candidates.every((row) => row.discoveredVia.includes(":crawl")));
  });
});
