import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCountryFallbackStreams,
  resolveIndeedHostForCity,
  resolveMetroSlug,
} from "./metro-intl.js";
import { buildInternationalCityStreams } from "./probe-packs.js";

describe("metro-intl", () => {
  it("resolves slugs from metro catalog aliases", () => {
    assert.equal(resolveMetroSlug("Munich"), "munich");
    assert.equal(resolveMetroSlug("München"), "munich");
    assert.equal(resolveMetroSlug("Kraków"), "krakow");
    assert.equal(resolveMetroSlug("Hangzhou"), "hangzhou");
  });

  it("maps country codes to Indeed hosts", () => {
    assert.equal(resolveIndeedHostForCity("Munich", "munich"), "de.indeed.com");
    assert.equal(resolveIndeedHostForCity("London", "london"), "uk.indeed.com");
    assert.equal(resolveIndeedHostForCity("Krakow", "krakow"), "pl.indeed.com");
  });

  it("builds country fallback streams for metros without curated registry", () => {
    const streams = buildCountryFallbackStreams("de", "munich", "Munich");
    assert.ok(streams.some((row) => row.seedUrl.includes("arbeitsagentur.de")));
    assert.ok(streams.some((row) => row.seedUrl.includes(encodeURIComponent("Munich"))));
  });

  it("adds Munich local boards via country fallback", () => {
    const streams = buildInternationalCityStreams("Munich");
    assert.ok(streams.some((row) => row.seedUrl.includes("arbeitsagentur.de")));
    assert.ok(streams.some((row) => row.seedUrl.includes("de.indeed.com")));
  });
});
