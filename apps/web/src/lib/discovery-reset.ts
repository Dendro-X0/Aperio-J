import { prisma } from "@aperio-j/db";
import { clearDiscoveryMemory } from "./discovery-memory-service";
import { clearAutoDiscoveredStreams, isUserCustomStream, listStreamRegistry } from "./source-registry";

/**
 * Clear discovery artifacts after a location change so stale regional data
 * does not leak into the next match run.
 */
export async function resetDiscoveryForLocationChange(seekerProfileId: string): Promise<{
  removedStreams: number;
  removedOpportunities: number;
  removedMatchRuns: number;
}> {
  const streams = await listStreamRegistry(seekerProfileId);
  const autoStreamIds = streams
    .filter((row) => !isUserCustomStream(row.discoveredVia))
    .map((row) => row.id);

  await clearAutoDiscoveredStreams(seekerProfileId);
  await clearDiscoveryMemory(seekerProfileId);

  const removedOpportunities = autoStreamIds.length
    ? (
        await prisma.opportunityRecord.deleteMany({
          where: { sourceId: { in: autoStreamIds } },
        })
      ).count
    : 0;

  const removedMatchRuns = (
    await prisma.matchRun.deleteMany({
      where: { seekerProfileId },
    })
  ).count;

  return {
    removedStreams: autoStreamIds.length,
    removedOpportunities,
    removedMatchRuns,
  };
}
