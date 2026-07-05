import type { SeekerProfile, SourceDiscoveryManifest } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";
import type { StreamFetchResult } from "@aperio-j/discovery/fetch-streams";
import {
  emptyCityDiscoveryMemory,
  normalizeCityKey,
  parseCityDiscoveryMemory,
  recordMemoryFromCandidates,
  recordMemoryFromProbes,
  recordMemorySeed,
  serializeCityDiscoveryMemory,
  shouldRecordMemorySeed,
  type CityDiscoveryMemory,
} from "@aperio-j/discovery/discovery-memory";

export async function loadCityDiscoveryMemory(
  seekerProfileId: string,
  city: string,
): Promise<CityDiscoveryMemory | null> {
  const cityNorm = normalizeCityKey(city);
  if (!cityNorm) return null;

  const row = await prisma.discoveryMemory.findUnique({
    where: {
      seekerProfileId_cityNorm: {
        seekerProfileId,
        cityNorm,
      },
    },
  });

  if (!row) return null;
  return parseCityDiscoveryMemory(row.memoryJson, city);
}

async function saveCityDiscoveryMemory(
  seekerProfileId: string,
  memory: CityDiscoveryMemory,
): Promise<void> {
  if (!memory.cityNorm) return;

  await prisma.discoveryMemory.upsert({
    where: {
      seekerProfileId_cityNorm: {
        seekerProfileId,
        cityNorm: memory.cityNorm,
      },
    },
    create: {
      seekerProfileId,
      cityNorm: memory.cityNorm,
      memoryJson: serializeCityDiscoveryMemory(memory),
    },
    update: {
      memoryJson: serializeCityDiscoveryMemory(memory),
    },
  });
}

export async function recordMemorySeedSuccess(
  seekerProfileId: string,
  city: string,
  seedUrl: string,
  scoreDelta: number,
): Promise<void> {
  const cityNorm = normalizeCityKey(city);
  if (!cityNorm || !seedUrl.trim()) return;

  const existing =
    (await loadCityDiscoveryMemory(seekerProfileId, city)) ?? emptyCityDiscoveryMemory(city);
  await saveCityDiscoveryMemory(
    seekerProfileId,
    recordMemorySeed(existing, seedUrl, scoreDelta),
  );
}

export async function recordMemoryFromManifest(
  seekerProfileId: string,
  city: string,
  manifest: SourceDiscoveryManifest,
  remotePreference?: SeekerProfile["constraints"]["remotePreference"],
): Promise<void> {
  const cityNorm = normalizeCityKey(city);
  if (!cityNorm) return;

  let memory =
    (await loadCityDiscoveryMemory(seekerProfileId, city)) ?? emptyCityDiscoveryMemory(city);

  memory = recordMemoryFromProbes(memory, manifest.probes);
  const seedUrls = [...manifest.enabled, ...manifest.deferred].map((row) => row.seedUrl);
  memory = recordMemoryFromCandidates(memory, seedUrls, 0.15, remotePreference);

  await saveCityDiscoveryMemory(seekerProfileId, memory);
}

export async function recordFetchMemoryFromResults(
  profile: SeekerProfile,
  results: StreamFetchResult[],
): Promise<void> {
  const city = profile.constraints.primaryCity.trim();
  if (!city) return;

  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId: profile.id },
    select: { id: true, seedUrl: true },
  });
  const urlById = new Map(rows.map((row) => [row.id, row.seedUrl]));

  for (const result of results) {
    if (result.items.length === 0) continue;
    const seedUrl = urlById.get(result.streamId);
    if (!seedUrl) continue;
    if (!shouldRecordMemorySeed(seedUrl, profile.constraints.remotePreference)) continue;
    const scoreDelta = Math.min(1.5, 0.2 + result.items.length * 0.05);
    await recordMemorySeedSuccess(profile.id, city, seedUrl, scoreDelta);
  }
}

export async function recordMatchMemoryFromResults(
  profile: SeekerProfile,
  matchedBySourceId: Map<string, number>,
): Promise<void> {
  const city = profile.constraints.primaryCity.trim();
  if (!city) return;

  const rows = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId: profile.id },
    select: { id: true, seedUrl: true },
  });

  for (const row of rows) {
    const matchCount = matchedBySourceId.get(row.id) ?? 0;
    if (matchCount <= 0) continue;
    if (!shouldRecordMemorySeed(row.seedUrl, profile.constraints.remotePreference)) continue;
    await recordMemorySeedSuccess(profile.id, city, row.seedUrl, 0.25 + matchCount * 0.1);
  }
}

export async function clearDiscoveryMemory(seekerProfileId: string): Promise<void> {
  await prisma.discoveryMemory.deleteMany({ where: { seekerProfileId } });
}
