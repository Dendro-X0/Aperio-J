import { NextResponse } from "next/server";
import { getProfileIdFromCookies } from "@/lib/profile-store";
import {
  loadCnSessionCredentialSettings,
  publicCnSessionCredentialSettings,
  saveCnSessionCredentialSettings,
} from "@/lib/local-settings-store";
import { getRequestTranslator } from "@/lib/request-i18n";

export async function GET() {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const settings = await loadCnSessionCredentialSettings(profileId);
  return NextResponse.json(publicCnSessionCredentialSettings(settings));
}

export async function PATCH(request: Request) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const body = (await request.json()) as {
    zhipinCookie?: string | null;
    zhaopinCookie?: string | null;
    cookie58?: string | null;
  };

  const settings = await saveCnSessionCredentialSettings(profileId, body);
  return NextResponse.json(publicCnSessionCredentialSettings(settings));
}
