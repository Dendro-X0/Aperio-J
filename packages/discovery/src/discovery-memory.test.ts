import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SourceProbe } from "@aperio-j/core";
import {
  buildMemoryProbes,
  emptyCityDiscoveryMemory,
  memorySeedMatchesCity,
  mergeProbesWithMemory,
  normalizeCityKey,
  recordMemoryFromCandidates,
  recordMemoryQuery,
  recordMemorySeed,
} from "./discovery-memory.js";

describe("discovery-memory", () => {
  it("normalizes city keys for storage lookup", () => {
    assert.equal(normalizeCityKey("Berlin"), "berlin");
    assert.equal(normalizeCityKey("深圳市"), "深圳");
  });

  it("filters national CN aggregator memory without city slug", () => {
    assert.equal(memorySeedMatchesCity("https://www.51job.com/", "深圳"), false);
    assert.equal(memorySeedMatchesCity("https://www.zhipin.com/", "深圳"), false);
    assert.equal(memorySeedMatchesCity("https://www.zhipin.com/shenzhen/", "深圳"), true);
    assert.equal(memorySeedMatchesCity("https://shenzhen.zhaopin.com/", "深圳"), true);
  });

  it("records and ranks seed URLs by score", () => {
    let memory = emptyCityDiscoveryMemory("Berlin");
    memory = recordMemorySeed(memory, "https://www.arbeitsagentur.de/jobsuche/", 0.5);
    memory = recordMemorySeed(memory, "https://www.arbeitsagentur.de/jobsuche/", 0.3);

    assert.equal(memory.seeds.length, 1);
    assert.ok(memory.seeds[0]!.score >= 0.8);
  });

  it("dedupes remembered queries", () => {
    let memory = emptyCityDiscoveryMemory("Berlin");
    memory = recordMemoryQuery(memory, "Berlin backend jobs");
    memory = recordMemoryQuery(memory, "Berlin government employment portal");
    memory = recordMemoryQuery(memory, "Berlin backend jobs");

    assert.equal(memory.queries.length, 2);
    assert.equal(memory.queries[0], "Berlin backend jobs");
  });

  it("skips remote board memory probes for onsite-only profiles", () => {
    const memory = recordMemoryFromCandidates(
      emptyCityDiscoveryMemory("Frankfurt"),
      ["https://weworkremotely.com/categories/remote-programming-jobs.rss"],
      0.5,
      "onsite-only",
    );

    assert.equal(memory.seeds.length, 0);

    const profile = {
      id: "p1",
      constraints: {
        primaryCity: "Frankfurt",
        acceptableCities: [],
        remotePreference: "onsite-only" as const,
        employmentTypes: ["full-time" as const],
        allowAgencyPostings: false,
        hideRedFlagListings: true,
        preferDirectHire: true,
      },
      intent: {
        desiredRoles: ["Full-stack"],
        desiredIndustries: [],
        avoidRoles: [],
        avoidPhrases: [],
        industryProximity: "open-to-any" as const,
        excludeProductionLine: true,
        excludeSales: true,
        excludeFoodService: true,
      },
      artifacts: [],
      skillTokens: [],
      certificates: [],
      experienceYears: 2,
      educationLevel: "high-school" as const,
      languages: ["English"],
      inferredCapabilities: [],
    };

    const memoryWithRemote = recordMemoryFromCandidates(memory, [
      "https://weworkremotely.com/categories/remote-programming-jobs.rss",
      "https://www.arbeitsagentur.de/jobsuche/",
    ], 0.5, "onsite-only");

    const probes = buildMemoryProbes(memoryWithRemote, profile);
    assert.ok(probes.every((probe) => !probe.seed.includes("weworkremotely")));
    assert.ok(probes.some((probe) => probe.seed.includes("arbeitsagentur")));
  });

  it("builds memory probes before fresh discovery probes", () => {
    const memory = recordMemoryFromCandidates(emptyCityDiscoveryMemory("Berlin"), [
      "https://www.arbeitsagentur.de/jobsuche/suche?wo=Berlin",
    ]);

    const profile = {
      id: "p1",
      constraints: {
        primaryCity: "Berlin",
        acceptableCities: [],
        remotePreference: "hybrid-ok" as const,
        employmentTypes: ["full-time" as const],
        allowAgencyPostings: false,
        hideRedFlagListings: true,
        preferDirectHire: true,
      },
      intent: {
        desiredRoles: ["Backend developer"],
        desiredIndustries: [],
        avoidRoles: [],
        avoidPhrases: [],
        industryProximity: "open-to-any" as const,
        excludeProductionLine: true,
        excludeSales: true,
        excludeFoodService: true,
      },
      artifacts: [],
      skillTokens: [],
      certificates: [],
      experienceYears: 2,
      educationLevel: "high-school" as const,
      languages: ["English"],
      inferredCapabilities: [],
    };

    const memoryProbes = buildMemoryProbes(memory, profile);
    const baseProbes: SourceProbe[] = [
      {
        id: "probe-search-1",
        kind: "search_discovery",
        label: "Search: Berlin jobs",
        seed: "https://www.bing.com/search?q=Berlin+jobs",
        regionHint: "Berlin",
        intentTerms: ["berlin"],
        rationale: "Search sphere global via bing",
      },
    ];

    const merged = mergeProbesWithMemory(memoryProbes, baseProbes);
    assert.ok(merged[0]?.id.includes("memory"));
    assert.ok(merged.some((probe) => probe.kind === "search_discovery"));
  });
});
