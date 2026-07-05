#!/usr/bin/env node
/**
 * Generate a local Android upload keystore for OSS/self-hosted releases.
 * Output defaults to apps/desktop/.signing/android-upload.jks (gitignored).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "../..");
const signingDir = join(desktopRoot, ".signing");
const keystorePath = process.env.APERIO_J_ANDROID_KEYSTORE ?? join(signingDir, "android-upload.jks");
const alias = process.env.APERIO_J_ANDROID_KEY_ALIAS ?? "aperio-j-upload";
const password = process.env.APERIO_J_ANDROID_KEY_PASSWORD ?? "aperio-j-local";
const validityDays = process.env.APERIO_J_ANDROID_KEY_VALIDITY ?? "10000";

if (existsSync(keystorePath)) {
  console.error(`Keystore already exists: ${keystorePath}`);
  console.error("Delete it first or set APERIO_J_ANDROID_KEYSTORE to a new path.");
  process.exit(1);
}

mkdirSync(dirname(keystorePath), { recursive: true });

const dname =
  process.env.APERIO_J_ANDROID_KEY_DNAME ??
  "CN=aperio-j OSS, OU=Local, O=aperio-j, L=Local, ST=Local, C=US";

execFileSync(
  "keytool",
  [
    "-genkeypair",
    "-v",
    "-keystore",
    keystorePath,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    validityDays,
    "-storepass",
    password,
    "-keypass",
    password,
    "-dname",
    dname,
  ],
  { stdio: "inherit" },
);

console.log("\nGenerated Android keystore:");
console.log("  path:", keystorePath);
console.log("  alias:", alias);
console.log("\nNext: pnpm --filter @aperio-j/desktop signing:android-props");
