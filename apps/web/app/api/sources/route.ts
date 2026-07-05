import { NextResponse } from "next/server";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { addCustomStream, serializeStreamRow } from "@/lib/source-registry";
import { listSourcesForProfile } from "@/lib/sources-page-data";
import { getRequestTranslator, translateApiError } from "@/lib/request-i18n";

export async function GET() {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const profile = await loadSeekerProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  const streams = await listSourcesForProfile(profile);
  return NextResponse.json({ streams });
}

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

  const body = (await request.json()) as {
    url?: string;
    label?: string;
    kind?: "rss" | "list_page";
    authMode?: "none" | "cookie" | "bearer";
    authSecret?: string;
  };

  if (!body.url?.trim()) {
    return NextResponse.json({ error: t("api.urlRequired") }, { status: 400 });
  }

  try {
    const stream = await addCustomStream(profile, {
      url: body.url,
      label: body.label,
      kind: body.kind,
      authMode: body.authMode,
      authSecret: body.authSecret,
    });

    return NextResponse.json({ stream: serializeStreamRow(stream) });
  } catch (error) {
    const message = translateApiError(t, error, "api.addFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
