import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InboxItem } from "@/lib/match-service";
import { inboxItemWorkMode, matchesWorkModeFilter } from "./inbox-work-mode.js";

function item(partial: Partial<InboxItem["opportunity"]> & { source?: InboxItem["source"] }): InboxItem {
  return {
    opportunity: {
      id: "opp-1",
      title: partial.title ?? "Engineer",
      body: partial.body ?? "",
      url: "https://example.com/jobs/1",
      sourceId: "src-1",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      sourceSite: partial.sourceSite ?? null,
      employerHint: partial.employerHint ?? null,
      locationText: partial.locationText ?? null,
      employmentType: "unknown",
      posterType: "unknown",
      roleCategories: [],
      requiredSignals: [],
      contactHints: { phones: [], emails: [], wechat: [], qq: [] },
      redFlags: [],
      trustWarnings: [],
      taxonomyRefs: [],
      ...partial,
    },
    match: {
      opportunityId: "opp-1",
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
    source: partial.source,
  };
}

describe("inboxItemWorkMode", () => {
  it("classifies explicit remote listings", () => {
    assert.equal(inboxItemWorkMode(item({ locationText: "Remote" })), "remote");
    assert.equal(inboxItemWorkMode(item({ title: "Fully remote backend role" })), "remote");
  });

  it("classifies remote board sources", () => {
    assert.equal(
      inboxItemWorkMode(
        item({
          source: {
            id: "s1",
            label: "Remotive",
            seedUrl: "https://remotive.com/remote-jobs",
            kind: "rss",
            site: "remotive.com",
          },
        }),
      ),
      "remote",
    );
  });

  it("classifies city-based listings as onsite", () => {
    assert.equal(inboxItemWorkMode(item({ locationText: "Austin, TX" })), "onsite");
  });
});

describe("matchesWorkModeFilter", () => {
  const remoteItem = item({ locationText: "Remote" });
  const onsiteItem = item({ locationText: "Philadelphia" });

  it("passes all items when filter is all", () => {
    assert.equal(matchesWorkModeFilter(remoteItem, "all"), true);
    assert.equal(matchesWorkModeFilter(onsiteItem, "all"), true);
  });

  it("filters by remote and onsite", () => {
    assert.equal(matchesWorkModeFilter(remoteItem, "remote"), true);
    assert.equal(matchesWorkModeFilter(onsiteItem, "remote"), false);
    assert.equal(matchesWorkModeFilter(onsiteItem, "onsite"), true);
    assert.equal(matchesWorkModeFilter(remoteItem, "onsite"), false);
  });
});
