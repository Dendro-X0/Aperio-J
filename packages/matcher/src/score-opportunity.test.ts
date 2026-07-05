import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOpportunities } from "@aperio-j/discovery/parse-opportunity";
import { createFixtureSeekerProfile, FIXTURE_FEED_ITEMS } from "./fixtures.js";
import { rankOpportunities } from "./score-opportunity.js";

describe("rankOpportunities — fixture seeker", () => {
  it("ranks QC and warehouse above excluded production-line and sales", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS);
    const ranked = rankOpportunities(opportunities, profile);

    assert.ok(ranked.length >= 3);

    const titles = ranked.map((row) => row.opportunity.title);
    assert.ok(titles[0]?.includes("IQC") || titles[0]?.includes("仓库"));

    const excludedTitles = opportunities
      .filter((opp) => {
        const row = rankOpportunities([opp], profile, { includeExcluded: true })[0];
        return row?.match.excluded;
      })
      .map((opp) => opp.title);

    assert.ok(excludedTitles.some((title) => title.includes("普工")));
    assert.ok(excludedTitles.some((title) => title.includes("销售")));
  });

  it("provides explainable match strings", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS);
    const ranked = rankOpportunities(opportunities, profile);
    const top = ranked[0];

    assert.ok(top);
    assert.ok(top.match.explanation.length > 10);
    assert.equal(top.match.excluded, false);
    assert.ok(top.match.breakdown.finalScore >= 55);
  });

  it("localizes explanations for en locale", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS, { locale: "en" });
    const ranked = rankOpportunities(opportunities, profile, { locale: "en" });
    const top = ranked[0];

    assert.ok(top);
    assert.match(top.match.explanation, /Intent match|Experience overlap|Location/i);
  });

  it("localizes exclusion reasons for en locale", () => {
    const profile = createFixtureSeekerProfile();
    const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS, { locale: "en" });
    const excluded = rankOpportunities(opportunities, profile, {
      includeExcluded: true,
      locale: "en",
    }).filter((row) => row.match.excluded);

    assert.ok(excluded.length > 0);
    assert.ok(
      excluded.some((row) =>
        /Not recommended|excluded|filtered|outside/i.test(row.match.explanation),
      ),
    );
  });
});
