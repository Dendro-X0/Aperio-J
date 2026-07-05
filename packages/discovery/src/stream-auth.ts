export type StreamSessionAuthMode = "none" | "cookie" | "bearer";

export interface StreamSessionAuth {
  mode: StreamSessionAuthMode;
  /** Cookie header value or bearer token — never log. */
  secret?: string;
}

/** Hosts where session scraping risks account bans — blocked by default. */
export const BLOCKED_SESSION_AUTH_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "facebook.com",
  "instagram.com",
] as const;

export const SESSION_AUTH_BLOCKED = "SESSION_AUTH_BLOCKED_HOST";

export function isBlockedSessionAuthHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_SESSION_AUTH_HOSTS.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    );
  } catch {
    return false;
  }
}

export function assertSessionAuthAllowed(url: string): void {
  if (isBlockedSessionAuthHost(url)) {
    throw new Error(SESSION_AUTH_BLOCKED);
  }
}

export function parseStreamSessionAuth(
  mode: string | null | undefined,
  secret: string | null | undefined,
): StreamSessionAuth | undefined {
  if (!mode || mode === "none" || !secret?.trim()) return undefined;
  if (mode !== "cookie" && mode !== "bearer") return undefined;
  return { mode, secret: secret.trim() };
}

export function buildSessionAuthHeaders(
  auth?: StreamSessionAuth | null,
  base: Record<string, string> = {},
): Record<string, string> {
  const headers = { ...base };
  if (!auth || auth.mode === "none" || !auth.secret?.trim()) {
    return headers;
  }
  if (auth.mode === "cookie") {
    headers.Cookie = auth.secret.trim();
  } else if (auth.mode === "bearer") {
    headers.Authorization = `Bearer ${auth.secret.trim()}`;
  }
  return headers;
}
