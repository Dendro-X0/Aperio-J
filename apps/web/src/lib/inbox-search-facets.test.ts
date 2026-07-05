import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InboxItem } from "@/lib/match-service";
import { deriveInboxSearchFacets } from "./inbox-search-facets.js";

function item(
  title: string,
  facetIds: string[],
): InboxItem {
  return {
    opportunity: {
      id: title,
      title,
      body: title,
      url: "https://example.com/jobs/1",
      sourceId: "src-1",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      sourceSite: null,
      employerHint: null,
      locationText: null,
      employmentType: "unknown",
      posterType: "unknown",
      roleCategories: [],
      requiredSignals: [],
      contactHints: { phones: [], emails: [], wechat: [], qq: [] },
      redFlags: [],
      trustWarnings: [],
      taxonomyRefs: facetIds.map((id) => ({ id, label: id, kind: "subSector" as const })),
    },
    match: {
      opportunityId: title,
      excluded: false,
      breakdown: {
        intentScore: 70,
        capabilityScore: 70,
        trustScore: 70,
        geoScore: 70,
        finalScore: 70,
      },
      confidence: "medium",
      intentHits: [],
      capabilityHits: [],
      taxonomyHits: [],
      cautions: [],
      explanation: "",
    },
  };
}

describe("deriveInboxSearchFacets", () => {
  it("returns empty facets when query is blank", () => {
    const facets = deriveInboxSearchFacets(
      [item("Frontend engineer", ["subSector:frontend-dev"])],
      "",
    );
    assert.deepEqual(facets, []);
  });

  it("returns role facets from search-matching items", () => {
    const items = [
      item("Senior frontend engineer", ["subSector:frontend-dev"]),
      item("Backend platform engineer", ["subSector:backend-dev"]),
      item("Another frontend role", ["subSector:frontend-dev"]),
    ];

    const facets = deriveInboxSearchFacets(items, "frontend");
    assert.equal(facets[0]?.id, "subSector:frontend-dev");
    assert.equal(facets[0]?.count, 2);
  });
});
