import { NextResponse } from "next/server";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { enableStreamsByIds } from "@/lib/source-registry";
import { listSourcesForProfile } from "@/lib/sources-page-data";
import { getRequestTranslator, translateApiError } from "@/lib/request-i18n";

export async function POST(request: Request) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.onboardingRequired") }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: t("api.invalidStreamPatch") }, { status: 400 });
  }

  try {
    const profile = await loadSeekerProfile(profileId);
    if (!profile) {
      return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
    }

    const count = await enableStreamsByIds(profileId, ids);
    const streams = await listSourcesForProfile(profile);
    return NextResponse.json({ count, streams });
  } catch (error) {
    const message = translateApiError(t, error, "api.updateFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
