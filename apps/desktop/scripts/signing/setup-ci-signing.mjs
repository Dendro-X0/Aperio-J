#!/usr/bin/env node
/**
 * Prepare Android release signing for CI and local builds.
 * Uses committed apps/desktop/signing/android-upload.jks by default, or
 * APERIO_J_ANDROID_KEYSTORE_BASE64 from GitHub Secrets for overrides.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "../..");
const signingDir = join(desktopRoot, "signing");
const defaultKeystore = join(signingDir, "android-upload.jks");
const propsPath = join(desktopRoot, "src-tauri/gen/android/keystore.properties");

const keyAlias = process.env.APERIO_J_ANDROID_KEY_ALIAS ?? "aperio-j-upload";
const password = process.env.APERIO_J_ANDROID_KEY_PASSWORD || "aperio-j-local";

let storeFile = process.env.APERIO_J_ANDROID_KEYSTORE ?? defaultKeystore;

if (process.env.APERIO_J_ANDROID_KEYSTORE_BASE64) {
  mkdirSync(signingDir, { recursive: true });
  storeFile = join(signingDir, "android-upload.jks");
  writeFileSync(storeFile, Buffer.from(process.env.APERIO_J_ANDROID_KEYSTORE_BASE64, "base64"));
  console.log("setup-ci-signing: wrote keystore from APERIO_J_ANDROID_KEYSTORE_BASE64");
}

if (!existsSync(storeFile)) {
  console.error(`setup-ci-signing: keystore not found at ${storeFile}`);
  process.exit(1);
}

mkdirSync(dirname(propsPath), { recursive: true });
const normalizedStore = storeFile.replace(/\\/g, "/");
writeFileSync(
  propsPath,
  [`storeFile=${normalizedStore}`, `keyAlias=${keyAlias}`, `password=${password}`, ""].join("\n"),
  "utf8",
);
console.log("setup-ci-signing: wrote", propsPath);
