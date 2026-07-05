#!/usr/bin/env node
/**
 * Generate a self-signed Windows code-signing PFX for local/OSS distribution.
 * SmartScreen will still warn until users trust the cert — this is expected for OSS.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const signingDir = join(resolve(__dirname, "../.."), ".signing");
const outDir = process.env.APERIO_J_SIGNING_DIR ?? signingDir;
const pfxPath = process.env.APERIO_J_WIN_CERT_PFX ?? join(outDir, "aperio-j-windows.pfx");
const password = process.env.APERIO_J_WIN_CERT_PASSWORD ?? "aperio-j-local";

if (process.platform !== "win32") {
  console.error("generate-windows-cert: run on Windows with PowerShell/openssl, or create a .pfx manually.");
  process.exit(1);
}

if (existsSync(pfxPath)) {
  console.error(`Certificate already exists: ${pfxPath}`);
  process.exit(1);
}

mkdirSync(dirname(pfxPath), { recursive: true });

const ps = `
$cert = New-SelfSignedCertificate \\
  -Type CodeSigningCert \\
  -Subject "CN=aperio-j OSS" \\
  -CertStoreLocation Cert:\\\\CurrentUser\\\\My \\
  -KeyExportPolicy Exportable \\
  -KeyUsage DigitalSignature \\
  -HashAlgorithm SHA256 \\
  -NotAfter (Get-Date).AddYears(5);
$pwd = ConvertTo-SecureString -String '${password.replace(/'/g, "''")}' -Force -AsPlainText;
Export-PfxCertificate -Cert $cert -FilePath '${pfxPath.replace(/'/g, "''")}' -Password $pwd | Out-Null;
Write-Host "Thumbprint:" $cert.Thumbprint;
`;

execSync(`powershell -NoProfile -Command "${ps.replace(/\n/g, " ")}"`, { stdio: "inherit" });

console.log("\nGenerated Windows signing certificate:");
console.log("  APERIO_J_WIN_CERT_PFX=", pfxPath);
console.log("  APERIO_J_WIN_CERT_PASSWORD=", password);
console.log("\nRelease builds will sign automatically via tauri.windows.conf.json");
