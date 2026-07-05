import { NextResponse } from "next/server";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { isDiscoveryReadyProfile } from "@/lib/profile-readiness";
import { loadLatestInbox, runMatchPipeline } from "@/lib/match-service";
import { getRequestTranslator } from "@/lib/request-i18n";
import { isDiscoveryAborted } from "@aperio-j/discovery/discovery-abort";

function wantsStream(request: Request): boolean {
  return new URL(request.url).searchParams.get("stream") === "1";
}

export async function GET() {
  const { t, locale } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.onboardingRequired") }, { status: 401 });
  }

  const profile = await loadSeekerProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  const inbox = await loadLatestInbox(profile, locale);
  return NextResponse.json(inbox);
}

export async function POST(request: Request) {
  const { t, locale } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.onboardingRequired") }, { status: 401 });
  }

  const profile = await loadSeekerProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  if (!isDiscoveryReadyProfile(profile)) {
    return NextResponse.json({ error: t("api.discoveryNotReady") }, { status: 400 });
  }

  if (wantsStream(request)) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: object) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          const inbox = await runMatchPipeline(profile, locale, {
            onPhase: (phase, detail) => emit({ type: "phase", phase, detail }),
            signal: request.signal,
          });
          emit({ type: "result", payload: inbox });
        } catch (error) {
          if (isDiscoveryAborted(error)) {
            emit({ type: "error", message: t("inbox.refreshCancelled") });
            return;
          }
          emit({
            type: "error",
            message: error instanceof Error ? error.message : t("inbox.errors.refreshFailed"),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const inbox = await runMatchPipeline(profile, locale);
  return NextResponse.json(inbox);
}
