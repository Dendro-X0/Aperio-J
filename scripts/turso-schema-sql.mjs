#!/usr/bin/env node
/**
 * Emit SQL to create the current Prisma schema on a fresh database.
 *
 * Usage:
 *   node scripts/turso-schema-sql.mjs > schema.sql
 *   turso db shell <db-name> < schema.sql          # optional managed Turso
 *   sqlite3 /path/to/aperio-j.db < schema.sql      # self-hosted bare metal
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dbRoot = resolve(repoRoot, "packages/db");

const sql = execSync(
  "pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
  { cwd: dbRoot, encoding: "utf8" },
);

process.stdout.write(sql);
