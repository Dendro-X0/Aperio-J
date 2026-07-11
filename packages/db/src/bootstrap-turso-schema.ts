import { createClient } from "@libsql/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTursoDatabaseUrl, resolveTursoConfig } from "./turso.js";

function parseSchemaStatements(raw: string): string[] {
  const cleaned = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("◇"))
    .join("\n");

  return cleaned
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function resolveSchemaPath(): string {
  const configured = process.env.APERIO_J_SCHEMA_SQL?.trim();
  if (configured && existsSync(configured)) {
    return configured;
  }

  const candidates = [
    resolve(process.cwd(), "schema.sql"),
    resolve(process.cwd(), "../../schema.sql"),
    resolve(process.cwd(), "../../../schema.sql"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Turso schema bootstrap: schema.sql not found (set APERIO_J_SCHEMA_SQL or place schema.sql in process.cwd())",
  );
}

export async function bootstrapTursoSchemaIfNeeded(): Promise<void> {
  const rawUrl = process.env.DATABASE_URL ?? "";
  if (!isTursoDatabaseUrl(rawUrl)) {
    return;
  }

  const { url, authToken } = resolveTursoConfig(rawUrl);
  const client = createClient({ url, authToken });

  const existing = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SeekerProfileRecord'",
  });

  if (existing.rows.length > 0) {
    return;
  }

  const schemaPath = resolveSchemaPath();
  const statements = parseSchemaStatements(readFileSync(schemaPath, "utf8"));

  if (statements.length === 0) {
    throw new Error(`Turso schema bootstrap: no SQL statements in ${schemaPath}`);
  }

  console.log(`bootstrap-turso-schema: applying ${statements.length} statements from ${schemaPath}`);
  await client.batch(
    statements.map((sql) => ({ sql })),
    "write",
  );
  console.log("bootstrap-turso-schema: schema applied");
}
