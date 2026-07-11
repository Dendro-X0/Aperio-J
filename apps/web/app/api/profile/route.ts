import { NextResponse } from "next/server";
import { ensureDbReady } from "@aperio-j/db";
import { cookies } from "next/headers";
import {
  PROFILE_COOKIE,
  deleteSeekerProfile,
  getProfileIdFromCookies,
  loadProfileRecord,
  loadSeekerProfile,
  parseSeekerProfile,
  saveSeekerProfile,
} from "@/lib/profile-store";
import {
  EMPTY_PROFILE_FORM,
  buildSeekerProfileFromSettings,
  settingsFormFromProfile,
  type ProfileSettingsForm,
} from "@/lib/profile-form";
import { isDiscoveryReadyForm, isDiscoveryReadyProfile } from "@/lib/profile-readiness";
import { resetDiscoveryForLocationChange } from "@/lib/discovery-reset";
import { profileLocationChanged } from "@/lib/profile-location";
import { getRequestTranslator } from "@/lib/request-i18n";

export async function GET() {
  await ensureDbReady();
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return NextResponse.json({ profile: null });
  }

  const record = await loadProfileRecord(profileId);
  if (!record) {
    return NextResponse.json({ profile: null });
  }

  const profile = parseSeekerProfile(record);
  return NextResponse.json({
    profileId,
    profile,
    form: settingsFormFromProfile(profile),
    onboardingComplete: record.onboardingComplete,
    discoveryReady: isDiscoveryReadyProfile(profile),
  });
}

export async function POST(request: Request) {
  const { t } = await getRequestTranslator();

  try {
    await ensureDbReady();
    const body = (await request.json()) as {
      form?: ProfileSettingsForm;
      profileId?: string;
      complete?: boolean;
      runPipeline?: boolean;
      skip?: boolean;
    };

    let existingId = body.profileId ?? (await getProfileIdFromCookies()) ?? undefined;
    if (existingId && !(await loadProfileRecord(existingId))) {
      existingId = undefined;
    }
    const profileId = existingId ?? crypto.randomUUID();

    if (body.skip) {
      const profile = buildSeekerProfileFromSettings(EMPTY_PROFILE_FORM, profileId);
      const record = await saveSeekerProfile({
        profileId: existingId,
        profile,
        onboardingComplete: true,
      });

      const jar = await cookies();
      jar.set(PROFILE_COOKIE, record.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });

      return NextResponse.json({
        profileId: record.id,
        profile: parseSeekerProfile(record),
        onboardingComplete: true,
        discoveryReady: false,
        skipped: true,
      });
    }

    const form = body.form ?? EMPTY_PROFILE_FORM;

    if (body.complete && body.runPipeline === true && !isDiscoveryReadyForm(form)) {
      return NextResponse.json({ error: t("api.discoveryNotReady") }, { status: 400 });
    }

    const previousProfile = existingId ? await loadSeekerProfile(existingId) : null;
    const profile = buildSeekerProfileFromSettings(form, profileId);
    const locationChanged =
      Boolean(existingId) &&
      previousProfile !== null &&
      profileLocationChanged(previousProfile, profile);

    if (locationChanged && existingId) {
      await resetDiscoveryForLocationChange(existingId);
    }

    const record = await saveSeekerProfile({
      profileId: existingId,
      profile,
      onboardingComplete: Boolean(body.complete),
    });

    const jar = await cookies();
    jar.set(PROFILE_COOKIE, record.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    const savedProfile = parseSeekerProfile(record);
    const discoveryReady = isDiscoveryReadyProfile(savedProfile);

    return NextResponse.json({
      profileId: record.id,
      profile: savedProfile,
      onboardingComplete: record.onboardingComplete,
      discoveryReady,
      locationChanged,
    });
  } catch (error) {
    console.error("POST /api/profile failed", error);
    return NextResponse.json({ error: t("api.profileSaveFailed") }, { status: 500 });
  }
}

export async function DELETE() {
  const { t } = await getRequestTranslator();
  const profileId = await getProfileIdFromCookies();

  if (!profileId) {
    return NextResponse.json({ ok: true });
  }

  const record = await loadProfileRecord(profileId);
  if (!record) {
    const jar = await cookies();
    jar.delete(PROFILE_COOKIE);
    return NextResponse.json({ ok: true });
  }

  try {
    await deleteSeekerProfile(profileId);
  } catch {
    return NextResponse.json({ error: t("api.resetFailed") }, { status: 500 });
  }

  const jar = await cookies();
  jar.delete(PROFILE_COOKIE);

  return NextResponse.json({ ok: true });
}
