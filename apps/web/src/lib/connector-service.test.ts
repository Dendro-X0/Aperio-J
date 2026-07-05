import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import {
  loadConnectorStreamConfigs,
  mergeStreamConfigsForProfile,
  buildConnectorStreamRows,
} from "./connector-service.js";

function minimalProfile(
  remotePreference: SeekerProfile["constraints"]["remotePreference"],
): SeekerProfile {
  return {
    id: "profile-test",
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

describe("connector-service", () => {
  it("includes Remotive for hybrid profiles", () => {
    const connectors = loadConnectorStreamConfigs(minimalProfile("hybrid-ok"));
    assert.ok(connectors.some((row) => row.kind === "connector"));
  });

  it("includes Bundesagentur but not Remotive for onsite-only German profiles", () => {
    const connectors = loadConnectorStreamConfigs(minimalProfile("onsite-only"));
    assert.ok(connectors.some((row) => row.connectorId === "bundesagentur"));
    assert.ok(!connectors.some((row) => row.connectorId === "remotive"));
  });

  it("includes Remotive for hybrid Chinese city profiles", () => {
    const profile = minimalProfile("hybrid-ok");
    profile.constraints.primaryCity = "深圳";
    const connectors = loadConnectorStreamConfigs(profile);
    assert.ok(connectors.some((row) => row.connectorId === "remotive"));
  });

  it("returns no API connectors for Chinese onsite-only profiles", () => {
    const profile = minimalProfile("hybrid-ok");
    profile.constraints.primaryCity = "深圳";
    profile.constraints.remotePreference = "onsite-only";
    const connectors = loadConnectorStreamConfigs(profile);
    assert.equal(connectors.length, 0);
  });

  it("places connectors before registry streams", () => {
    const merged = mergeStreamConfigsForProfile(minimalProfile("hybrid-ok"), [
      {
        id: "registry-1",
        label: "WeWorkRemotely",
        url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
        kind: "rss",
      },
    ]);

    assert.equal(merged[0]?.kind, "connector");
    assert.ok(merged.some((row) => row.kind === "rss"));
  });

  it("builds ephemeral API rows for hybrid profiles", () => {
    const rows = buildConnectorStreamRows(minimalProfile("hybrid-ok"));
    assert.ok(rows.every((row) => row.intakeType === "api"));
    assert.ok(rows.every((row) => row.ephemeral));
    assert.ok(rows.some((row) => row.connectorId === "remotive"));
  });
});
