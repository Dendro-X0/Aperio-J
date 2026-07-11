import { isAbsolute, resolve } from "node:path";

const DEFAULT_DATABASE_URL = "file:../../data/aperio-j.db";

/** Resolve relative SQLite file URLs against process.cwd() for driver adapters. */
export function resolveDatabaseUrl(raw = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL): string {
  if (raw.startsWith("libsql://")) {
    return raw;
  }

  if (!raw.startsWith("file:")) {
    return raw;
  }

  let filePath = decodeURIComponent(raw.slice("file:".length));
  if (filePath.startsWith("//") && !filePath.startsWith("///")) {
    filePath = filePath.slice(2);
  }
  if (/^\/[A-Za-z]:/.test(filePath)) {
    filePath = filePath.slice(1);
  }

  if (!isAbsolute(filePath)) {
    filePath = resolve(process.cwd(), filePath);
  }

  return `file:${filePath.replace(/\\/g, "/")}`;
}
