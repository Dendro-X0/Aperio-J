#!/usr/bin/env node
import { createFixtureSeekerProfile } from "@aperio-j/matcher";
import { expandSourceProbesSummary } from "@aperio-j/probe";
import { runSourceDiscovery } from "@aperio-j/discovery";

const profile = createFixtureSeekerProfile();
const summary = expandSourceProbesSummary(profile);

console.log(`ProbePack: ${summary.packId}`);
console.log(`Probes: ${summary.probeCount}\n`);

for (const probe of summary.probes) {
  console.log(`  [${probe.kind}] ${probe.label}`);
  console.log(`    ${probe.rationale}`);
}

console.log("\nRunning source discovery (network)...\n");
const manifest = await runSourceDiscovery(profile, { maxProbes: 6 });

console.log(`Candidates: ${manifest.candidates.length} | Enabled: ${manifest.enabled.length}`);
for (const stream of manifest.enabled) {
  console.log(`  ✓ ${stream.label} (${stream.kind}, conf=${stream.confidence.toFixed(2)})`);
}
if (manifest.errors.length) {
  console.log("\nErrors:");
  for (const err of manifest.errors) console.log(`  - ${err}`);
}
