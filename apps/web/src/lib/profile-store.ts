import { cookies } from "next/headers";
import { prisma } from "@aperio-j/db";
import type { SeekerProfile } from "@aperio-j/core";

export const PROFILE_COOKIE = "aperio_j_profile_id";

export async function getProfileIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(PROFILE_COOKIE)?.value ?? null;
}

export async function loadProfileRecord(profileId: string) {
  return prisma.seekerProfileRecord.findUnique({ where: { id: profileId } });
}

export function parseSeekerProfile(record: { profileJson: string; id: string }): SeekerProfile {
  const parsed = JSON.parse(record.profileJson) as SeekerProfile;
  return { ...parsed, id: record.id };
}

export async function loadSeekerProfile(profileId: string): Promise<SeekerProfile | null> {
  const record = await loadProfileRecord(profileId);
  if (!record) return null;
  return parseSeekerProfile(record);
}

export async function saveSeekerProfile(input: {
  profileId?: string;
  displayName?: string;
  profile: SeekerProfile;
  onboardingComplete: boolean;
}) {
  const profileJson = JSON.stringify(input.profile);

  if (input.profileId) {
    return prisma.seekerProfileRecord.update({
      where: { id: input.profileId },
      data: {
        displayName: input.displayName,
        profileJson,
        onboardingComplete: input.onboardingComplete,
      },
    });
  }

  return prisma.seekerProfileRecord.create({
    data: {
      displayName: input.displayName,
      profileJson,
      onboardingComplete: input.onboardingComplete,
    },
  });
}

export async function deleteSeekerProfile(profileId: string): Promise<void> {
  await prisma.seekerProfileRecord.delete({ where: { id: profileId } });
}
