#!/usr/bin/env node
/**
 * CI desktop build: thin shell (hosted URL) by default, full local bundle when
 * APERO_J_DESKTOP_LOCAL=1 or no release web URL is configured.
 *
 * Env:
 *   APERO_J_DESKTOP_PLATFORM = windows | linux | macos
 *   TAURI_BUILD_TARGET       = rust target triple (optional, e.g. aarch64-apple-darwin)
 *   APERO_J_DESKTOP_LOCAL    = 1 for full local bundle
 *   APERIO_J_WEB_URL         = hosted URL for thin shell (also accepts APERO_J_WEB_URL)
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareThinShell, resolveReleaseWebUrl } from "./prepare-thin-shell.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");

function envFirst(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function run(command, env = {}) {
  console.log(`build-desktop-ci: ${command}`);
  execSync(command, {
    cwd: desktopRoot,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

const platformConfigs = {
  windows: { config: "src-tauri/tauri.windows.conf.json", bundles: "nsis" },
  linux: { config: "src-tauri/tauri.linux.conf.json", bundles: "appimage" },
  macos: { config: "src-tauri/tauri.macos.conf.json", bundles: "dmg" },
};

// Prefer APERO_J_* (repo convention); accept APERIO_J_* typos from CI drafts.
const platform = (
  envFirst("APERO_J_DESKTOP_PLATFORM", "APERIO_J_DESKTOP_PLATFORM") || "windows"
).toLowerCase();
const platformSpec = platformConfigs[platform];
if (!platformSpec) {
  console.error(
    `build-desktop-ci: unknown APERO_J_DESKTOP_PLATFORM=${platform} (expected windows|linux|macos)`,
  );
  process.exit(1);
}

const rustTarget = envFirst("TAURI_BUILD_TARGET");
const targetArg = rustTarget ? ` --target ${rustTarget}` : "";

function tauriBuild(...configs) {
  const configArgs = configs.map((config) => `--config ${config}`).join(" ");
  run(
    `pnpm exec tauri build ${configArgs} --bundles ${platformSpec.bundles}${targetArg}`,
  );
}

// Align thin-shell URL resolver with either env spelling used in workflows.
const webUrlFromEnv = envFirst("APERIO_J_WEB_URL", "APERO_J_WEB_URL");
if (webUrlFromEnv) {
  process.env.APERIO_J_WEB_URL = webUrlFromEnv;
}

const forceLocal =
  envFirst("APERO_J_DESKTOP_LOCAL", "APERIO_J_DESKTOP_LOCAL") === "1";
const webUrl = resolveReleaseWebUrl();

console.log(
  `build-desktop-ci: platform=${platform} bundles=${platformSpec.bundles}${
    rustTarget ? ` target=${rustTarget}` : ""
  }`,
);

if (forceLocal || !webUrl) {
  if (!forceLocal && !webUrl) {
    console.warn("build-desktop-ci: no web URL — building full local desktop (~50MB)");
  } else {
    console.log("build-desktop-ci: APERO_J_DESKTOP_LOCAL=1 — full local bundle");
  }
  run("pnpm prepare:server");
  tauriBuild(platformSpec.config);
} else {
  console.log("build-desktop-ci: thin shell →", webUrl);
  prepareThinShell("desktop");
  tauriBuild("src-tauri/tauri.desktop.release.json", platformSpec.config);
}
