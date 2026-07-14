#!/usr/bin/env node
/**
 * Normalize CI installer artifacts into release/ with stable filenames.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const assetsDir = process.argv[2] || "release-assets";
const outDir = process.argv[3] || "release";

function walk(dir, predicate, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, predicate, results);
    } else if (predicate(path)) {
      results.push(path);
    }
  }
  return results;
}

function pickFirst(paths) {
  return paths.sort()[0] ?? null;
}

mkdirSync(outDir, { recursive: true });

const exe = pickFirst(walk(assetsDir, (path) => path.endsWith(".exe")));
if (!exe) {
  console.error("prepare-release-installers: Windows installer missing");
  process.exit(1);
}
copyFileSync(exe, join(outDir, "Aperio-J-windows-setup.exe"));
console.log("Windows:", basename(exe));

const appImage = pickFirst(walk(assetsDir, (path) => path.endsWith(".AppImage")));
if (appImage) {
  const dest = join(outDir, "Aperio-J-linux-x86_64.AppImage");
  copyFileSync(appImage, dest);
  chmodSync(dest, 0o755);
  console.log("Linux:", basename(appImage));
} else {
  console.warn("prepare-release-installers: Linux AppImage missing");
}

const dmgPaths = walk(assetsDir, (path) => path.endsWith(".dmg"));
const dmgArm = pickFirst(
  dmgPaths.filter(
    (path) =>
      path.includes("aarch64-apple-darwin") ||
      /_aarch64\.dmg$/i.test(path) ||
      /arm64/i.test(basename(path)),
  ),
);
const dmgX64 = pickFirst(
  dmgPaths.filter(
    (path) =>
      path.includes("x86_64-apple-darwin") ||
      /_x64\.dmg$/i.test(path) ||
      /x86_64/i.test(basename(path)),
  ),
);
const dmgFallback = pickFirst(dmgPaths);

if (dmgArm) {
  copyFileSync(dmgArm, join(outDir, "Aperio-J-macos-aarch64.dmg"));
  console.log("macOS arm64:", basename(dmgArm));
} else if (dmgFallback && !dmgX64) {
  copyFileSync(dmgFallback, join(outDir, "Aperio-J-macos-aarch64.dmg"));
  console.log("macOS (native):", basename(dmgFallback));
} else {
  console.warn("prepare-release-installers: macOS arm64 dmg missing");
}

if (dmgX64) {
  copyFileSync(dmgX64, join(outDir, "Aperio-J-macos-x64.dmg"));
  console.log("macOS x64:", basename(dmgX64));
} else {
  console.warn("prepare-release-installers: macOS x64 dmg missing");
}

const apk = pickFirst(walk(assetsDir, (path) => path.endsWith(".apk")));
if (apk) {
  copyFileSync(apk, join(outDir, "Aperio-J-android.apk"));
  console.log("Android:", basename(apk));
} else {
  console.warn("prepare-release-installers: Android APK missing");
}

console.log("Prepared:", readdirSync(outDir).join(", "));
