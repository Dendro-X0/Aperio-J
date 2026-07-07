import { redirect } from "next/navigation";
import { loadSourcesPageData } from "@/lib/page-data";
import { profileCities, profileDistricts } from "@/lib/profile-location-display";
import { SourcesRegistryView } from "@/components/sources/sources-registry-view";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const data = await loadSourcesPageData();
  if (data.kind === "redirect") {
    redirect(data.href);
  }

  const { profile, streams, lastRun } = data;

  return (
    <SourcesRegistryView
      initialStreams={streams}
      lastDiscoveryAt={lastRun?.ranAt.toISOString() ?? null}
      lastDiscoveryStats={
        lastRun
          ? { found: lastRun.candidatesFound, enabled: lastRun.candidatesEnabled }
          : null
      }
      profileSummary={{
        city: profileCities(profile).join(" · "),
        cities: profileCities(profile),
        districts: profileDistricts(profile),
        roles: profile.intent.desiredRoles,
        remotePreference: profile.constraints.remotePreference,
      }}
    />
  );
}
