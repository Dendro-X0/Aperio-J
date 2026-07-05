#!/usr/bin/env node
/**
 * Demo: parse fixture feed items and rank for the sample Shenzhen seeker.
 * Usage: pnpm fixture:run (after build)
 */
import { parseOpportunities } from "@aperio-j/discovery";
import {
  createFixtureSeekerProfile,
  FIXTURE_FEED_ITEMS,
  rankOpportunities,
} from "@aperio-j/matcher";

const profile = createFixtureSeekerProfile();
const opportunities = parseOpportunities(FIXTURE_FEED_ITEMS);
const all = rankOpportunities(opportunities, profile, { includeExcluded: true });

console.log(`Seeker: ${profile.constraints.primaryCity} | wants: ${profile.intent.desiredRoles.join(", ")}\n`);

for (const { opportunity, match } of all) {
  const status = match.excluded ? "EXCLUDED" : `score ${match.breakdown.finalScore}`;
  console.log(`[${status}] ${opportunity.title}`);
  console.log(`  ${match.explanation}\n`);
}
