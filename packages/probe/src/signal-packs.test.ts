import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { BUILTIN_SIGNAL_PACKS } from "./signal-packs/builtin-packs.js";
import { loadExternalSignalPacks } from "./signal-packs/load-external.js";
import {
  listSignalPacks,
  registerExternalSignalPacks,
  resetSignalPackCache,
  resolveSignalPacksForProfile,
} from "./signal-packs/resolve.js";

function profile(overrides: {
  intent?: Partial<SeekerProfile["intent"]>;
  constraints?: Partial<SeekerProfile["constraints"]>;
  artifacts?: SeekerProfile["artifacts"];
} = {}): Pick<SeekerProfile, "constraints" | "intent" | "artifacts"> {
  return {
    intent: {
      desiredRoles: ["普工"],
      desiredIndustries: ["电子制造"],
      avoidPhrases: [],
      avoidRoles: [],
      industryProximity: "open-to-any",
      excludeProductionLine: false,
      excludeSales: false,
      excludeFoodService: false,
      ...overrides.intent,
    },
    constraints: {
      primaryCity: "深圳市",
      acceptableCities: [],
      remotePreference: "onsite-only",
      employmentTypes: ["full-time"],
      allowAgencyPostings: false,
      hideRedFlagListings: true,
      preferDirectHire: false,
      ...overrides.constraints,
    },
    artifacts: overrides.artifacts ?? [],
  };
}

describe("signal-packs", () => {
  it("matches Shenzhen factory pack for blue-collar intent", () => {
    const packs = resolveSignalPacksForProfile(profile());
    assert.ok(packs.some((pack) => pack.id === "zh-CN-shenzhen-factory"));
    assert.ok(
      packs
        .find((pack) => pack.id === "zh-CN-shenzhen-factory")
        ?.streams.some((stream) => stream.seedUrl.includes("58.com")),
    );
  });

  it("skips factory packs for pure software intent", () => {
    const packs = resolveSignalPacksForProfile(
      profile({
        intent: {
          desiredRoles: ["后端开发工程师"],
          desiredIndustries: ["互联网"],
          avoidPhrases: [],
        },
      }),
    );
    assert.ok(!packs.some((pack) => pack.id.includes("factory")));
  });

  it("loads external JSON packs from a directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "aperio-signal-packs-"));
    writeFileSync(
      join(dir, "custom-pack.json"),
      JSON.stringify({
        id: "custom-test-pack",
        locale: "zh-CN",
        citySlugs: ["shenzhen"],
        roleKeywords: ["测试岗位"],
        streams: [
          {
            id: "custom-stream",
            label: "Custom feed",
            seedUrl: "https://example.com/jobs.rss",
            kind: "rss",
            domainTier: "unknown",
          },
        ],
      }),
    );

    const packs = loadExternalSignalPacks(dir);
    assert.equal(packs.length, 1);
    assert.equal(packs[0]?.id, "custom-test-pack");
  });

  it("merges builtin and registered external packs", () => {
    resetSignalPackCache();
    registerExternalSignalPacks([
      {
        id: "merge-pack",
        locale: "zh-CN",
        citySlugs: ["shenzhen"],
        roleKeywords: ["merge"],
        streams: [
          {
            id: "merge-stream",
            label: "Merge feed",
            seedUrl: "https://example.com/merge.rss",
            kind: "rss",
            domainTier: "unknown",
          },
        ],
      },
    ]);
    const packs = listSignalPacks();
    assert.ok(packs.length >= BUILTIN_SIGNAL_PACKS.length + 1);
    assert.ok(packs.some((pack) => pack.id === "merge-pack"));
    resetSignalPackCache();
  });
});
