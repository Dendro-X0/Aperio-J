import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  CN_FREELANCE_REGISTRY_STREAMS,
  isCnFreelanceIntentProfile,
  isCnFreelanceStreamUrl,
} from "./cn-freelance-packs.js";

function profile(overrides: Partial<SeekerProfile> = {}): SeekerProfile {
  return {
    id: "test",
    constraints: {
      primaryCity: "",
      acceptableCities: [],
      remotePreference: "remote-only",
      employmentTypes: ["full-time", "part-time", "contract"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
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

describe("cn-freelance-packs", () => {
  it("detects ops/gig intent profiles", () => {
    assert.equal(isCnFreelanceIntentProfile(profile()), true);
    assert.equal(
      isCnFreelanceIntentProfile(
        profile({
          intent: {
            desiredRoles: ["Backend engineer"],
            desiredIndustries: ["Software"],
            avoidRoles: [],
            avoidPhrases: [],
            industryProximity: "open-to-any",
            excludeProductionLine: false,
            excludeSales: false,
            excludeFoodService: false,
          },
        }),
      ),
      false,
    );
    assert.equal(
      isCnFreelanceIntentProfile(
        profile({
          constraints: {
            primaryCity: "",
            acceptableCities: [],
            remotePreference: "onsite-only",
            employmentTypes: ["full-time"],
            allowAgencyPostings: false,
            hideRedFlagListings: true,
            preferDirectHire: true,
          },
        }),
      ),
      false,
    );
  });

  it("includes eleduck RSS in registry streams", () => {
    assert.ok(
      CN_FREELANCE_REGISTRY_STREAMS.some(
        (stream) => stream.id === "cn-eleduck-rss" && stream.kind === "rss",
      ),
    );
  });

  it("recognizes freelance hostnames", () => {
    assert.equal(isCnFreelanceStreamUrl("https://eleduck.com/posts/abc"), true);
    assert.equal(isCnFreelanceStreamUrl("https://www.zbj.com/xq/"), true);
    assert.equal(isCnFreelanceStreamUrl("https://www.zhaopin.com/beijing/"), false);
  });

  it("respects APERO_J_CN_FREELANCE_EXPERIMENTAL=false", () => {
    const previous = process.env.APERO_J_CN_FREELANCE_EXPERIMENTAL;
    process.env.APERO_J_CN_FREELANCE_EXPERIMENTAL = "false";
    try {
      assert.equal(isCnFreelanceIntentProfile(profile()), false);
    } finally {
      if (previous === undefined) delete process.env.APERO_J_CN_FREELANCE_EXPERIMENTAL;
      else process.env.APERO_J_CN_FREELANCE_EXPERIMENTAL = previous;
    }
  });
});
