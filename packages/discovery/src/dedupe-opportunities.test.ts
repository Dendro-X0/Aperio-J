import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dedupeOpportunities, normalizeJobUrl } from "./dedupe-opportunities.js";

describe("normalizeJobUrl", () => {
  it("strips tracking params and trailing slashes", () => {
    assert.equal(
      normalizeJobUrl("https://Example.com/jobs/123/?utm_source=x"),
      "https://example.com/jobs/123",
    );
  });
});

describe("dedupeOpportunities", () => {
  it("merges duplicate URLs and keeps richer body", () => {
    const base = {
      sourceId: "a",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      sourceSite: "example.com",
      employerHint: null,
      locationText: null,
      employmentType: "full-time" as const,
      posterType: "unknown" as const,
      roleCategories: [],
      requiredSignals: [],
      redFlags: [],
      trustWarnings: [],
      contactHints: { phones: [], emails: [], wechat: [], qq: [] },
      taxonomyRefs: [],
    };

    const short = {
      ...base,
      id: "opp-1",
      title: "Backend Engineer",
      body: "Short",
      url: "https://jobs.example.com/123?utm_source=feed",
    };
    const rich = {
      ...base,
      id: "opp-2",
      title: "Backend Engineer",
      body: "Longer description with requirements and stack details.",
      url: "https://jobs.example.com/123/",
    };

    const result = dedupeOpportunities([short, rich]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.body, rich.body);
  });
});
