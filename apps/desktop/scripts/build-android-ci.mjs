#!/usr/bin/env node
/**
 * CI wrapper for Android APK builds. Writes a short failure excerpt when Gradle/Tauri fails.
 */
import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const repoRoot = resolve(desktopRoot, "../..");
const logPath = resolve(repoRoot, "android-build.log");
const excerptPath = resolve(repoRoot, "android-build-failure.txt");

const tauriArgs = process.argv.slice(2);
const command = `pnpm exec tauri android build ${tauriArgs.join(" ")}`.trim();

function runStep(label, cmd, cwd = desktopRoot) {
  console.log(`build-android-ci: ${label}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

try {
  runStep("preflight", "bash ../../scripts/android-preflight.sh");
  runStep("ensure sidecar + frontend dist", "node scripts/ensure-node-sidecar.mjs");
  runStep("patch release signing", "node scripts/signing/patch-android-release-signing.mjs");

  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, `build-android-ci: ${command}\n\n`, "utf8");

  execSync(`set -o pipefail; ${command} 2>&1 | tee -a "${logPath}"`, {
    cwd: desktopRoot,
    stdio: "inherit",
    shell: "/bin/bash",
    env: process.env,
  });
} catch (error) {
  let log = "";
  try {
    log = execSync(`tail -n 400 "${logPath}"`, { encoding: "utf8" });
  } catch {
    log = String(error);
  }

  const patterns = [
    /^FAILURE:/m,
    /^BUILD FAILED/m,
    /^ERROR/m,
    /Execution failed for task/m,
    /What went wrong:/m,
    /Caused by:/m,
    /error: /m,
    /Error /m,
  ];

  const lines = log.split("\n");
  const hits = lines.filter((line) => patterns.some((pattern) => pattern.test(line)));
  const excerpt = [
    "Android build failed. Useful lines:",
    "",
    ...hits.slice(-40),
    "",
    "--- last 40 log lines ---",
    ...lines.slice(-40),
  ].join("\n");

  writeFileSync(excerptPath, excerpt, "utf8");
  console.error("\n===== android-build-failure.txt =====\n");
  console.error(excerpt);
  console.error("\n=====================================\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Android build failed\n\n\`\`\`\n${excerpt}\n\`\`\`\n`,
    );
  }

  process.exit(1);
}
