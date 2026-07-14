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

const platformConfigs = {
  windows: "src-tauri/tauri.windows.conf.json",
  linux: "src-tauri/tauri.linux.conf.json",
  macos: "src-tauri/tauri.macos.conf.json",
};

const platform = (process.env.APERIO_J_DESKTOP_PLATFORM || "windows").toLowerCase();
const platformConfig = platformConfigs[platform];
if (!platformConfig) {
  console.error(`build-desktop-ci: unknown APERO_J_DESKTOP_PLATFORM=${platform}`);
  process.exit(1);
}

const targetArg = process.env.TAURI_BUILD_TARGET?.trim()
  ? ` --target ${process.env.TAURI_BUILD_TARGET.trim()}`
  : "";

function tauriBuild(...configs) {
  const configArgs = configs.map((config) => `--config ${config}`).join(" ");
  run(`pnpm exec tauri build ${configArgs}${targetArg}`);
}

const forceLocal = process.env.APERIO_J_DESKTOP_LOCAL === "1";
const webUrl = resolveReleaseWebUrl();

console.log(`build-desktop-ci: platform=${platform}${targetArg ? ` target=${process.env.TAURI_BUILD_TARGET?.trim()}` : ""}`);

if (forceLocal || !webUrl) {
  if (!forceLocal && !webUrl) {
    console.warn("build-desktop-ci: no web URL — building full local desktop (~50MB)");
  } else {
    console.log("build-desktop-ci: APERO_J_DESKTOP_LOCAL=1 — full local bundle");
  }
  run("pnpm prepare:server");
  tauriBuild(platformConfig);
} else {
  console.log("build-desktop-ci: thin shell →", webUrl);
  prepareThinShell("desktop");
  tauriBuild("src-tauri/tauri.desktop.release.json", platformConfig);
}
