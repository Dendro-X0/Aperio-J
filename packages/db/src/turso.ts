export function isTursoDatabaseUrl(url: string): boolean {
  return (
    url.startsWith("libsql://") ||
    /^https:\/\/[^/]+\.turso\.io(?:[/?#]|$)/i.test(url)
  );
}

export function resolveTursoAuthToken(): string | undefined {
  return (
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    undefined
  );
}

/** Strip auth query params before passing the URL to the libSQL adapter. */
export function normalizeTursoDatabaseUrl(rawUrl: string): string {
  const url = new URL(
    rawUrl.startsWith("libsql://") ? rawUrl.replace(/^libsql:/, "https:") : rawUrl,
  );
  url.searchParams.delete("authToken");
  url.searchParams.delete("token");
  url.hash = "";

  if (rawUrl.startsWith("libsql://")) {
    return `libsql://${url.host}${url.pathname}`;
  }

  return `${url.protocol}//${url.host}${url.pathname}`;
}

export function resolveTursoConfig(rawUrl: string): { url: string; authToken: string } {
  const parsed = new URL(
    rawUrl.startsWith("libsql://") ? rawUrl.replace(/^libsql:/, "https:") : rawUrl,
  );
  const authToken =
    resolveTursoAuthToken() ??
    parsed.searchParams.get("authToken")?.trim() ??
    parsed.searchParams.get("token")?.trim();

  if (!authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required when DATABASE_URL points at Turso (libsql:// or https://*.turso.io)",
    );
  }

  return {
    url: normalizeTursoDatabaseUrl(rawUrl),
    authToken,
  };
}
