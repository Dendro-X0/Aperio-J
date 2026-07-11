import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./resolve-database-url.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isTursoDatabaseUrl(url: string): boolean {
  return url.startsWith("libsql://");
}

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? "file:../../data/aperio-j.db";

  if (isTursoDatabaseUrl(rawUrl)) {
    const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;
    if (!authToken) {
      throw new Error("TURSO_AUTH_TOKEN is required when DATABASE_URL uses libsql://");
    }

    const adapter = new PrismaLibSql({
      url: rawUrl,
      authToken,
    });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(rawUrl),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

void prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL").catch(() => undefined);
void prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL").catch(() => undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from "@prisma/client";
export { resolveDatabaseUrl } from "./resolve-database-url.js";
