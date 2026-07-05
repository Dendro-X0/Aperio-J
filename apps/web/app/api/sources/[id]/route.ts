import { NextResponse } from "next/server";
import { getProfileIdFromCookies, loadSeekerProfile } from "@/lib/profile-store";
import { removeCustomStream, serializeStreamRow, updateStreamSettings } from "@/lib/source-registry";
import { getRequestTranslator, translateApiError } from "@/lib/request-i18n";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.onboardingRequired") }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    enabled?: boolean;
    authMode?: "none" | "cookie" | "bearer";
    authSecret?: string | null;
    revalidate?: boolean;
  };

  if (
    typeof body.enabled !== "boolean" &&
    body.authMode === undefined &&
    body.authSecret === undefined &&
    body.revalidate !== true
  ) {
    return NextResponse.json({ error: t("api.invalidStreamPatch") }, { status: 400 });
  }

  const profile =
    body.authMode !== undefined || body.authSecret !== undefined || body.revalidate
      ? await loadSeekerProfile(profileId)
      : null;

  if ((body.authMode !== undefined || body.authSecret !== undefined || body.revalidate) && !profile) {
    return NextResponse.json({ error: t("api.profileMissing") }, { status: 404 });
  }

  try {
    const updated = await updateStreamSettings(
      profileId,
      id,
      {
        enabled: body.enabled,
        authMode: body.authMode,
        authSecret: body.authSecret,
      },
      { profile: profile ?? undefined, revalidate: body.revalidate },
    );
    if (!updated) {
      return NextResponse.json({ error: t("api.streamNotFound") }, { status: 404 });
    }

    if (updated.health === "stale" && (body.authMode !== undefined || body.authSecret !== undefined)) {
      return NextResponse.json(
        { error: t("api.sourceValidationFailed"), stream: serializeStreamRow(updated) },
        { status: 400 },
      );
    }

    return NextResponse.json({ stream: serializeStreamRow(updated) });
  } catch (error) {
    const message = translateApiError(t, error, "api.updateFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ error: t("api.authRequired") }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const removed = await removeCustomStream(profileId, id);
    if (!removed) {
      return NextResponse.json({ error: t("api.streamNotFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = translateApiError(t, error, "api.deleteFailed");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
