import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const repoRoot = resolve(desktopRoot, "../..");
const webRoot = resolve(repoRoot, "apps/web");
const tauriRoot = resolve(desktopRoot, "src-tauri");
const serverOut = resolve(tauriRoot, "server");
const binariesOut = resolve(tauriRoot, "binaries");

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function findPrismaEngineDir(root) {
  const candidates = [
    join(root, "node_modules", ".prisma", "client"),
    join(root, "node_modules", "@prisma", "client"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  const prismaClient = join(root, "node_modules", ".pnpm");
  if (existsSync(prismaClient)) {
    for (const entry of readdirSync(prismaClient)) {
      if (entry.startsWith("@prisma+client@")) {
        const dir = join(prismaClient, entry, "node_modules", ".prisma", "client");
        if (existsSync(dir)) return dir;
      }
    }
  }
  return null;
}

function copyPrismaEngines(standaloneRoot) {
  const sourceDir = findPrismaEngineDir(repoRoot);
  if (!sourceDir) {
    console.warn("prepare-server: Prisma engine directory not found; desktop DB may fail at runtime.");
    return;
  }

  const targetDir = join(standaloneRoot, "node_modules", ".prisma", "client");
  mkdirSync(targetDir, { recursive: true });

  for (const file of readdirSync(sourceDir)) {
    if (file.includes("query_engine") || file.endsWith(".node") || file.endsWith(".dll.node")) {
      cpSync(join(sourceDir, file), join(targetDir, file));
    }
  }
}

function copyNodeSidecar() {
  mkdirSync(binariesOut, { recursive: true });
  const nodePath = process.execPath;
  const baseName = "node";

  if (process.platform === "win32") {
    cpSync(nodePath, join(binariesOut, `${baseName}-x86_64-pc-windows-msvc.exe`));
    return;
  }

  if (process.platform === "darwin") {
    const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
    cpSync(nodePath, join(binariesOut, `${baseName}-${arch}-apple-darwin`));
    return;
  }

  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  cpSync(nodePath, join(binariesOut, `${baseName}-${arch}-unknown-linux-gnu`));
}

copyNodeSidecar();

const buildEnv = {
  ...process.env,
  TAURI_BUILD: "1",
  DATABASE_URL: process.env.DATABASE_URL ?? "file:../../data/aperio-j-ci.db",
};

function run(command) {
  console.log(`prepare-server: ${command}`);
  try {
    execSync(command, { cwd: repoRoot, stdio: "inherit", env: buildEnv });
  } catch (error) {
    console.error(`prepare-server: command failed: ${command}`);
    throw error;
  }
}

console.log("prepare-server: building workspace packages…");
mkdirSync(resolve(repoRoot, "data"), { recursive: true });
run('pnpm -r --filter "./packages/*" build');
console.log("prepare-server: building Next.js standalone…");
run("pnpm --filter @aperio-j/web build");

const standaloneSrc = join(webRoot, ".next", "standalone");
if (!existsSync(standaloneSrc)) {
  throw new Error(`Missing standalone output at ${standaloneSrc}`);
}

console.log("prepare-server: staging server bundle…");
if (existsSync(serverOut)) rmSync(serverOut, { recursive: true, force: true });
copyDir(standaloneSrc, serverOut);

const staticSrc = join(webRoot, ".next", "static");
const staticDest = join(serverOut, "apps", "web", ".next", "static");
if (existsSync(staticSrc)) {
  copyDir(staticSrc, staticDest);
}

const publicSrc = join(webRoot, "public");
const publicDest = join(serverOut, "apps", "web", "public");
if (existsSync(publicSrc)) {
  copyDir(publicSrc, publicDest);
}

copyPrismaEngines(serverOut);

function pruneServerArtifacts(root) {
  let removed = 0;
  const dropName = /^(?:README(?:\.md)?|CHANGELOG(?:\.md)?|LICENSE(?:\.md)?|\.DS_Store)$/i;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === "@types") {
          rmSync(full, { recursive: true, force: true });
          removed += 1;
          continue;
        }
        walk(full);
        continue;
      }
      if (entry.endsWith(".d.ts") || entry.endsWith(".map") || dropName.test(entry)) {
        rmSync(full, { force: true });
        removed += 1;
      }
    }
  };
  walk(root);
  console.log(`prepare-server: pruned ${removed} non-runtime artifacts from server bundle`);
}

pruneServerArtifacts(serverOut);
copyNodeSidecar();

const serverJs = join(serverOut, "apps", "web", "server.js");
if (!existsSync(serverJs)) {
  throw new Error(`Missing server entry at ${serverJs}`);
}

console.log("prepare-server: done →", serverOut);
