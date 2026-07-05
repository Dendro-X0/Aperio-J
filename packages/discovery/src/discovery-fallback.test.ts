import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isScrapeDiscoveryFallbackEnabled,
  shouldRunInitialScrapeDiscovery,
  shouldRunScrapeDiscovery,
} from "./discovery-fallback.js";

describe("discovery-fallback", () => {
  it("skips scrape discovery when connectors already returned items", () => {
    assert.equal(shouldRunScrapeDiscovery(12), false);
    assert.equal(shouldRunScrapeDiscovery(0), true);
  });

  it("skips initial scrape discovery when API connectors are configured", () => {
    assert.equal(
      shouldRunInitialScrapeDiscovery({
        connectorConfigCount: 2,
        enabledRegistryCount: 0,
        healthyRegistryCount: 0,
      }),
      false,
    );
  });

  it("allows initial scrape discovery only with empty registry and no connectors", () => {
    assert.equal(
      shouldRunInitialScrapeDiscovery({
        connectorConfigCount: 0,
        enabledRegistryCount: 0,
        healthyRegistryCount: 0,
      }),
      true,
    );
  });

  it("respects APERO_J_DISCOVERY_FALLBACK=false", () => {
    process.env.APERO_J_DISCOVERY_FALLBACK = "false";
    try {
      assert.equal(isScrapeDiscoveryFallbackEnabled(), false);
      assert.equal(shouldRunScrapeDiscovery(0), false);
    } finally {
      delete process.env.APERO_J_DISCOVERY_FALLBACK;
    }
  });
});
