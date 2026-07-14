#!/usr/bin/env node
/**
 * CI desktop build: thin shell (hosted URL) by default, full local bundle when
 * APERO_J_DESKTOP_LOCAL=1 or no release web URL is configured.
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareThinShell, resolveReleaseWebUrl } from "./prepare-thin-shell.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");

function run(command, env = {}) {
  console.log(`build-desktop-ci: ${command}`);
  execSync(command, {
    cwd: desktopRoot,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

const forceLocal = process.env.APERIO_J_DESKTOP_LOCAL === "1";
const webUrl = resolveReleaseWebUrl();

if (forceLocal || !webUrl) {
  if (!forceLocal && !webUrl) {
    console.warn("build-desktop-ci: no web URL — building full local desktop (~50MB)");
  } else {
    console.log("build-desktop-ci: APERO_J_DESKTOP_LOCAL=1 — full local bundle");
  }
  run("pnpm prepare:server");
  run("pnpm exec tauri build --config src-tauri/tauri.windows.conf.json");
} else {
  console.log("build-desktop-ci: thin shell →", webUrl);
  prepareThinShell("desktop");
  run("pnpm exec tauri build --config src-tauri/tauri.desktop.release.json --config src-tauri/tauri.windows.conf.json");
}
