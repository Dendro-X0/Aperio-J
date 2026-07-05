import { NextResponse } from "next/server";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { revalidateCustomStream, serializeStreamRow } from "@/lib/source-registry";
import { getRequestTranslator, translateApiError } from "@/lib/request-i18n";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const profile = await loadSeekerProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  const { id } = await context.params;

  try {
    const updated = await revalidateCustomStream(profile, id);
    if (!updated) {
      return NextResponse.json({ error: t("api.streamNotFound") }, { status: 404 });
    }

    return NextResponse.json({ stream: serializeStreamRow(updated) });
  } catch (error) {
    const message = translateApiError(t, error, "api.updateFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
