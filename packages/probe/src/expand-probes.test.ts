import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { expandSourceProbes, expandSourceProbesSummary } from "./expand-probes.js";
import { resolveProbePack } from "./probe-packs.js";

function minimalProfile(city: string): SeekerProfile {
  return {
    id: "test",
    constraints: {
      primaryCity: city,
      acceptableCities: [],
      remotePreference: "onsite-only",
      employmentTypes: ["full-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: true,
    },
    intent: {
      desiredRoles: ["质检"],
      desiredIndustries: ["电子"],
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
    languages: ["普通话"],
    inferredCapabilities: [],
  };
}

describe("expandSourceProbes", () => {
  it("resolves Shenzhen probe pack", () => {
    const pack = resolveProbePack("深圳");
    assert.equal(pack.id, "zh-CN-GD-SZ");
  });

  it("emits search probes before registry for Shenzhen", () => {
    const probes = expandSourceProbes(minimalProfile("深圳"));
    assert.ok(probes.length >= 6);
    assert.ok(probes.some((probe) => probe.kind === "registry_lookup"));
    assert.ok(!probes.some((probe) => probe.kind === "rss_autodiscover"));
    assert.ok(probes.some((probe) => probe.seed.includes("zhaopin.com")));
    assert.ok(probes.some((probe) => probe.seed.includes("zhipin.com")));
    assert.ok(!probes.some((probe) => probe.seed === "https://www.51job.com/"));
    assert.ok(!probes.some((probe) => probe.seed === "https://www.lagou.com/"));
    assert.equal(probes[0]?.kind, "search_discovery");
  });

  it("resolves Guangzhou probe pack", () => {
    const pack = resolveProbePack("广州");
    assert.equal(pack.id, "zh-CN-GD-GZ");
  });

  it("adds city slug aggregators for unknown cities with slug map", () => {
    const probes = expandSourceProbes(minimalProfile("杭州"));
    assert.ok(probes.some((probe) => probe.seed === "https://hangzhou.zhaopin.com/"));
  });

  it("adds search discovery probes for any city", () => {
    const probes = expandSourceProbes(minimalProfile("佛山"));
    assert.ok(probes.some((probe) => probe.kind === "search_discovery"));
    assert.ok(probes.some((probe) => probe.seed.includes("baidu.com/s?")));
  });

  it("uses remote boards only for CN hybrid tech profiles", () => {
    const profile = minimalProfile("深圳");
    profile.constraints.remotePreference = "hybrid-ok";
    profile.intent.desiredRoles = ["后端开发"];
    profile.intent.desiredIndustries = ["软件"];
    const summary = expandSourceProbesSummary(profile);
    assert.ok(summary.probes.every((probe) => probe.regionHint === "remote"));
    assert.ok(summary.probes.some((probe) => probe.seed.includes("weworkremotely")));
    assert.ok(!summary.probes.some((probe) => probe.kind === "search_discovery"));
    assert.ok(!summary.probes.some((probe) => probe.seed.includes("zhipin.com")));
  });

  it("keeps local search probes for CN hybrid factory-worker profiles", () => {
    const profile = minimalProfile("深圳");
    profile.constraints.remotePreference = "hybrid-ok";
    profile.intent.desiredRoles = ["普工"];
    profile.intent.desiredIndustries = ["电子制造"];
    const probes = expandSourceProbes(profile);
    assert.equal(probes[0]?.kind, "search_discovery");
    assert.ok(probes.some((probe) => probe.seed.includes("baidu.com/s?")));
    assert.ok(probes.some((probe) => probe.seed.includes("zhipin.com")));
    assert.ok(!probes.every((probe) => probe.regionHint === "remote"));
  });

  it("keeps local probes for CN onsite-only profiles", () => {
    const profile = minimalProfile("深圳");
    profile.constraints.remotePreference = "onsite-only";
    const probes = expandSourceProbes(profile);
    assert.ok(probes.some((probe) => probe.kind === "search_discovery"));
    assert.ok(probes.some((probe) => probe.seed.includes("zhaopin.com")));
    assert.ok(!probes.some((probe) => probe.seed === "https://www.51job.com/"));
  });

  it("uses global-city pack for international cities", () => {
    const pack = resolveProbePack("Frankfurt am Main");
    assert.equal(pack.id, "global-city");

    const probes = expandSourceProbes(minimalProfile("Frankfurt am Main"));
    assert.equal(probes[0]?.kind, "search_discovery");
    assert.ok(probes.some((probe) => probe.seed.includes("arbeitsagentur.de")));
    assert.ok(probes.some((probe) => probe.seed.includes("google.com/search?")));
    assert.ok(probes.some((probe) => probe.seed.includes("bing.com/search?")));
    assert.ok(!probes.some((probe) => probe.seed.includes("baidu.com")));
    assert.ok(!probes.some((probe) => probe.seed.includes("51job.com")));
  });

  it("includes local and search probes for Paris", () => {
    const probes = expandSourceProbes(minimalProfile("Paris"));
    assert.ok(probes.some((probe) => probe.seed.includes("francetravail.fr")));
    assert.ok(probes.some((probe) => probe.kind === "search_discovery"));
    assert.equal(probes[0]?.kind, "search_discovery");
  });

  it("includes SF government careers for San Francisco", () => {
    const probes = expandSourceProbes(minimalProfile("San Francisco"));
    assert.ok(probes.some((probe) => probe.seed.includes("careers.sf.gov")));
  });

  it("uses Google and Bing search probes for Bonn", () => {
    const probes = expandSourceProbes(minimalProfile("Bonn"));
    assert.ok(probes.some((probe) => probe.seed.includes("google.com/search?q=Bonn")));
    assert.ok(probes.some((probe) => probe.rationale?.includes("sphere global")));
  });

  it("uses global-remote pack when no city is set", () => {
    const pack = resolveProbePack("", []);
    assert.equal(pack.id, "global-remote");
  });

  it("routes Japanese kanji cities to global-city pack with Hello Work", () => {
    const pack = resolveProbePack("東京");
    assert.equal(pack.id, "global-city");

    const probes = expandSourceProbes(minimalProfile("東京"));
    assert.ok(probes.some((probe) => probe.seed.includes("hellowork.mhlw.go.jp")));
    assert.ok(probes.some((probe) => probe.seed.includes("jp.indeed.com")));
    assert.ok(probes.some((probe) => probe.rationale?.includes("sphere jp")));
    assert.ok(!probes.some((probe) => probe.seed.includes("baidu.com")));
    assert.ok(!probes.some((probe) => probe.seed.includes("51job.com")));
  });

  it("routes Osaka kanji to Hello Work and Japanese search probes", () => {
    const probes = expandSourceProbes(minimalProfile("大阪"));
    assert.ok(probes.some((probe) => probe.seed.includes("hellowork.mhlw.go.jp")));
    assert.ok(probes.some((probe) => probe.rationale?.includes("sphere jp")));
  });

  it("prioritizes search before Berlin registry and remote boards", () => {
    const profile = minimalProfile("Berlin");
    profile.constraints.remotePreference = "hybrid-ok";
    profile.intent.desiredRoles = ["backend developer"];
    const probes = expandSourceProbes(profile);

    assert.equal(probes[0]?.kind, "search_discovery");
    assert.ok(
      probes.some(
        (probe) =>
          probe.kind === "search_discovery" &&
          (probe.seed.includes(encodeURIComponent("backend developer")) ||
            probe.label.includes("backend developer")),
      ),
    );

    const firstRemoteIndex = probes.findIndex((probe) => probe.regionHint === "remote");
    const firstLocalRegistryIndex = probes.findIndex((probe) =>
      probe.seed.includes("arbeitsagentur.de"),
    );

    assert.ok(firstRemoteIndex >= 0);
    if (firstLocalRegistryIndex >= 0) {
      assert.ok(firstRemoteIndex < firstLocalRegistryIndex);
    }
    assert.ok(probes.filter((probe) => probe.regionHint === "remote").length <= 8);
  });

  it("discovers unknown cities via search without preset registry hits", () => {
    const profile = minimalProfile("Kraków");
    profile.intent.desiredRoles = ["software engineer"];
    const probes = expandSourceProbes(profile);

    assert.equal(probes[0]?.kind, "search_discovery");
    assert.ok(probes.some((probe) => probe.kind === "search_discovery"));
    assert.ok(!probes.some((probe) => probe.seed.includes("francetravail.fr")));
    assert.ok(!probes.some((probe) => probe.seed.includes("arbeitsagentur.de")));
    assert.ok(
      probes.some(
        (probe) =>
          probe.kind === "search_discovery" &&
          (probe.seed.includes(encodeURIComponent("software engineer")) ||
            probe.label.includes("software engineer")),
      ),
    );
  });
});
