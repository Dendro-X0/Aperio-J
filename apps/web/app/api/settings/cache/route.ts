import { NextResponse } from "next/server";
import { getProfileIdFromCookies } from "@/lib/profile-store";
import { clearStreamFeedCache } from "@/lib/stream-feed-cache";
import { getRequestTranslator } from "@/lib/request-i18n";

export async function POST() {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  await clearStreamFeedCache(profileId);
  return NextResponse.json({ ok: true });
}
