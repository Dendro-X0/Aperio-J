#!/usr/bin/env node
/**
 * Optional Windows code signing for OSS/local releases.
 * Set APERIO_J_WIN_CERT_PFX (path to .pfx) and APERIO_J_WIN_CERT_PASSWORD.
 * If unset, exits 0 so unsigned builds still succeed.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("sign-windows: missing file argument");
  process.exit(1);
}

const pfx = process.env.APERIO_J_WIN_CERT_PFX;
const password = process.env.APERIO_J_WIN_CERT_PASSWORD ?? "";

if (!pfx) {
  console.log("sign-windows: APERIO_J_WIN_CERT_PFX unset — skipping (unsigned build)");
  process.exit(0);
}

const certPath = resolve(pfx);
if (!existsSync(certPath)) {
  console.error(`sign-windows: certificate not found at ${certPath}`);
  process.exit(1);
}

const signtoolCandidates = [
  "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe",
  "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe",
  "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64\\signtool.exe",
];

const signtool = signtoolCandidates.find((path) => existsSync(path));
if (!signtool) {
  console.error("sign-windows: signtool.exe not found — install Windows SDK or sign manually");
  process.exit(1);
}

const timestampUrl = process.env.APERIO_J_WIN_TIMESTAMP_URL ?? "http://timestamp.digicert.com";

execFileSync(
  signtool,
  [
    "sign",
    "/f",
    certPath,
    "/p",
    password,
    "/fd",
    "sha256",
    "/tr",
    timestampUrl,
    "/td",
    "sha256",
    file,
  ],
  { stdio: "inherit" },
);

console.log("sign-windows: signed", file);
