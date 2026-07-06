import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InboxItem } from "@/lib/match-service";
import { findRelatedInboxItems, scoreRelatedInboxItem } from "@/lib/related-inbox-items";

function item(
  id: string,
  title: string,
  overrides: Partial<InboxItem["opportunity"]> = {},
  matchScore = 70,
): InboxItem {
  return {
    opportunity: {
      id,
      title,
      body: title,
      url: `https://example.com/jobs/${id}`,
      sourceId: "src",
      fetchedAt: "2026-07-05T00:00:00Z",
      locationText: "Remote",
      posterType: "direct",
      employmentType: "full-time",
      roleCategories: ["other"],
      redFlags: [],
      employerHint: null,
      requiredSignals: [],
      ...overrides,
    },
    match: {
      opportunityId: id,
      excluded: false,
      breakdown: {
        intentScore: matchScore,
        capabilityScore: matchScore,
        trustScore: matchScore,
        geoScore: matchScore,
        finalScore: matchScore,
      },
      confidence: "medium",
      intentHits: [],
      capabilityHits: [],
      taxonomyHits: [],
      cautions: [],
      explanation: "",
    },
    source: {
      id: "src",
      label: "Remote OK",
      kind: "rss",
      seedUrl: "https://remoteok.com/remote-jobs.rss",
      site: "remoteok.com",
    },
  };
}

describe("related-inbox-items", () => {
  it("ranks listings with title and taxonomy overlap higher", () => {
    const anchor = item("a1", "Senior Backend Engineer", {
      taxonomyRefs: [{ id: "industry:software", kind: "industry", label: "Software" }],
      roleCategories: ["other"],
    });

    const related = item("r1", "Backend Engineer — API Platform", {
      taxonomyRefs: [{ id: "industry:software", kind: "industry", label: "Software" }],
    });
    const unrelated = item("u1", "Customer Support Representative", {
      locationText: "Remote",
      taxonomyRefs: [{ id: "industry:retail", kind: "industry", label: "Retail" }],
    });

    assert.ok(scoreRelatedInboxItem(anchor, related) > scoreRelatedInboxItem(anchor, unrelated));

    const picks = findRelatedInboxItems(anchor, [unrelated, related], { limit: 3 });
    assert.equal(picks.length, 1);
    assert.equal(picks[0]!.opportunity.id, "r1");
  });

  it("excludes self, excluded rows, and duplicate URLs", () => {
    const anchor = item("a1", "DevOps Engineer");
    const duplicate = item("a1", "DevOps Engineer");
    const excluded = item("e1", "DevOps Engineer", {}, 80);
    excluded.match.excluded = true;

    assert.equal(scoreRelatedInboxItem(anchor, duplicate), -1);
    assert.equal(scoreRelatedInboxItem(anchor, excluded), -1);
  });
});
