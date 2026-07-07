import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCityForApi, resolveAdzunaCountry } from "./geo.js";

describe("Adzuna routing via metro catalog", () => {
  it("resolves country from metro table before regex fallback", () => {
    assert.equal(resolveAdzunaCountry("Munich"), "de");
    assert.equal(resolveAdzunaCountry("Austin"), "us");
    assert.equal(resolveAdzunaCountry("Krakow"), "pl");
  });

  it("normalizes API where clause from metro routing", () => {
    assert.equal(normalizeCityForApi("Munich"), "München");
    assert.equal(normalizeCityForApi("Cologne"), "Köln");
    assert.equal(normalizeCityForApi("The Hague"), "The Hague");
    assert.equal(normalizeCityForApi("Frankfurt am Main, Hesse"), "Frankfurt");
  });
});
