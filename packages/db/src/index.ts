import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./resolve-database-url.js";
import { isTursoDatabaseUrl, resolveTursoConfig } from "./turso.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? "file:../../data/aperio-j.db";

  if (isTursoDatabaseUrl(rawUrl)) {
    const { url, authToken } = resolveTursoConfig(rawUrl);

    const adapter = new PrismaLibSql({
      url,
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
globalForPrisma.prisma = prisma;

if (!isTursoDatabaseUrl(process.env.DATABASE_URL ?? "")) {
  void prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL").catch(() => undefined);
  void prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL").catch(() => undefined);
}

export type { PrismaClient } from "@prisma/client";
export { resolveDatabaseUrl } from "./resolve-database-url.js";
export {
  isTursoDatabaseUrl,
  normalizeTursoDatabaseUrl,
  resolveTursoAuthToken,
  resolveTursoConfig,
} from "./turso.js";
