const hostLastFetchAt = new Map<string, number>();
const hostBlockedUntil = new Map<string, number>();

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostIntervalMs(): number {
  const fromEnv = Number(process.env.APERO_J_FETCH_HOST_INTERVAL_MS);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return process.env.NODE_ENV === "development" ? 4_000 : 1_500;
}

function hostCooldownMs(): number {
  const fromEnv = Number(process.env.APERO_J_FETCH_HOST_COOLDOWN_MS);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return process.env.NODE_ENV === "development" ? 10 * 60_000 : 5 * 60_000;
}

export function isHostFetchBlocked(url: string, now = Date.now()): boolean {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  const until = hostBlockedUntil.get(host);
  return typeof until === "number" && until > now;
}

export function hostBlockedRemainingMs(url: string, now = Date.now()): number {
  const host = hostnameFromUrl(url);
  if (!host) return 0;
  const until = hostBlockedUntil.get(host) ?? 0;
  return Math.max(0, until - now);
}

export function recordHostFetchBlocked(url: string, now = Date.now()): void {
  const host = hostnameFromUrl(url);
  if (!host) return;
  hostBlockedUntil.set(host, now + hostCooldownMs());
}

export function recordHostFetchSuccess(url: string, now = Date.now()): void {
  const host = hostnameFromUrl(url);
  if (!host) return;
  hostLastFetchAt.set(host, now);
}

export async function waitForHostFetchSlot(url: string, now = Date.now()): Promise<void> {
  const host = hostnameFromUrl(url);
  if (!host) return;

  if (isHostFetchBlocked(url, now)) return;

  const last = hostLastFetchAt.get(host);
  const interval = hostIntervalMs();
  if (typeof last !== "number" || interval <= 0) return;

  const waitMs = last + interval - now;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

export function resetFetchHostGuardForTests(): void {
  hostLastFetchAt.clear();
  hostBlockedUntil.clear();
}
