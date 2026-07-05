import { NextResponse } from "next/server";
import { runScheduledRefresh, verifyCronSecret } from "@/lib/cron-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handleCron(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const forceRediscover = url.searchParams.get("forceRediscover") === "1";
  const forceMatch = url.searchParams.get("forceMatch") === "1";
  const profileId = url.searchParams.get("profileId") ?? undefined;

  try {
    const summary = await runScheduledRefresh({
      forceRediscover,
      forceMatch,
      profileId,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Vercel Cron invokes GET. Manual/CLI may use POST. */
export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
