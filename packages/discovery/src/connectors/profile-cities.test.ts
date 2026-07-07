import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SeekerProfile } from "@aperio-j/core";
import { listUniqueProfileCities } from "./profile-cities.js";
import { resolveConnectorsForProfile } from "./resolve-connectors.js";

function minimalProfile(overrides: Partial<SeekerProfile> = {}): SeekerProfile {
  return {
    id: "profile-test",
    constraints: {
      primaryCity: "Frankfurt",
      acceptableCities: [],
      remotePreference: "hybrid-ok",
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
    ...overrides,
  };
}

describe("connectors/profile-cities", () => {
  it("dedupes primary and acceptable cities by identity", () => {
    const cities = listUniqueProfileCities(
      minimalProfile({
        constraints: {
          ...minimalProfile().constraints,
          primaryCity: "Munich",
          acceptableCities: ["München", "Berlin"],
        },
      }),
    );
    assert.deepEqual(cities, ["Munich", "Berlin"]);
  });
});

describe("connectors/resolve-connectors multi-city", () => {
  it("builds separate Adzuna streams per profile city", () => {
    process.env.APERO_J_ADZUNA_APP_ID = "test";
    process.env.APERO_J_ADZUNA_APP_KEY = "test";
    try {
      const configs = resolveConnectorsForProfile(
        minimalProfile({
          constraints: {
            ...minimalProfile().constraints,
            primaryCity: "Frankfurt",
            acceptableCities: ["Munich"],
          },
        }),
      );
      const adzuna = configs.filter((row) => row.connectorId === "adzuna");
      assert.equal(adzuna.length, 2);
      assert.ok(adzuna.some((row) => row.query.city === "Frankfurt"));
      assert.ok(adzuna.some((row) => row.query.city === "Munich"));
    } finally {
      delete process.env.APERO_J_ADZUNA_APP_ID;
      delete process.env.APERO_J_ADZUNA_APP_KEY;
    }
  });

  it("dedupes Himalayas streams for cities in the same Adzuna country", () => {
    const configs = resolveConnectorsForProfile(
      minimalProfile({
        constraints: {
          ...minimalProfile().constraints,
          primaryCity: "Frankfurt",
          acceptableCities: ["Munich"],
        },
      }),
    );
    const himalayas = configs.filter((row) => row.connectorId === "himalayas");
    assert.equal(himalayas.length, 1);
  });
});
