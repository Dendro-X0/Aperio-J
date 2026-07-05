import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  analyzeDiscoveryGap,
  buildGapFocusedSearchQueries,
  isBlockedDomain,
  nextEmptyFetchCount,
  nextLearningWeight,
  shouldMarkStreamDead,
} from "./stream-learning.js";

function profile(overrides: Partial<SeekerProfile["constraints"]> = {}): SeekerProfile {
  return {
    id: "p1",
    constraints: {
      primaryCity: "Berlin",
      acceptableCities: [],
      remotePreference: "hybrid-ok",
      employmentTypes: ["full-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
      ...overrides,
    },
    intent: {
      desiredRoles: ["Backend developer"],
      desiredIndustries: [],
      avoidRoles: [],
      avoidPhrases: [],
      industryProximity: "open-to-any",
      excludeProductionLine: true,
      excludeSales: true,
      excludeFoodService: true,
    },
    artifacts: [],
    skillTokens: [],
    certificates: [],
    experienceYears: 2,
    educationLevel: "high-school",
    languages: ["English"],
    inferredCapabilities: [],
  };
}

describe("stream-learning", () => {
  it("marks streams dead after three empty fetches", () => {
    assert.equal(nextEmptyFetchCount(0, 0, false), 1);
    assert.equal(nextEmptyFetchCount(2, 0, false), 3);
    assert.equal(shouldMarkStreamDead(3), true);
    assert.equal(nextEmptyFetchCount(2, 4, false), 0);
  });

  it("lowers weight when opportunities never match and raises when they do", () => {
    const lowered = nextLearningWeight(1.2, 5, 0);
    const raised = nextLearningWeight(1.2, 5, 2);
    assert.ok(lowered < 1.2);
    assert.ok(raised > 1.2);
  });

  it("detects local source gaps for onsite seekers", () => {
    const gap = analyzeDiscoveryGap(
      [
        {
          seedUrl: "https://remoteok.com/remote-jobs.rss",
          health: "healthy",
          enabled: true,
          opportunityYield: 3,
          matchYield: 1,
          learningWeight: 1,
          emptyFetchCount: 0,
          userBlocked: false,
        },
      ],
      profile({ remotePreference: "onsite-only" }),
    );

    assert.equal(gap.needsLocalSources, true);
  });

  it("builds role-focused search queries from gaps", () => {
    const queries = buildGapFocusedSearchQueries(profile(), {
      needsLocalSources: true,
      needsRoleFocusedSearch: true,
      deadStreamCount: 1,
    });

    assert.ok(queries.some((query) => query.includes("Backend developer")));
    assert.ok(queries.some((query) => query.includes("site:.gov")));
  });

  it("blocks domains by hostname", () => {
    const blocked = new Set(["indeed.com"]);
    assert.equal(isBlockedDomain("https://de.indeed.com/jobs", blocked), true);
    assert.equal(isBlockedDomain("https://www.arbeitsagentur.de/jobsuche/", blocked), false);
  });
});
