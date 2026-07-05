import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchAllStreams, fetchStream } from "./fetch-streams.js";
import { resolveConnectorsForProfile } from "./connectors/resolve-connectors.js";
import type { SeekerProfile } from "@aperio-j/core";

function frankfurtProfile(
  remotePreference: SeekerProfile["constraints"]["remotePreference"],
): SeekerProfile {
  return {
    id: "profile-fetch",
    constraints: {
      primaryCity: "Frankfurt",
      acceptableCities: [],
      remotePreference,
      employmentTypes: [],
      allowAgencyPostings: true,
      hideRedFlagListings: false,
      preferDirectHire: false,
    },
    intent: {
      desiredRoles: ["Full-stack"],
      desiredIndustries: [],
      avoidRoles: [],
      avoidPhrases: [],
      industryProximity: "open-to-any",
      excludeProductionLine: false,
      excludeSales: false,
      excludeFoodService: false,
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

describe("fetchStream connector dispatch", () => {
  it("fetches Bundesagentur items from fixtures for onsite Frankfurt", async () => {
    process.env.APERO_J_CONNECTOR_FIXTURES = "true";
    try {
      const [config] = resolveConnectorsForProfile(frankfurtProfile("onsite-only")).filter(
        (row) => row.connectorId === "bundesagentur",
      );
      assert.ok(config);

      const result = await fetchStream(config);
      assert.equal(result.error, undefined);
      assert.ok(result.items.length > 0);
      assert.match(result.items[0]?.url ?? "", /arbeitsagentur|example\.com/);
    } finally {
      delete process.env.APERO_J_CONNECTOR_FIXTURES;
    }
  });

  it("dedupes overlapping remote connector fixtures for hybrid profiles", async () => {
    process.env.APERO_J_CONNECTOR_FIXTURES = "true";
    try {
      const configs = resolveConnectorsForProfile(frankfurtProfile("hybrid-ok")).filter((row) =>
        ["remotive", "remoteok", "arbeitnow"].includes(row.connectorId),
      );
      assert.equal(configs.length, 3);

      const { items, results } = await fetchAllStreams(configs);
      const rawCount = results.reduce((sum, row) => sum + row.items.length, 0);

      assert.ok(rawCount > 0);
      assert.ok(items.length <= rawCount);
      assert.ok(items.length >= 1);
    } finally {
      delete process.env.APERO_J_CONNECTOR_FIXTURES;
    }
  });
});
