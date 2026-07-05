import { NextResponse } from "next/server";
import { resolveEngineLocale } from "@aperio-j/core";
import { CAPTURE_SOURCE_ID, fetchCaptureUrl, isCaptureUrl } from "@aperio-j/discovery/capture-url";
import { parseOpportunity } from "@aperio-j/discovery/parse-opportunity";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { runMatchPipeline, upsertOpportunities } from "@/lib/match-service";
import { getRequestTranslator } from "@/lib/request-i18n";

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

  const body = (await request.json()) as { url?: string };
  const url = body.url?.trim();
  if (!url || !isCaptureUrl(url)) {
    return NextResponse.json({ error: t("api.invalidUrl") }, { status: 400 });
  }

  try {
    const item = await fetchCaptureUrl(url);
    item.sourceId = CAPTURE_SOURCE_ID;
    const opportunity = parseOpportunity(item, { locale: resolveEngineLocale(locale) });

    await upsertOpportunities([opportunity]);

    const inbox = await runMatchPipeline(profile, locale);
    const captured = inbox.items.find((row) => row.opportunity.url === url);

    return NextResponse.json({
      ...inbox,
      captured: captured ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t("api.captureFailed") },
      { status: 502 },
    );
  }
}
