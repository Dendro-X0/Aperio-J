import { NextResponse } from "next/server";
import { prisma, ensureDbReady, isTursoDatabaseUrl, resolveTursoAuthToken } from "@aperio-j/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const turso = isTursoDatabaseUrl(databaseUrl);

  try {
    await ensureDbReady();
    const count = await prisma.seekerProfileRecord.count();
    return NextResponse.json({
      ok: true,
      backend: turso ? "turso" : "sqlite",
      profileCount: count,
      hasAuthToken: turso ? Boolean(resolveTursoAuthToken()) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database check failed";
    console.error("health/db failed", error);
    return NextResponse.json(
      {
        ok: false,
        backend: turso ? "turso" : "sqlite",
        hasAuthToken: turso ? Boolean(resolveTursoAuthToken()) : null,
        error: message,
      },
      { status: 503 },
    );
  }
}
