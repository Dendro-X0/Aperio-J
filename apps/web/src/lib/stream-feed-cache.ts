import type { RawFeedItem } from "@aperio-j/core";
import { prisma } from "@aperio-j/db";

const CACHE_KEY_PREFIX = "stream-feed:";

interface CachedStreamFeed {
  fetchedAt: string;
  items: RawFeedItem[];
}

function cacheKey(streamId: string): string {
  return `${CACHE_KEY_PREFIX}${streamId}`;
}

export function streamFeedCacheTtlMs(): number {
  const fromEnv = Number(process.env.APERO_J_STREAM_FETCH_CACHE_TTL_MS);
  if (Number.isFinite(fromEnv)) return Math.max(0, fromEnv);
  return process.env.NODE_ENV === "development" ? 60 * 60_000 : 15 * 60_000;
}

export function isStreamFeedCacheEnabled(): boolean {
  return streamFeedCacheTtlMs() > 0;
}

export async function loadCachedStreamFeed(
  profileId: string,
  streamId: string,
): Promise<CachedStreamFeed | null> {
  if (!isStreamFeedCacheEnabled()) return null;

  const row = await prisma.profileLocalSetting.findUnique({
    where: {
      seekerProfileId_key: {
        seekerProfileId: profileId,
        key: cacheKey(streamId),
      },
    },
  });
  if (!row?.value) return null;

  try {
    const parsed = JSON.parse(row.value) as CachedStreamFeed;
    if (!Array.isArray(parsed.items) || !parsed.fetchedAt) return null;

    const ageMs = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > streamFeedCacheTtlMs()) return null;
    if (parsed.items.length === 0) return null;

    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedStreamFeed(
  profileId: string,
  streamId: string,
  items: RawFeedItem[],
): Promise<void> {
  if (!isStreamFeedCacheEnabled() || items.length === 0) return;

  const payload: CachedStreamFeed = {
    fetchedAt: new Date().toISOString(),
    items: items.slice(0, 40),
  };

  await prisma.profileLocalSetting.upsert({
    where: {
      seekerProfileId_key: {
        seekerProfileId: profileId,
        key: cacheKey(streamId),
      },
    },
    create: {
      seekerProfileId: profileId,
      key: cacheKey(streamId),
      value: JSON.stringify(payload),
    },
    update: {
      value: JSON.stringify(payload),
    },
  });
}

export async function clearStreamFeedCache(profileId: string): Promise<void> {
  await prisma.profileLocalSetting.deleteMany({
    where: {
      seekerProfileId: profileId,
      key: { startsWith: CACHE_KEY_PREFIX },
    },
  });
}
