import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { parseOpportunities } from "@aperio-j/discovery/parse-opportunity";
import { createFixtureSeekerProfile, FIXTURE_FEED_ITEMS } from "./fixtures.js";
import { rankOpportunities } from "./score-opportunity.js";

const factoryWorkerProfile = {
  id: "seeker-factory-1",
  constraints: {
    primaryCity: "深圳",
    acceptableCities: [],
    remotePreference: "onsite-only",
    employmentTypes: ["full-time"],
    allowAgencyPostings: false,
    hideRedFlagListings: true,
    preferDirectHire: true,
  },
  intent: {
    desiredRoles: ["普工"],
    desiredIndustries: ["电子制造"],
    avoidRoles: [],
    avoidPhrases: [],
    industryProximity: "open-to-any",
    excludeProductionLine: false,
    excludeSales: true,
    excludeFoodService: true,
  },
  artifacts: [],
  skillTokens: [],
  certificates: [],
  experienceYears: 2,
  educationLevel: "high-school",
  languages: ["普通话"],
  inferredCapabilities: [],
} satisfies SeekerProfile;

describe("rankOpportunities — fixture seeker", () => {
  it("ranks QC and warehouse above excluded production-line and sales", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS);
    const ranked = rankOpportunities(opportunities, profile);

    assert.ok(ranked.length >= 3);

    const titles = ranked.map((row) => row.opportunity.title);
    assert.ok(titles[0]?.includes("IQC") || titles[0]?.includes("仓库"));

    const excludedTitles = opportunities
      .filter((opp) => {
        const row = rankOpportunities([opp], profile, { includeExcluded: true })[0];
        return row?.match.excluded;
      })
      .map((opp) => opp.title);

    assert.ok(excludedTitles.some((title) => title.includes("普工")));
    assert.ok(excludedTitles.some((title) => title.includes("销售")));
  });

  it("provides explainable match strings", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS);
    const ranked = rankOpportunities(opportunities, profile);
    const top = ranked[0];

    assert.ok(top);
    assert.ok(top.match.explanation.length > 10);
    assert.equal(top.match.excluded, false);
    assert.ok(top.match.breakdown.finalScore >= 55);
  });

  it("localizes explanations for en locale", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS, { locale: "en" });
    const ranked = rankOpportunities(opportunities, profile, { locale: "en" });
    const top = ranked[0];

    assert.ok(top);
    assert.match(top.match.explanation, /Intent match|Experience overlap|Location/i);
  });

  it("localizes exclusion reasons for en locale", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS, { locale: "en" });
    const excluded = rankOpportunities(opportunities, profile, {
      includeExcluded: true,
      locale: "en",
    }).filter((row) => row.match.excluded);

    assert.ok(excluded.length > 0);
    assert.ok(
      excluded.some((row) =>
        /Not recommended|excluded|filtered|outside/i.test(row.match.explanation),
      ),
    );
  });
});

describe("rankOpportunities — factory worker profile", () => {
  it("excludes white-collar tech listings for 普工 / 电子制造 profiles", () => {
    const opportunities = parseOpportunities([
      {
        title: "java开发——深圳",
        body: "后端开发 Spring Boot 本科",
        url: "https://shenzhen.zhaopin.com/job/java",
        sourceId: "zhaopin",
        fetchedAt: "2026-07-05T00:00:00Z",
      },
      {
        title: "深圳龙华电子厂普工招聘",
        body: "产线操作 两班倒 包吃住",
        url: "https://sz.58.com/job/pugong",
        sourceId: "58",
        fetchedAt: "2026-07-05T00:00:00Z",
      },
    ]);

    const ranked = rankOpportunities(opportunities, factoryWorkerProfile);
    const excluded = rankOpportunities(opportunities, factoryWorkerProfile, {
      includeExcluded: true,
    }).filter((row) => row.match.excluded);

    assert.equal(ranked.length, 1);
    assert.match(ranked[0]!.opportunity.title, /普工/);
    assert.ok(
      excluded.some((row) => row.opportunity.title.includes("java")),
      "java listing should be excluded",
    );
  });
});

const remoteBackendProfile = {
  id: "seeker-remote-backend",
  constraints: {
    primaryCity: "Frankfurt",
    acceptableCities: [],
    remotePreference: "remote-only",
    employmentTypes: ["full-time", "contract"],
    allowAgencyPostings: true,
    hideRedFlagListings: true,
    preferDirectHire: false,
  },
  intent: {
    desiredRoles: ["Backend Engineer"],
    desiredIndustries: ["SaaS"],
    avoidRoles: [],
    avoidPhrases: [],
    industryProximity: "open-to-any",
    excludeProductionLine: true,
    excludeSales: true,
    excludeFoodService: true,
  },
  artifacts: [],
  skillTokens: ["Python", "PostgreSQL"],
  certificates: [],
  experienceYears: 5,
  educationLevel: "bachelor",
  languages: ["English"],
  inferredCapabilities: [],
} satisfies SeekerProfile;

describe("rankOpportunities — remote tech profile", () => {
  it("excludes ghostwriter and admin assistant listings for remote backend profiles", () => {
    const opportunities = parseOpportunities([
      {
        title: "Founder Ghostwriter",
        body: "Remote flexible writing",
        url: "https://remotive.com/job/ghost",
        sourceId: "remotive",
        fetchedAt: "2026-07-05T00:00:00Z",
      },
      {
        title: "Administrative Assistant",
        body: "Work from home data entry",
        url: "https://remoteok.com/job/admin",
        sourceId: "remoteok",
        fetchedAt: "2026-07-05T00:00:00Z",
      },
      {
        title: "Senior Backend Engineer",
        body: "Python PostgreSQL remote EU",
        url: "https://weworkremotely.com/job/backend",
        sourceId: "wwr",
        fetchedAt: "2026-07-05T00:00:00Z",
      },
    ]);

    const ranked = rankOpportunities(opportunities, remoteBackendProfile);
    const excluded = rankOpportunities(opportunities, remoteBackendProfile, {
      includeExcluded: true,
    }).filter((row) => row.match.excluded);

    assert.equal(ranked.length, 1);
    assert.match(ranked[0]!.opportunity.title, /Backend Engineer/);
    assert.equal(excluded.length, 2);
  });

  it("boosts geo score when a preferred district matches", () => {
    const profile = {
      ...remoteBackendProfile,
      constraints: {
        ...remoteBackendProfile.constraints,
        primaryCity: "New York",
        remotePreference: "hybrid-ok" as const,
        preferredDistricts: ["Brooklyn"],
      },
    } satisfies SeekerProfile;

    const opportunities = parseOpportunities([
      {
        title: "Backend Engineer",
        body: "Python PostgreSQL platform role\nHeadquarters: Brooklyn, New York",
        url: "https://example.com/jobs/backend-brooklyn",
        sourceId: "example",
        fetchedAt: "2026-07-05T00:00:00Z",
      },
    ]);

    const ranked = rankOpportunities(opportunities, profile);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]!.match.breakdown.geoScore, 98);
  });
});
