import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const tauriRoot = resolve(desktopRoot, "src-tauri");
const frontendDist = resolve(desktopRoot, "dist");
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

const frontendIndex = join(frontendDist, "index.html");
if (!existsSync(frontendIndex)) {
  mkdirSync(frontendDist, { recursive: true });
  writeFileSync(
    frontendIndex,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Aperio-J</title>
    <meta http-equiv="refresh" content="0;url=http://127.0.0.1:3010" />
  </head>
  <body>
    <p>Starting Aperio-J…</p>
  </body>
</html>
`,
  );
  console.log("ensure-node-sidecar: placeholder frontend dist");
}
