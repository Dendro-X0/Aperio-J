import { Suspense } from "react";
import { settingsFormFromProfile } from "@/lib/profile-form";
import { loadSettingsPageData } from "@/lib/page-data";
import { ProfileDashboard } from "@/components/profile/profile-dashboard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profileId, profile, isFirstSetup, connectorSettings, cnSessionSettings } =
    await loadSettingsPageData();
  const initialForm = profile ? settingsFormFromProfile(profile) : undefined;

  return (
    <Suspense fallback={null}>
      <ProfileDashboard
        initialForm={initialForm}
        profileId={profileId}
        isFirstSetup={isFirstSetup}
        initialConnectorSettings={connectorSettings}
        initialCnSessionSettings={cnSessionSettings}
      />
    </Suspense>
  );
}
