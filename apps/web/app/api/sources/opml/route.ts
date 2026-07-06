import { NextResponse } from "next/server";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { importOpmlStreams } from "@/lib/source-registry";
import { getRequestTranslator } from "@/lib/request-i18n";

export async function POST(request: Request) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const profile = await loadSeekerProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  const body = (await request.json()) as { opml?: string };
  if (!body.opml?.trim()) {
    return NextResponse.json({ error: t("api.opmlRequired") }, { status: 400 });
  }

  const result = await importOpmlStreams(profile, body.opml);
  return NextResponse.json(result);
}
