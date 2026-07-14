import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  isCnNetworkContext,
  resolveProfileNetworkEnvironment,
} from "./profile-network-context.js";

function profile(overrides: Partial<SeekerProfile["constraints"]> = {}): SeekerProfile {
  return {
    id: "p1",
    constraints: {
      primaryCity: "Guangzhou",
      acceptableCities: [],
      remotePreference: "remote-only",
      employmentTypes: ["full-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
      ...overrides,
    },
    intent: {
      desiredRoles: ["E-commerce ops"],
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

describe("profile-network-context", () => {
  it("infers mainland-cn from Chinese city tags when auto", () => {
    assert.equal(resolveProfileNetworkEnvironment(profile()), "mainland-cn");
    assert.equal(isCnNetworkContext(profile()), true);
  });

  it("respects explicit overseas override for CN cities", () => {
    const overseas = profile({ networkEnvironment: "overseas" });
    assert.equal(resolveProfileNetworkEnvironment(overseas), "overseas");
    assert.equal(isCnNetworkContext(overseas), false);
  });

  it("respects explicit mainland-cn for international cities", () => {
    const mainland = profile({
      primaryCity: "Berlin",
      networkEnvironment: "mainland-cn",
    });
    assert.equal(resolveProfileNetworkEnvironment(mainland), "mainland-cn");
  });
});
