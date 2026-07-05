import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./resolve-database-url.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(),
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
