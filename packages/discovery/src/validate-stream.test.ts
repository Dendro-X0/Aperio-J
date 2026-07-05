import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoverRssLinksFromHtml } from "./rss-autodiscover.js";
import { resolveValidationTier, validateStreamCandidate } from "./validate-stream.js";

const FIXTURE_RSS = `<?xml version="1.0"?>
<rss><channel>
  <item><title>深圳龙岗 IQC质检员</title><link>https://example.com/1</link><description>电子厂招聘</description></item>
  <item><title>深圳宝安 仓管</title><link>https://example.com/2</link><description>仓储物料</description></item>
</channel></rss>`;

const FIXTURE_GOV_JS_SHELL = `<!doctype html>
<html>
  <head><title>Berlin jobs — Bundesagentur für Arbeit</title></head>
  <body>
    <h1>Stellenangebote in Berlin</h1>
    <p>Careers and vacancies for software engineers in Berlin.</p>
  </body>
</html>`;

describe("rss autodiscover", () => {
  it("finds alternate feed links in HTML", () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" href="/cn/hrss/rss.xml">
    </head></html>`;
    const links = discoverRssLinksFromHtml(html, "https://www.sz.gov.cn/");
    assert.ok(links.some((url) => url.includes("rss.xml")));
  });
});

describe("resolveValidationTier", () => {
  it("returns proven when parsed items exist", () => {
    const resolved = resolveValidationTier({
      parsedItemCount: 3,
      tier: "gov",
      geoHit: true,
      intentHits: ["engineer"],
      jobPageHint: true,
    });

    assert.equal(resolved?.tier, "proven");
  });

  it("returns candidate for trusted domains with job hints but no parsed items", () => {
    const resolved = resolveValidationTier({
      parsedItemCount: 0,
      tier: "gov",
      geoHit: true,
      intentHits: [],
      jobPageHint: true,
    });

    assert.equal(resolved?.tier, "candidate");
  });

  it("rejects aggregators without parsed items", () => {
    const resolved = resolveValidationTier({
      parsedItemCount: 0,
      tier: "aggregator",
      geoHit: true,
      intentHits: ["engineer"],
      jobPageHint: true,
    });

    assert.equal(resolved, null);
  });
});

describe("validateStreamCandidate", () => {
  it("validates RSS fixture with geo/intent confidence", async () => {
    const candidate = await validateStreamCandidate({
      label: "test feed",
      kind: "rss",
      seedUrl: "https://example.com/jobs.rss",
      discoveredVia: "probe-test",
      regionHint: "深圳",
      intentTerms: ["质检", "qc", "深圳"],
      options: { fixtureXml: FIXTURE_RSS },
    });

    assert.ok(candidate);
    assert.equal(candidate!.validationTier, "proven");
    assert.ok(candidate!.confidence >= 0.35);
    assert.equal(candidate!.sampleItemCount, 2);
  });

  it("accepts JS-heavy gov pages as candidate tier", async () => {
    const candidate = await validateStreamCandidate({
      label: "Bundesagentur Berlin",
      kind: "list_page",
      seedUrl: "https://www.arbeitsagentur.de/jobsuche/suche?wo=Berlin",
      discoveredVia: "probe-test",
      regionHint: "Berlin",
      intentTerms: ["software engineer", "berlin"],
      options: { fixtureHtml: FIXTURE_GOV_JS_SHELL },
    });

    assert.ok(candidate);
    assert.equal(candidate!.validationTier, "candidate");
    assert.equal(candidate!.sampleItemCount, 0);
    assert.ok(candidate!.confidence >= 0.28);
  });
});
