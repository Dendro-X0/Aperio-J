import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { buildConnectorStreamRows, mergeSourceRowsForDisplay } from "./connector-service.js";

const remoteProfile = {
  id: "p1",
  constraints: {
    primaryCity: "",
    acceptableCities: [],
    remotePreference: "remote-only",
    employmentTypes: ["full-time"],
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
  skillTokens: ["Python"],
  certificates: [],
  experienceYears: 3,
  educationLevel: "bachelor",
  languages: ["English"],
  inferredCapabilities: [],
} satisfies SeekerProfile;

describe("mergeSourceRowsForDisplay", () => {
  it("keeps ephemeral API connector rows when merging registry updates", () => {
    const connectors = buildConnectorStreamRows(remoteProfile);
    assert.ok(connectors.length > 0);
    assert.ok(connectors.every((row) => row.ephemeral));

    const registryRows = [
      {
        id: "rss-1",
        label: "We Work Remotely",
        kind: "rss",
        seedUrl: "https://weworkremotely.com/remote-jobs.rss",
        regionHint: null,
        workCategory: "remote" as const,
        confidence: 0.46,
        sampleItemCount: 10,
        enabled: true,
        health: "healthy" as const,
        opportunityYield: 5,
        learningWeight: 1,
        lastValidatedAt: new Date().toISOString(),
        discoveredVia: "remote-registry",
        origin: "auto" as const,
        authMode: "none" as const,
        hasSessionAuth: false,
        intakeType: "rss" as const,
        ephemeral: false,
      },
    ];

    const merged = mergeSourceRowsForDisplay(connectors, registryRows);
    const apiRows = merged.filter((row) => row.intakeType === "api");
    const rssRows = merged.filter((row) => row.intakeType === "rss");

    assert.ok(apiRows.length > 0, "API connectors should remain visible after merge");
    assert.equal(rssRows.length, 1);
    assert.ok(merged.length >= connectors.length);
  });
});
