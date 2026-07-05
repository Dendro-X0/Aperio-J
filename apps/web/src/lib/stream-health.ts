import type { StreamHealth } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import type { StreamFetchResult } from "@aperio-j/discovery/fetch-streams";
import {
  nextEmptyFetchCount,
  shouldMarkStreamDead,
} from "@aperio-j/discovery/stream-learning";

function nextHealth(current: StreamHealth, itemCount: number, failed: boolean): StreamHealth {
  if (failed) {
    if (current === "stale" || current === "dead") return "dead";
    return "stale";
  }
  if (itemCount > 0) return "healthy";
  if (current === "healthy") return "stale";
  if (current === "stale" || current === "unknown") return "dead";
  return "dead";
}

export async function applyStreamFetchResults(results: StreamFetchResult[]): Promise<void> {
  for (const result of results) {
    const entry = await prisma.streamRegistryEntry.findUnique({
      where: { id: result.streamId },
    });
    if (!entry) continue;

    const failed = Boolean(result.error);
    const promoted = result.items.length > 0 && entry.validationTier === "candidate";
    const isDeferredCandidate = entry.validationTier === "candidate" && !entry.enabled;
    const emptyFetchCount = nextEmptyFetchCount(entry.emptyFetchCount, result.items.length, failed);
    const markDead = shouldMarkStreamDead(emptyFetchCount);

    let health: StreamHealth;
    if (promoted) {
      health = "healthy";
    } else if (markDead) {
      health = "dead";
    } else if (isDeferredCandidate && (failed || result.items.length === 0)) {
      health = entry.health === "dead" ? "dead" : "unknown";
    } else {
      health = nextHealth(entry.health as StreamHealth, result.items.length, failed);
    }

    await prisma.streamRegistryEntry.update({
      where: { id: result.streamId },
      data: {
        health,
        opportunityYield: result.items.length,
        sampleItemCount: result.items.length > 0 ? result.items.length : entry.sampleItemCount,
        validationTier: promoted ? "proven" : entry.validationTier,
        enabled: promoted ? true : markDead ? false : entry.enabled,
        emptyFetchCount,
        updatedAt: new Date(),
      },
    });
  }
}

export async function countHealthyStreams(seekerProfileId: string): Promise<number> {
  return prisma.streamRegistryEntry.count({
    where: {
      seekerProfileId,
      enabled: true,
      health: { in: ["healthy", "unknown"] },
    },
  });
}

export async function markAllStreamsForRediscovery(seekerProfileId: string): Promise<void> {
  await prisma.streamRegistryEntry.updateMany({
    where: { seekerProfileId, health: "dead" },
    data: { enabled: false },
  });
}