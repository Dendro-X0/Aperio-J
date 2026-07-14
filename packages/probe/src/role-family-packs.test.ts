import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  resolveRoleFamilies,
  selectRemoteRegistryStreams,
  isTechHeavyRemoteStreamId,
} from "./role-family-packs.js";

function profile(overrides: Partial<SeekerProfile> = {}): SeekerProfile {
  return {
    id: "test",
    constraints: {
      primaryCity: "",
      acceptableCities: [],
      remotePreference: "remote-only",
      employmentTypes: ["full-time", "part-time", "contract"],
      allowAgencyPostings: true,
      hideRedFlagListings: true,
      preferDirectHire: false,
      ...overrides.constraints,
    },
    intent: {
      desiredRoles: ["电商运营"],
      desiredIndustries: ["互联网"],
      avoidRoles: [],
      avoidPhrases: [],
      industryProximity: "open-to-any",
      excludeProductionLine: false,
      excludeSales: false,
      excludeFoodService: false,
      ...overrides.intent,
    },
    artifacts: overrides.artifacts ?? [],
    skillTokens: [],
    certificates: [],
    experienceYears: 0,
    educationLevel: "high-school",
    languages: [],
    inferredCapabilities: [],
    seekerDigest: "",
  };
}

describe("role-family-packs", () => {
  it("resolves ops + support for remote ops profiles", () => {
    const families = resolveRoleFamilies(profile());
    assert.ok(families.includes("ops"));
    assert.ok(families.includes("support"));
    assert.ok(!families.includes("tech"));
  });

  it("selects WWR support/sales boards for ops, not programming", () => {
    const streams = selectRemoteRegistryStreams(profile());
    const urls = streams.map((stream) => stream.seedUrl);
    assert.ok(urls.some((url) => url.includes("remote-customer-support-jobs")));
    assert.ok(urls.some((url) => url.includes("remote-sales-and-marketing-jobs")));
    assert.ok(!urls.some((url) => url.includes("remote-programming-jobs")));
    assert.ok(!urls.some((url) => url.includes("hnhiring")));
  });

  it("keeps tech boards for backend engineers", () => {
    const streams = selectRemoteRegistryStreams(
      profile({
        intent: {
          desiredRoles: ["Backend engineer"],
          desiredIndustries: ["SaaS"],
          avoidRoles: [],
          avoidPhrases: [],
          industryProximity: "open-to-any",
          excludeProductionLine: true,
          excludeSales: true,
          excludeFoodService: true,
        },
      }),
    );
    const urls = streams.map((stream) => stream.seedUrl);
    assert.ok(urls.some((url) => url.includes("remote-programming-jobs")));
    assert.ok(isTechHeavyRemoteStreamId("wwr-programming"));
  });
});
