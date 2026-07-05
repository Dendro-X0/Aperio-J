import { existsSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { prisma } from "@aperio-j/db";
import type { SeekerProfile } from "@aperio-j/core";
import {
  isLocalDataExportBundle,
  LOCAL_DATA_BUNDLE_VERSION,
  parseSeekerProfileFromBundle,
  type LocalDataExportBundle,
  type LocalDataStreamExport,
} from "@/lib/local-data-bundle";
import { parseSeekerProfile } from "@/lib/profile-store";

export interface LocalDatabaseInfo {
  databaseUrl: string;
  databasePath: string | null;
  databaseSizeBytes: number | null;
  counts: {
    profiles: number;
    streams: number;
    opportunities: number;
    matchRuns: number;
    feedback: number;
  };
}

function sqliteFilePath(databaseUrl: string): string | null {
  if (!databaseUrl.startsWith("file:")) return null;
  let raw = decodeURIComponent(databaseUrl.slice("file:".length));
  if (raw.startsWith("//") && !raw.startsWith("///")) {
    raw = raw.slice(2);
  }
  if (/^\/[A-Za-z]:/.test(raw)) {
    raw = raw.slice(1);
  }
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

export function resolveDatabaseDisplayPath(databaseUrl = process.env.DATABASE_URL ?? ""): {
  databaseUrl: string;
  databasePath: string | null;
  databaseSizeBytes: number | null;
} {
  const databasePath = sqliteFilePath(databaseUrl);
  if (!databasePath) {
    return { databaseUrl, databasePath: null, databaseSizeBytes: null };
  }

  let databaseSizeBytes: number | null = null;
  if (existsSync(databasePath)) {
    try {
      databaseSizeBytes = statSync(databasePath).size;
    } catch {
      databaseSizeBytes = null;
    }
  }

  return { databaseUrl, databasePath, databaseSizeBytes };
}

export async function getLocalDatabaseInfo(profileId: string | null): Promise<LocalDatabaseInfo> {
  const pathInfo = resolveDatabaseDisplayPath();
  const [profiles, streams, opportunities, matchRuns, feedback] = await Promise.all([
    prisma.seekerProfileRecord.count(),
    profileId
      ? prisma.streamRegistryEntry.count({ where: { seekerProfileId: profileId } })
      : Promise.resolve(0),
    prisma.opportunityRecord.count(),
    profileId
      ? prisma.matchRun.count({ where: { seekerProfileId: profileId } })
      : Promise.resolve(0),
    profileId
      ? prisma.opportunityFeedback.count({ where: { seekerProfileId: profileId } })
      : Promise.resolve(0),
  ]);

  return {
    ...pathInfo,
    counts: { profiles, streams, opportunities, matchRuns, feedback },
  };
}

function streamToExport(
  row: Awaited<ReturnType<typeof prisma.streamRegistryEntry.findMany>>[number],
): LocalDataStreamExport {
  return {
    label: row.label,
    kind: row.kind,
    seedUrl: row.seedUrl,
    discoveredVia: row.discoveredVia,
    regionHint: row.regionHint,
    confidence: row.confidence,
    sampleItemCount: row.sampleItemCount,
    enabled: row.enabled,
    health: row.health,
    pollLane: row.pollLane,
    opportunityYield: row.opportunityYield,
    matchYield: row.matchYield,
    learningWeight: row.learningWeight,
    lastValidatedAt: row.lastValidatedAt.toISOString(),
    authMode: row.authMode,
    authSecret: row.authSecret,
  };
}

export async function buildLocalDataExport(profileId: string): Promise<LocalDataExportBundle> {
  const record = await prisma.seekerProfileRecord.findUnique({ where: { id: profileId } });
  if (!record) {
    throw new Error("LOCAL_DATA_PROFILE_MISSING");
  }

  const streams = await prisma.streamRegistryEntry.findMany({
    where: { seekerProfileId: profileId },
    orderBy: { label: "asc" },
  });

  return {
    version: LOCAL_DATA_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    app: "aperio-j",
    profile: {
      displayName: record.displayName,
      profileJson: record.profileJson,
      onboardingComplete: record.onboardingComplete,
    },
    streams: streams.map(streamToExport),
  };
}

export async function importLocalDataBundle(
  bundleInput: unknown,
  existingProfileId: string | null,
): Promise<{ profileId: string; profile: SeekerProfile; streamCount: number }> {
  if (!isLocalDataExportBundle(bundleInput)) {
    throw new Error("LOCAL_DATA_INVALID_BUNDLE");
  }

  const bundle = bundleInput;
  const profilePayload = parseSeekerProfileFromBundle(bundle);
  const newProfileId = crypto.randomUUID();
  const profileWithId: SeekerProfile = { ...profilePayload, id: newProfileId };

  return prisma.$transaction(async (tx) => {
    if (existingProfileId) {
      await tx.seekerProfileRecord.delete({ where: { id: existingProfileId } });
    }

    await tx.seekerProfileRecord.create({
      data: {
        id: newProfileId,
        displayName: bundle.profile.displayName,
        profileJson: JSON.stringify(profileWithId),
        onboardingComplete: bundle.profile.onboardingComplete,
      },
    });

    if (bundle.streams.length > 0) {
      await tx.streamRegistryEntry.createMany({
        data: bundle.streams.map((stream) => ({
          seekerProfileId: newProfileId,
          label: stream.label,
          kind: stream.kind,
          seedUrl: stream.seedUrl,
          discoveredVia: stream.discoveredVia,
          regionHint: stream.regionHint,
          confidence: stream.confidence,
          sampleItemCount: stream.sampleItemCount,
          enabled: stream.enabled,
          health: stream.health,
          pollLane: stream.pollLane,
          opportunityYield: stream.opportunityYield,
          matchYield: stream.matchYield,
          learningWeight: stream.learningWeight,
          lastValidatedAt: new Date(stream.lastValidatedAt),
          authMode: stream.authMode,
          authSecret: stream.authSecret,
        })),
      });
    }

    const record = await tx.seekerProfileRecord.findUniqueOrThrow({ where: { id: newProfileId } });
    return {
      profileId: newProfileId,
      profile: parseSeekerProfile(record),
      streamCount: bundle.streams.length,
    };
  });
}

export async function resetAllLocalData(profileId: string | null): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.opportunityRecord.deleteMany({});
    if (profileId) {
      await tx.seekerProfileRecord.delete({ where: { id: profileId } });
    } else {
      await tx.seekerProfileRecord.deleteMany({});
    }
  });
}
