import { AppShell } from "@/components/shell/app-shell";
import { profileCities } from "@/lib/profile-location-display";
import {
  getProfileIdFromCookies,
  loadProfileRecord,
  parseSeekerProfile,
} from "@/lib/profile-store";
import { listStreamRegistry } from "@/lib/source-registry";

export default async function MainAppLayout({ children }: { children: React.ReactNode }) {
  const profileId = await getProfileIdFromCookies();

  if (!profileId) {
    return <AppShell>{children}</AppShell>;
  }

  const [record, streams] = await Promise.all([
    loadProfileRecord(profileId),
    listStreamRegistry(profileId),
  ]);

  const profile = record ? parseSeekerProfile(record) : null;
  const profileSummary = profile
    ? {
        city: profileCities(profile).join(" · "),
        industries: profile.intent.desiredIndustries.filter(Boolean),
        roles: profile.intent.desiredRoles,
      }
    : undefined;

  const streamCount = streams.filter((row) => row.enabled).length;

  return (
    <AppShell
      profileSummary={profileSummary}
      stats={{ streamCount }}
    >
      {children}
    </AppShell>
  );
}
