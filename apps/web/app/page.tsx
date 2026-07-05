import { redirect } from "next/navigation";
import { getProfileIdFromCookies, loadProfileRecord } from "@/lib/profile-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profileId = await getProfileIdFromCookies();
  const record = profileId ? await loadProfileRecord(profileId) : null;

  if (record?.onboardingComplete) {
    redirect("/inbox");
  }

  redirect("/settings");
}
