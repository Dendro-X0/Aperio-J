#!/usr/bin/env node
/**
 * Resolve the public web URL baked into Android release APKs.
 * Priority: APERIO_J_WEB_URL env → apps/desktop/release-web-url.txt (first non-comment line).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const urlFile = resolve(repoRoot, "apps/desktop/release-web-url.txt");

function normalizeWebUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Invalid APERIO_J_WEB_URL: ${trimmed}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`APERIO_J_WEB_URL must use http:// or https:// (got ${url.protocol})`);
  }
  return url.toString().replace(/\/$/, "");
}

function readUrlFromFile() {
  try {
    const lines = readFileSync(urlFile, "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      return normalizeWebUrl(trimmed);
    }
  } catch {
    return null;
  }
  return null;
}

const fromEnv = process.env.APERIO_J_WEB_URL?.trim();
const url = fromEnv ? normalizeWebUrl(fromEnv) : readUrlFromFile();

if (!url) {
  console.error(`No release web URL configured.

Set one of:
  1. GitHub secret or variable APERIO_J_WEB_URL
  2. apps/desktop/release-web-url.txt (first non-comment line)

Example:
  echo "https://aperio-j-xxxx.onrender.com" > apps/desktop/release-web-url.txt
`);
  process.exit(1);
}

console.log(url);
