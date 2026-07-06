import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRegionalSearchQueries,
  buildSearchEngineUrl,
  resolveSearchSphere,
  resolveSearxngBaseUrl,
  SEARCH_SPHERE_ENGINES,
} from "./search-region.js";
import { expandRegionalSearchProbes } from "./search-queries.js";

describe("resolveSearchSphere", () => {
  it("returns none when no cities are set", () => {
    assert.equal(resolveSearchSphere("", []), "none");
  });

  it("returns cn for Chinese cities", () => {
    assert.equal(resolveSearchSphere("深圳", []), "cn");
    assert.equal(resolveSearchSphere("杭州", []), "cn");
  });

  it("returns global for international cities across regions", () => {
    for (const city of ["Bonn", "Paris", "London", "New York", "Mexico City", "Lagos", "Nairobi"]) {
      assert.equal(resolveSearchSphere(city, []), "global", city);
    }
  });

  it("returns jp for Japanese cities in kanji, kana, or Latin", () => {
    assert.equal(resolveSearchSphere("東京", []), "jp");
    assert.equal(resolveSearchSphere("大阪", []), "jp");
    assert.equal(resolveSearchSphere("Tokyo", []), "jp");
    assert.equal(resolveSearchSphere("さいたま", []), "jp");
    assert.equal(resolveSearchSphere("トーキョー", []), "jp");
  });

  it("does not route Japanese kanji cities to cn", () => {
    assert.notEqual(resolveSearchSphere("東京", []), "cn");
    assert.notEqual(resolveSearchSphere("大阪", []), "cn");
  });
});

describe("buildRegionalSearchQueries", () => {
  it("builds Chinese HR queries for cn sphere", () => {
    const queries = buildRegionalSearchQueries("深圳", "cn");
    assert.ok(queries[0]?.includes("人力资源"));
  });

  it("builds English job-board queries for global sphere", () => {
    const queries = buildRegionalSearchQueries("Bonn", "global");
    assert.ok(queries.some((query) => query.includes("careers jobs")));
    assert.ok(queries.some((query) => query.includes("Bonn")));
  });

  it("includes desired role terms in search queries", () => {
    const queries = buildRegionalSearchQueries("Berlin", "global", ["backend developer", "fintech"]);
    assert.ok(queries.some((query) => query.includes("backend developer")));
    assert.ok(queries.some((query) => query.includes("Berlin")));
  });

  it("includes desired role terms in Chinese search queries", () => {
    const queries = buildRegionalSearchQueries("深圳", "cn", ["质检", "电子"]);
    assert.ok(queries.some((query) => query.includes("质检")));
    assert.ok(queries.some((query) => query.includes("深圳")));
  });

  it("adds factory-worker search queries for cn sphere", () => {
    const queries = buildRegionalSearchQueries("深圳", "cn", ["普工", "电子制造"]);
    assert.ok(queries.some((query) => query.includes("普工")));
    assert.ok(queries.some((query) => query.includes("人才网")));
  });

  it("localizes English city labels to Chinese in cn sphere queries", () => {
    const queries = buildRegionalSearchQueries("Shenzhen", "cn", ["普工"]);
    assert.ok(queries.some((query) => query.includes("深圳")));
    assert.ok(!queries.some((query) => /Shenzhen/i.test(query)));
  });

  it("builds Japanese employment queries for jp sphere", () => {
    const queries = buildRegionalSearchQueries("東京", "jp");
    assert.ok(queries.some((query) => query.includes("求人")));
    assert.ok(queries.some((query) => query.includes("ハローワーク")));
    assert.ok(queries.some((query) => query.includes("site:go.jp")));
  });
});

describe("buildSearchEngineUrl", () => {
  it("builds engine-specific search URLs", () => {
    assert.ok(buildSearchEngineUrl("baidu", "test").includes("baidu.com/s?"));
    assert.ok(buildSearchEngineUrl("bing", "test").includes("bing.com/search?"));
    assert.ok(buildSearchEngineUrl("bing", "test").includes("format=rss"));
    assert.ok(buildSearchEngineUrl("google", "test").includes("google.com/search?"));
  });

  it("builds SearXNG JSON search URL when configured", () => {
    const previous = process.env.APERO_J_SEARXNG_URL;
    process.env.APERO_J_SEARXNG_URL = "http://localhost:8080/";
    try {
      assert.equal(resolveSearxngBaseUrl(), "http://localhost:8080");
      const url = buildSearchEngineUrl("searxng", "深圳 普工 招聘");
      assert.ok(url.startsWith("http://localhost:8080/search?"));
      assert.ok(url.includes("format=json"));
    } finally {
      if (previous === undefined) delete process.env.APERO_J_SEARXNG_URL;
      else process.env.APERO_J_SEARXNG_URL = previous;
    }
  });
});

describe("expandRegionalSearchProbes", () => {
  const probeId = (prefix: string, seed: string) => `probe-${prefix}-${seed}`;

  it("uses Baidu and Bing for Chinese cities", () => {
    const probes = expandRegionalSearchProbes("佛山", [], "佛山", [], probeId);
    assert.ok(probes.some((probe) => probe.seed.includes("baidu.com")));
    assert.ok(probes.some((probe) => probe.seed.includes("bing.com")));
    assert.ok(!probes.some((probe) => probe.seed.includes("google.com")));
  });

  it("uses Google and Bing for global cities", () => {
    const probes = expandRegionalSearchProbes("Paris", [], "Paris", [], probeId);
    assert.ok(probes.some((probe) => probe.seed.includes("google.com/search?")));
    assert.ok(probes.some((probe) => probe.seed.includes("bing.com/search?")));
    assert.ok(!probes.some((probe) => probe.seed.includes("baidu.com")));
    assert.equal(SEARCH_SPHERE_ENGINES.global.join(","), "google,bing");
  });

  it("includes role terms in search probe seeds", () => {
    const probes = expandRegionalSearchProbes(
      "Berlin",
      [],
      "Berlin",
      ["backend developer"],
      probeId,
    );
    assert.ok(
      probes.some(
        (probe) =>
          probe.seed.includes(encodeURIComponent("backend developer")) ||
          probe.label.includes("backend developer"),
      ),
    );
  });

  it("prepends SearXNG probes when APERO_J_SEARXNG_URL is set", () => {
    const previous = process.env.APERO_J_SEARXNG_URL;
    process.env.APERO_J_SEARXNG_URL = "http://127.0.0.1:8888";
    try {
      const probes = expandRegionalSearchProbes("深圳", [], "深圳", [], probeId);
      assert.ok(probes.some((probe) => probe.seed.startsWith("http://127.0.0.1:8888/search?")));
      assert.equal(probes[0]?.seed.startsWith("http://127.0.0.1:8888/search?"), true);
    } finally {
      if (previous === undefined) delete process.env.APERO_J_SEARXNG_URL;
      else process.env.APERO_J_SEARXNG_URL = previous;
    }
  });

  it("uses Japanese search queries for Tokyo kanji", () => {
    const probes = expandRegionalSearchProbes("東京", [], "東京", [], probeId);
    assert.ok(probes.some((probe) => probe.seed.includes("google.com/search?")));
    assert.ok(probes.some((probe) => probe.rationale?.includes("sphere jp")));
    assert.ok(
      probes.some(
        (probe) => probe.seed.includes(encodeURIComponent("求人")) || probe.label.includes("求人"),
      ),
    );
    assert.ok(!probes.some((probe) => probe.seed.includes("baidu.com")));
  });
});
