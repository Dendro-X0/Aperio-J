import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isFirecrawlEnabled } from "./firecrawl-fetch.js";

describe("firecrawl-fetch", () => {
  it("is disabled without API key", () => {
    const previous = process.env.APERO_J_FIRECRAWL_API_KEY;
    delete process.env.APERO_J_FIRECRAWL_API_KEY;
    try {
      assert.equal(isFirecrawlEnabled(), false);
    } finally {
      if (previous !== undefined) process.env.APERO_J_FIRECRAWL_API_KEY = previous;
    }
  });

  it("is enabled when API key is set", () => {
    const previous = process.env.APERO_J_FIRECRAWL_API_KEY;
    process.env.APERO_J_FIRECRAWL_API_KEY = "fc-test-key";
    try {
      assert.equal(isFirecrawlEnabled(), true);
    } finally {
      if (previous === undefined) delete process.env.APERO_J_FIRECRAWL_API_KEY;
      else process.env.APERO_J_FIRECRAWL_API_KEY = previous;
    }
  });
});
