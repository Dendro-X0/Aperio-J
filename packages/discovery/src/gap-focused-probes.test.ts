import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { buildGapFocusedProbes } from "./gap-focused-probes.js";

function profile(): SeekerProfile {
  return {
    id: "p1",
    constraints: {
      primaryCity: "Berlin",
      acceptableCities: [],
      remotePreference: "onsite-only",
      employmentTypes: ["full-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
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

describe("buildGapFocusedProbes", () => {
  it("builds search probes for local and role gaps", () => {
    const probes = buildGapFocusedProbes(profile(), {
      needsLocalSources: true,
      needsRoleFocusedSearch: true,
      deadStreamCount: 2,
    });

    assert.ok(probes.length > 0);
    assert.ok(probes.every((probe) => probe.kind === "search_discovery"));
    assert.ok(probes.some((probe) => probe.label.includes("Gap search")));
  });

  it("skips blocked domains", () => {
    const probes = buildGapFocusedProbes(
      profile(),
      {
        needsLocalSources: true,
        needsRoleFocusedSearch: false,
        deadStreamCount: 1,
      },
      new Set(["bing.com", "google.com"]),
    );

    assert.equal(probes.length, 0);
  });
});
