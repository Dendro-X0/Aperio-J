#!/usr/bin/env node
/**
 * Write gen/android/keystore.properties from env (or .signing defaults).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "../..");
const signingDir = join(desktopRoot, ".signing");
const propsPath = join(desktopRoot, "src-tauri/gen/android/keystore.properties");

const storeFile =
  process.env.APERIO_J_ANDROID_KEYSTORE ?? join(signingDir, "android-upload.jks");
const keyAlias = process.env.APERIO_J_ANDROID_KEY_ALIAS ?? "aperio-j-upload";
const password = process.env.APERIO_J_ANDROID_KEY_PASSWORD ?? "aperio-j-local";

if (!existsSync(storeFile)) {
  console.error(`Keystore not found: ${storeFile}`);
  console.error("Run: pnpm --filter @aperio-j/desktop signing:android-keystore");
  process.exit(1);
}

mkdirSync(dirname(propsPath), { recursive: true });

const normalizedStore = storeFile.replace(/\\/g, "/");
const lines = [
  `storeFile=${normalizedStore}`,
  `keyAlias=${keyAlias}`,
  `password=${password}`,
  "",
];

writeFileSync(propsPath, lines.join("\n"), "utf8");
console.log("Wrote", propsPath);
