import type { SeekerProfile } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import type { DiscoveryGap } from "@aperio-j/discovery/stream-learning";
import {
  analyzeDiscoveryGap,
  nextLearningWeight,
  type StreamLearningRow,
} from "@aperio-j/discovery/stream-learning";
import { runSourceDiscovery } from "@aperio-j/discovery/source-discovery";
import {
  getBlockedDomains,
  mergeDiscoveredStreams,
  removeDeadAutoStreams,
} from "./source-registry";
import { loadCityDiscoveryMemory, recordMemoryFromManifest } from "./discovery-memory-service";

export async function loadStreamLearningRows(seekerProfileId: string): Promise<StreamLearningRow[]> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId },
    select: {
      seedUrl: true,
      health: true,
      enabled: true,
      opportunityYield: true,
      matchYield: true,
      learningWeight: true,
      emptyFetchCount: true,
      userBlocked: true,
    },
  });

  return rows.map((row) => ({
    seedUrl: row.seedUrl,
    health: row.health as StreamLearningRow["health"],
    enabled: row.enabled,
    opportunityYield: row.opportunityYield,
    matchYield: row.matchYield,
    learningWeight: row.learningWeight,
    emptyFetchCount: row.emptyFetchCount,
    userBlocked: row.userBlocked,
  }));
}

export async function analyzeDiscoveryGapForProfile(
  profile: SeekerProfile,
): Promise<DiscoveryGap> {
  const rows = await loadStreamLearningRows(profile.id);
  return analyzeDiscoveryGap(rows, profile);
}

export async function applyMatchYieldLearning(
  seekerProfileId: string,
  matchedBySourceId: Map<string, number>,
): Promise<void> {
  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId },
    select: {
      id: true,
      opportunityYield: true,
      matchYield: true,
      learningWeight: true,
    },
  });

  for (const row of rows) {
    const matchYield = matchedBySourceId.get(row.id) ?? 0;
    await prisma.streamRegistryEntry.update({
      where: { id: row.id },
      data: {
        matchYield,
        learningWeight: nextLearningWeight(row.learningWeight, row.opportunityYield, matchYield),
      },
    });
  }
}

export async function runTargetedRediscovery(
  profile: SeekerProfile,
  gap: DiscoveryGap,
): Promise<string[]> {
  if (!gap.needsLocalSources && !gap.needsRoleFocusedSearch && gap.deadStreamCount === 0) {
    return [];
  }

  await removeDeadAutoStreams(profile.id);
  const blockedDomains = await getBlockedDomains(profile.id);
  const memory = await loadCityDiscoveryMemory(profile.id, profile.constraints.primaryCity);
  const manifest = await runSourceDiscovery(profile, {
    gap,
    blockedDomains,
    memory,
    maxProbes: 12,
    maxStreams: 8,
  });
  await mergeDiscoveredStreams(profile.id, manifest);
  await recordMemoryFromManifest(
    profile.id,
    profile.constraints.primaryCity,
    manifest,
    profile.constraints.remotePreference,
  );
  return manifest.errors;
}
