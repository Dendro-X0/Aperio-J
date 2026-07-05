import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tauriRoot = resolve(__dirname, "../src-tauri");
const binariesOut = join(tauriRoot, "binaries");
const serverRoot = join(tauriRoot, "server");

function sidecarName() {
  if (process.platform === "win32") {
    return "node-x86_64-pc-windows-msvc.exe";
  }
  if (process.platform === "darwin") {
    const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
    return `node-${arch}-apple-darwin`;
  }
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  return `node-${arch}-unknown-linux-gnu`;
}

mkdirSync(binariesOut, { recursive: true });
const target = join(binariesOut, sidecarName());

if (!existsSync(target)) {
  cpSync(process.execPath, target);
  console.log("ensure-node-sidecar:", target);
}

const placeholderServer = join(serverRoot, "apps", "web", "server.js");
if (!existsSync(placeholderServer)) {
  mkdirSync(dirname(placeholderServer), { recursive: true });
  writeFileSync(placeholderServer, "// dev placeholder — replaced by prepare:server before release builds\n");
  console.log("ensure-node-sidecar: placeholder server bundle");
}
