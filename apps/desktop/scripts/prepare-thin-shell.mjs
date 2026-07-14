#!/usr/bin/env node
/**
 * Shared thin-shell frontend for Android + desktop release builds.
 * Embeds dist/index.html that opens APERO_J_WEB_URL (hosted instance).
 */
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const repoRoot = resolve(desktopRoot, "../..");
const frontendDist = resolve(desktopRoot, "dist");
const tauriRoot = resolve(desktopRoot, "src-tauri");

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

export function resolveReleaseWebUrl(options = {}) {
  const fromEnv = process.env.APERIO_J_WEB_URL?.trim();
  if (fromEnv) return normalizeWebUrl(fromEnv);

  const urlFile = resolve(desktopRoot, "release-web-url.txt");
  if (existsSync(urlFile)) {
    const lines = readFileSync(urlFile, "utf8").split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      return normalizeWebUrl(trimmed);
    }
  }

  try {
    const resolved = execFileSync("node", ["scripts/resolve-release-web-url.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    if (resolved) return normalizeWebUrl(resolved);
  } catch {
    // fall through
  }

  if (options.allowLocalhost && process.env.APERIO_J_ANDROID_ALLOW_LOCALHOST === "1") {
    return DEFAULT_DEV_URL;
  }

  return null;
}

function launcherHtml(webUrl) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aperio-J</title>
    <meta http-equiv="refresh" content="0;url=${webUrl}" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; color: #334155; }
    </style>
  </head>
  <body>
    <p>Opening Aperio-J…</p>
    <p><a href="${webUrl}">Continue</a> if you are not redirected.</p>
    <script>window.location.replace(${JSON.stringify(webUrl)});</script>
  </body>
</html>
`;
}

function thinReleaseConfig(platform) {
  const base = {
    $schema: "https://schema.tauri.app/config/2",
    build: {
      beforeBuildCommand: "",
      frontendDist: "../dist",
    },
    bundle: {
      resources: [],
      externalBin: [],
    },
  };

  if (platform === "android") {
    return {
      ...base,
      app: {
        windows: [{ label: "main", title: "Aperio-J", url: "/index.html" }],
      },
    };
  }

  return {
    ...base,
    app: {
      windows: [
        {
          label: "main",
          title: "Aperio-J",
          url: "/index.html",
          width: 1200,
          height: 800,
          minWidth: 960,
          minHeight: 640,
          resizable: true,
          decorations: false,
          shadow: true,
        },
      ],
    },
  };
}

export function prepareThinShell(platform) {
  const webUrl = resolveReleaseWebUrl({ allowLocalhost: platform === "android" });
  if (!webUrl) {
    throw new Error(
      `No release web URL for ${platform} thin shell. Set APERIO_J_WEB_URL or apps/desktop/release-web-url.txt`,
    );
  }

  mkdirSync(frontendDist, { recursive: true });
  writeFileSync(join(frontendDist, "index.html"), launcherHtml(webUrl), "utf8");

  const configName =
    platform === "android" ? "tauri.android.release.json" : "tauri.desktop.release.json";
  const releaseConfigPath = join(tauriRoot, configName);
  writeFileSync(
    releaseConfigPath,
    `${JSON.stringify(thinReleaseConfig(platform), null, 2)}\n`,
    "utf8",
  );

  for (const dir of [join(tauriRoot, "server"), join(tauriRoot, "binaries")]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }

  console.log(`prepare-thin-shell (${platform}): dist/index.html →`, webUrl);
  console.log(`prepare-thin-shell (${platform}): wrote`, releaseConfigPath);
  return webUrl;
}

if (process.argv[1]?.endsWith("prepare-thin-shell.mjs")) {
  const platformArg = process.argv.find((arg) => arg.startsWith("--platform="));
  const platform = platformArg?.split("=")[1] ?? process.argv[2] ?? "desktop";
  if (platform !== "android" && platform !== "desktop") {
    console.error("Usage: prepare-thin-shell.mjs --platform=android|desktop");
    process.exit(1);
  }
  try {
    prepareThinShell(platform);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
