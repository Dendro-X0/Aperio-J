import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const webRoot = resolve(repoRoot, "apps/web");
const standaloneRoot = join(webRoot, ".next", "standalone");

function copyDir(src, dest) {
  if (!existsSync(src)) return;
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
  const pnpmStore = join(root, "node_modules", ".pnpm");
  if (existsSync(pnpmStore)) {
    for (const entry of readdirSync(pnpmStore)) {
      if (entry.startsWith("@prisma+client@")) {
        const dir = join(pnpmStore, entry, "node_modules", ".prisma", "client");
        if (existsSync(dir)) return dir;
      }
    }
  }
  return null;
}

function copyPrismaEngines(standaloneDir) {
  const sourceDir = findPrismaEngineDir(repoRoot);
  if (!sourceDir) {
    console.warn("stage-web-standalone: Prisma engine directory not found");
    return;
  }

  const targetDir = join(standaloneDir, "node_modules", ".prisma", "client");
  mkdirSync(targetDir, { recursive: true });

  for (const file of readdirSync(sourceDir)) {
    if (file.includes("query_engine") || file.endsWith(".node") || file.endsWith(".dll.node")) {
      cpSync(join(sourceDir, file), join(targetDir, file));
    }
  }
}

if (!existsSync(standaloneRoot)) {
  throw new Error(`Missing standalone output at ${standaloneRoot}. Run with TAURI_BUILD=1.`);
}

copyDir(join(webRoot, ".next", "static"), join(standaloneRoot, "apps", "web", ".next", "static"));
copyDir(join(webRoot, "public"), join(standaloneRoot, "apps", "web", "public"));
copyPrismaEngines(standaloneRoot);

console.log("stage-web-standalone: ready →", standaloneRoot);
