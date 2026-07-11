#!/usr/bin/env node
/**
 * Ensure Turso/libSQL remote database has the Prisma schema applied.
 * Safe to run on every container start (no-op when tables already exist).
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function isTursoDatabaseUrl(url) {
  return (
    url.startsWith("libsql://") ||
    /^https:\/\/[^/]+\.turso\.io(?:[/?#]|$)/i.test(url)
  );
}

function normalizeTursoUrl(rawUrl) {
  const url = new URL(
    rawUrl.startsWith("libsql://") ? rawUrl.replace(/^libsql:/, "https:") : rawUrl,
  );
  url.searchParams.delete("authToken");
  url.searchParams.delete("token");
  url.hash = "";

  if (rawUrl.startsWith("libsql://")) {
    return `libsql://${url.host}${url.pathname}`;
  }

  return `${url.protocol}//${url.host}${url.pathname}`;
}

function resolveAuthToken(rawUrl) {
  const parsed = new URL(
    rawUrl.startsWith("libsql://") ? rawUrl.replace(/^libsql:/, "https:") : rawUrl,
  );

  return (
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    parsed.searchParams.get("authToken")?.trim() ||
    parsed.searchParams.get("token")?.trim() ||
    null
  );
}

function parseSchemaStatements(raw) {
  const cleaned = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("◇"))
    .join("\n");

  return cleaned
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function main() {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl || !isTursoDatabaseUrl(rawUrl)) {
    console.log("ensure-turso-schema: not a Turso URL — skipping");
    return;
  }

  const authToken = resolveAuthToken(rawUrl);
  if (!authToken) {
    throw new Error("TURSO_AUTH_TOKEN is required to bootstrap Turso schema");
  }

  const client = createClient({
    url: normalizeTursoUrl(rawUrl),
    authToken,
  });

  const existing = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SeekerProfileRecord'",
  });

  if (existing.rows.length > 0) {
    console.log("ensure-turso-schema: tables already exist");
    return;
  }

  const schemaPath = resolve(repoRoot, "schema.sql");
  const statements = parseSchemaStatements(readFileSync(schemaPath, "utf8"));

  if (statements.length === 0) {
    throw new Error(`No SQL statements found in ${schemaPath}`);
  }

  console.log(`ensure-turso-schema: applying ${statements.length} statements to Turso`);
  await client.batch(
    statements.map((sql) => ({ sql })),
    "write",
  );
  console.log("ensure-turso-schema: schema applied");
}

main().catch((error) => {
  console.error("ensure-turso-schema failed:", error);
  process.exit(1);
});
