import { cookies } from "next/headers";
import type { SeekerProfile } from "@aperio-j/core";
import { getServerLocale } from "@/i18n/server";
import {
  PROFILE_COOKIE,
  getProfileIdFromCookies,
  loadProfileRecord,
  parseSeekerProfile,
} from "@/lib/profile-store";
import { isDiscoveryReadyProfile } from "@/lib/profile-readiness";
import { loadInboxItem, loadLatestInbox } from "@/lib/match-service";
import { loadConnectorCredentialSettings } from "@/lib/local-settings-store";
import { listSourcesForProfile } from "@/lib/sources-page-data";
import { getLatestSourceDiscoverySummary } from "@/lib/source-registry";
import { isChinaCityProfile, isCnRemoteFirstProfile } from "@aperio-j/probe";

export async function loadSettingsPageData() {
  const cookieProfileId = await getProfileIdFromCookies();
  const record = cookieProfileId ? await loadProfileRecord(cookieProfileId) : null;

  if (cookieProfileId && !record) {
    const jar = await cookies();
    jar.delete(PROFILE_COOKIE);
  }

  const profileId = record?.id;
  const profile = record ? parseSeekerProfile(record) : null;
  const connectorSettings =
    profileId != null ? await loadConnectorCredentialSettings(profileId) : null;

  return {
    profileId,
    profile,
    isFirstSetup: !record?.onboardingComplete,
    connectorSettings,
  };
}

export async function loadInboxPageData() {
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return { kind: "redirect" as const, href: "/settings?setup=required" };
  }

  const [record, locale] = await Promise.all([
    loadProfileRecord(profileId),
    getServerLocale(),
  ]);

  if (!record?.onboardingComplete) {
    return { kind: "redirect" as const, href: "/settings?setup=required" };
  }

  const profile = parseSeekerProfile(record);
  const discoveryReady = isDiscoveryReadyProfile(profile);
  const inbox = discoveryReady ? await loadLatestInbox(profile, locale) : null;

  return { kind: "ready" as const, profile, discoveryReady, inbox };
}

export function isCnCaptureFirstProfile(profile: SeekerProfile): boolean {
  return (
    isChinaCityProfile(
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
    ) &&
    !isCnRemoteFirstProfile(
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
      profile.constraints.remotePreference,
    )
  );
}

export function isCnRemoteFirstProfileForPage(profile: SeekerProfile): boolean {
  return isCnRemoteFirstProfile(
    profile.constraints.primaryCity,
    profile.constraints.acceptableCities,
    profile.constraints.remotePreference,
  );
}

export async function loadSourcesPageData() {
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return { kind: "redirect" as const, href: "/settings" };
  }

  const [record, lastRun] = await Promise.all([
    loadProfileRecord(profileId),
    getLatestSourceDiscoverySummary(profileId),
  ]);

  if (!record?.onboardingComplete) {
    return { kind: "redirect" as const, href: "/settings" };
  }

  const profile = parseSeekerProfile(record);
  const streams = await listSourcesForProfile(profile);

  return {
    kind: "ready" as const,
    profile,
    streams,
    lastRun,
  };
}

export async function loadInboxOpportunityPageData(opportunityId: string) {
  const profileId = await getProfileIdFromCookies();
  if (!profileId) {
    return { kind: "redirect" as const, href: "/settings?setup=required" };
  }

  const [record, locale] = await Promise.all([
    loadProfileRecord(profileId),
    getServerLocale(),
  ]);

  if (!record?.onboardingComplete) {
    return { kind: "redirect" as const, href: "/settings?setup=required" };
  }

  const profile = parseSeekerProfile(record);
  const result = await loadInboxItem(profile, decodeURIComponent(opportunityId), locale);

  if (!result) {
    return { kind: "notFound" as const };
  }

  return { kind: "ready" as const, profile, result };
}

export function inboxProfileSummary(profile: SeekerProfile) {
  const cities = [
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
  ].filter(Boolean);

  const industries = profile.intent.desiredIndustries
    .map((value) => value.trim())
    .filter(Boolean);

  if (industries.length === 0) {
    const fromArtifacts = profile.artifacts
      .map((artifact) => artifact.industry.trim())
      .filter(Boolean);
    industries.push(...fromArtifacts);
  }

  return {
    city: cities.join(" · ") || "—",
    roles: profile.intent.desiredRoles,
    industries: [...new Set(industries)],
  };
}
