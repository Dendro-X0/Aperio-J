#!/usr/bin/env node
/**
 * Prepare Android release frontend: embed dist/index.html that opens APERIO_J_WEB_URL.
 * Required for every release APK — points the shell at your self-hosted instance.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const frontendDist = resolve(desktopRoot, "dist");
const releaseConfigPath = resolve(desktopRoot, "src-tauri", "tauri.android.release.json");

const DEFAULT_DEV_URL = "http://127.0.0.1:3010";

function normalizeWebUrl(raw) {
  const trimmed = raw.trim();
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`APERIO_J_WEB_URL is not a valid URL: ${trimmed}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`APERIO_J_WEB_URL must use http:// or https:// (got ${url.protocol})`);
  }

  return url.toString().replace(/\/$/, "");
}

function resolveWebUrl() {
  const fromEnv = process.env.APERIO_J_WEB_URL?.trim();
  if (fromEnv) {
    return normalizeWebUrl(fromEnv);
  }

  const urlFile = resolve(desktopRoot, "release-web-url.txt");
  try {
    const lines = readFileSync(urlFile, "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      return normalizeWebUrl(trimmed);
    }
  } catch {
    // fall through
  }

  if (process.env.APERIO_J_ANDROID_ALLOW_LOCALHOST === "1") {
    console.warn(
      "prepare-android-frontend: APERIO_J_ANDROID_ALLOW_LOCALHOST=1 — embedding dev server URL (emulator/USB dev only)",
    );
    return DEFAULT_DEV_URL;
  }

  console.error(`prepare-android-frontend: APERIO_J_WEB_URL is required for Android release builds.

Set the URL of your self-hosted web instance, for example:
  export APERIO_J_WEB_URL="https://aperio.example.com"
  export APERIO_J_WEB_URL="http://192.168.1.42:3010"

Then rebuild:
  pnpm build:android

For local emulator testing against a dev server:
  export APERIO_J_ANDROID_ALLOW_LOCALHOST=1
`);
  process.exit(1);
}

const webUrl = resolveWebUrl();
mkdirSync(frontendDist, { recursive: true });

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aperio-J</title>
    <meta http-equiv="refresh" content="0;url=${webUrl}" />
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 2rem;
        color: #334155;
      }
    </style>
  </head>
  <body>
    <p>Opening Aperio-J…</p>
    <p><a href="${webUrl}">Continue</a> if you are not redirected.</p>
    <script>
      window.location.replace(${JSON.stringify(webUrl)});
    </script>
  </body>
</html>
`;

writeFileSync(join(frontendDist, "index.html"), indexHtml, "utf8");

const releaseConfig = {
  $schema: "https://schema.tauri.app/config/2",
  build: {
    beforeBuildCommand: "",
    frontendDist: "../dist",
  },
  app: {
    windows: [
      {
        label: "main",
        title: "Aperio-J",
        url: "/index.html",
      },
    ],
  },
  bundle: {
    resources: [],
    externalBin: [],
  },
};

writeFileSync(releaseConfigPath, `${JSON.stringify(releaseConfig, null, 2)}\n`, "utf8");

console.log("prepare-android-frontend: dist/index.html →", webUrl);
console.log("prepare-android-frontend: wrote", releaseConfigPath);
