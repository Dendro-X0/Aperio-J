#!/usr/bin/env node
/**
 * Allow HTTP (cleartext) in Android release builds when APERIO_J_WEB_URL uses http://.
 * Required for LAN self-host (e.g. http://192.168.x.x:3010).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gradlePath = resolve(__dirname, "../../src-tauri/gen/android/app/build.gradle.kts");
const marker = "// aperio-j release cleartext";

const webUrl = process.env.APERIO_J_WEB_URL?.trim() ?? "";
if (!webUrl.startsWith("http://")) {
  process.exit(0);
}

if (!existsSync(gradlePath)) {
  console.error("patch-android-cleartext: run `tauri android init` first");
  process.exit(1);
}

let source = readFileSync(gradlePath, "utf8");
if (source.includes(marker)) {
  console.log("patch-android-cleartext: already patched");
  process.exit(0);
}

const releaseBlock = `getByName("release") {
            ${marker}
            manifestPlaceholders["usesCleartextTraffic"] = "true"`;

if (!source.includes('getByName("release")')) {
  console.error("patch-android-cleartext: release buildType not found");
  process.exit(1);
}

source = source.replace(/getByName\("release"\) \{/, releaseBlock);

writeFileSync(gradlePath, source, "utf8");
console.log("patch-android-cleartext: enabled HTTP cleartext for release (LAN self-host)");
