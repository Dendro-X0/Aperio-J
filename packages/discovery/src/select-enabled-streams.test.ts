import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile, StreamCandidate } from "@aperio-j/core";
import {
  mergeTrustlistedLocalCandidates,
  partitionStreamCandidates,
  selectEnabledStreamCandidates,
  trustlistedLocalRegistryCandidates,
} from "./select-enabled-streams.js";

function candidate(
  seedUrl: string,
  confidence: number,
  validationTier: StreamCandidate["validationTier"] = "proven",
): StreamCandidate {
  const remote = /remoteok|remotive|weworkremotely/i.test(seedUrl);
  return {
    id: `stream-${seedUrl}`,
    label: seedUrl,
    kind: remote ? "rss" : "list_page",
    seedUrl,
    discoveredVia: "test",
    regionHint: remote ? "remote" : "Berlin",
    confidence,
    sampleItemCount: validationTier === "proven" ? (remote ? 5 : 2) : 0,
    lastValidatedAt: new Date().toISOString(),
    health: "unknown",
    validationTier,
  };
}

function berlinProfile(remotePreference: SeekerProfile["constraints"]["remotePreference"]): SeekerProfile {
  return {
    id: "profile-1",
    constraints: {
      primaryCity: "Berlin",
      acceptableCities: [],
      remotePreference,
      employmentTypes: ["full-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
    },
    intent: {
      desiredRoles: ["Back-end development"],
      desiredIndustries: ["Technology"],
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

describe("trustlistedLocalRegistryCandidates", () => {
  it("includes Berlin local portals", () => {
    const trusted = trustlistedLocalRegistryCandidates("Berlin", "Berlin");
    assert.ok(trusted.some((row) => row.seedUrl.includes("arbeitsagentur.de")));
    assert.ok(trusted.some((row) => row.seedUrl.includes("stepstone.de")));
    assert.ok(trusted.every((row) => !/remoteok|remotive/i.test(row.seedUrl)));
    assert.ok(trusted.every((row) => row.validationTier === "candidate"));
  });
});

describe("selectEnabledStreamCandidates", () => {
  it("prioritizes remote boards for hybrid city profiles", () => {
    const local = candidate("https://www.arbeitsagentur.de/jobsuche/suche?wo=Berlin", 0.58);
    const remoteA = candidate("https://remoteok.com/remote-jobs.rss", 0.8);
    const remoteB = candidate("https://remotive.com/remote-jobs/feed", 0.75);

    const enabled = selectEnabledStreamCandidates(
      [local, remoteA, remoteB],
      berlinProfile("hybrid-ok"),
      5,
    );

    assert.ok(enabled.some((row) => row.seedUrl.includes("arbeitsagentur.de")));
    assert.ok(/remoteok|remotive/i.test(enabled[0]!.seedUrl));
    assert.ok(enabled.filter((row) => /remoteok|remotive/i.test(row.seedUrl)).length <= 8);
  });

  it("omits remote boards for onsite-only city profiles", () => {
    const enabled = selectEnabledStreamCandidates(
      [
        candidate("https://remoteok.com/remote-jobs.rss", 0.9),
        candidate("https://www.stepstone.de/jobs/in-berlin", 0.5),
      ],
      berlinProfile("onsite-only"),
      5,
    );

    assert.ok(enabled.every((row) => !/remoteok|remotive/i.test(row.seedUrl)));
  });
});

describe("mergeTrustlistedLocalCandidates", () => {
  it("adds trusted local registry rows when validation produced none", () => {
    const merged = mergeTrustlistedLocalCandidates(
      [candidate("https://remoteok.com/remote-jobs.rss", 0.7)],
      "Berlin",
      "Berlin",
    );

    assert.ok(merged.some((row) => row.seedUrl.includes("arbeitsagentur.de")));
  });
});

describe("partitionStreamCandidates", () => {
  it("stores proven streams as enabled and candidate-tier as deferred", () => {
    const proven = candidate("https://remoteok.com/remote-jobs.rss", 0.8, "proven");
    const deferred = candidate("https://www.arbeitsagentur.de/jobsuche/suche?wo=Berlin", 0.58, "candidate");

    const { enabled, deferred: deferredRows } = partitionStreamCandidates(
      [proven, deferred],
      berlinProfile("hybrid-ok"),
      5,
    );

    assert.ok(enabled.every((row) => row.validationTier === "proven"));
    assert.ok(deferredRows.every((row) => row.validationTier === "candidate"));
    assert.ok(deferredRows.some((row) => row.seedUrl.includes("arbeitsagentur.de")));
  });
});
