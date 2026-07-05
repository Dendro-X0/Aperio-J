import { NextResponse } from "next/server";
import { getProfileIdFromCookies } from "@/lib/profile-store";
import {
  loadConnectorCredentialSettings,
  publicConnectorCredentialSettings,
  saveConnectorCredentialSettings,
} from "@/lib/local-settings-store";
import { getRequestTranslator } from "@/lib/request-i18n";

export async function GET() {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const settings = await loadConnectorCredentialSettings(profileId);
  return NextResponse.json(publicConnectorCredentialSettings(settings));
}

export async function PATCH(request: Request) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const body = (await request.json()) as {
    adzuna?: { appId?: string; appKey?: string | null };
    reed?: { apiKey?: string | null };
    usajobs?: { apiKey?: string | null; email?: string };
    franceTravail?: { clientId?: string; clientSecret?: string | null };
    worknet?: { authKey?: string | null };
  };

  if (
    !body.adzuna &&
    !body.reed &&
    !body.usajobs &&
    !body.franceTravail &&
    !body.worknet
  ) {
    return NextResponse.json({ error: t("api.invalidRequest") }, { status: 400 });
  }

  const settings = await saveConnectorCredentialSettings(profileId, body);
  return NextResponse.json(publicConnectorCredentialSettings(settings));
}
