#!/usr/bin/env node
/**
 * Live connector smoke test — Frankfurt hybrid profile.
 * Usage: pnpm build && node scripts/connector-smoke.mjs
 */
import { resolveConnectorsForProfile } from "@aperio-j/discovery/connectors/resolve-connectors";
import { fetchAllStreams } from "@aperio-j/discovery/fetch-streams";
import { parseClassifiedStreamFetchError } from "@aperio-j/discovery/fetch-error-classify";

function adzunaConfigured() {
  return Boolean(
    process.env.APERO_J_ADZUNA_APP_ID?.trim() && process.env.APERO_J_ADZUNA_APP_KEY?.trim(),
  );
}

function frankfurtHybridProfile(id = "smoke-frankfurt") {
  return {
    id,
    constraints: {
      primaryCity: "Frankfurt",
      acceptableCities: [],
      remotePreference: "hybrid-ok",
      employmentTypes: [],
      allowAgencyPostings: true,
      hideRedFlagListings: false,
      preferDirectHire: false,
    },
    intent: {
      desiredRoles: ["Full-stack"],
      desiredIndustries: [],
      avoidRoles: [],
      avoidPhrases: [],
      industryProximity: "open-to-any",
      excludeProductionLine: false,
      excludeSales: false,
      excludeFoodService: false,
    },
    artifacts: [{ industry: "Software", occupation: "Full-stack developer" }],
    skillTokens: ["React", "Node.js"],
    certificates: [],
    experienceYears: 3,
    educationLevel: "bachelor",
    languages: ["English", "German"],
    inferredCapabilities: [],
  };
}

async function main() {
  delete process.env.APERO_J_CONNECTOR_FIXTURES;

  const profile = frankfurtHybridProfile();
  const creds = adzunaConfigured();

  console.log("=== Frankfurt hybrid connector smoke ===\n");
  console.log(`Adzuna credentials: ${creds ? "configured (env)" : "NOT configured (Adzuna skipped)"}`);

  const configs = resolveConnectorsForProfile(profile);
  console.log(`\nResolved connectors (${configs.length}):`);
  for (const row of configs) {
    console.log(`  - ${row.connectorId}: ${row.label}`);
  }

  if (configs.length === 0) {
    console.error("\nFAIL: no connectors resolved");
    process.exit(1);
  }

  console.log("\nFetching live (may take ~30s)...\n");
  const { items, errors, results } = await fetchAllStreams(configs);

  console.log("Per-connector results:");
  for (const result of results) {
    const config = configs.find((row) => row.id === result.streamId);
    const id = config?.connectorId ?? result.label;
    const status = result.error ? `ERROR: ${result.error}` : `${result.items.length} raw items`;
    console.log(`  ${id}: ${status}`);
  }

  if (errors.length > 0) {
    console.log("\nClassified errors:");
    for (const raw of errors) {
      const parsed = parseClassifiedStreamFetchError(raw);
      console.log(`  ${parsed ? `[${parsed.kind}] ${parsed.label}: ${parsed.detail}` : raw}`);
    }
  }

  console.log(`\nTotal after dedupe: ${items.length} items`);

  const byConnector = new Map();
  for (const item of items) {
    const result = results.find((row) => row.streamId === item.sourceId);
    const config = configs.find((row) => row.id === item.sourceId);
    const key = config?.connectorId ?? "unknown";
    byConnector.set(key, (byConnector.get(key) ?? 0) + 1);
  }

  console.log("\nItems by connector (post-dedupe):");
  for (const [key, count] of byConnector) {
    console.log(`  ${key}: ${count}`);
  }

  if (items.length > 0) {
    console.log("\nSample titles:");
    for (const item of items.slice(0, 5)) {
      console.log(`  - ${item.title}`);
      console.log(`    ${item.url}`);
    }
  }

  const hasBundes = results.some(
    (row) => configs.find((c) => c.id === row.streamId)?.connectorId === "bundesagentur" && row.items.length > 0,
  );
  const hasRemote = results.some((row) => {
    const id = configs.find((c) => c.id === row.streamId)?.connectorId;
    return ["remotive", "remoteok", "arbeitnow"].includes(id ?? "") && row.items.length > 0;
  });

  console.log("\n=== Exit checks ===");
  console.log(`  Bundesagentur returned items: ${hasBundes ? "PASS" : "FAIL"}`);
  console.log(`  Remote bundle returned items: ${hasRemote ? "PASS" : "FAIL"}`);
  console.log(`  Deduped total > 0: ${items.length > 0 ? "PASS" : "FAIL"}`);

  if (!hasBundes || !hasRemote || items.length === 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
