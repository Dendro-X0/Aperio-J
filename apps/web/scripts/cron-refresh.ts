import { runScheduledRefresh } from "../src/lib/cron-service.js";

const forceRediscover = process.argv.includes("--force-rediscover");
const forceMatch = process.argv.includes("--force-match");
const profileArg = process.argv.find((arg) => arg.startsWith("--profile="));
const profileId = profileArg?.slice("--profile=".length);

const summary = await runScheduledRefresh({
  forceRediscover,
  forceMatch,
  profileId: profileId || undefined,
});

console.log(`Cron refresh @ ${summary.ranAt}`);
console.log(`Profiles checked: ${summary.profilesChecked}, refreshed: ${summary.profilesRefreshed}\n`);

for (const result of summary.results) {
  if (result.skipped) {
    console.log(`  skip ${result.profileId} (${result.primaryCity}) — ${result.skipReason}`);
    continue;
  }

  const flags = [
    result.rediscovered ? "rediscover" : null,
    result.matched ? "match" : null,
  ]
    .filter(Boolean)
    .join("+");

  console.log(
    `  ${flags} ${result.profileId} (${result.primaryCity}) — streams ${result.streamCount}, matched ${result.matchedCount}/${result.opportunityCount}`,
  );

  for (const error of result.errors.slice(0, 3)) {
    console.log(`    ! ${error}`);
  }
}
