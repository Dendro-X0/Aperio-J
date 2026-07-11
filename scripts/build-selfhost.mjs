import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, TAURI_BUILD: "1" };

function run(command) {
  console.log(`build-selfhost: ${command}`);
  execSync(command, { cwd: repoRoot, stdio: "inherit", env });
}

run('pnpm -r --filter "./packages/*" build');
run("pnpm --filter @aperio-j/web build");
run("node scripts/stage-web-standalone.mjs");
