import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function resolveBetterSqlite3Root() {
  try {
    return dirname(
      require.resolve("better-sqlite3/package.json", {
        paths: [join(root, "packages", "db")],
      }),
    );
  } catch {
    return null;
  }
}

const pkgRoot = resolveBetterSqlite3Root();
if (!pkgRoot) {
  process.exit(0);
}

let prebuildBin;
try {
  prebuildBin = require.resolve("prebuild-install/bin.js", { paths: [pkgRoot] });
} catch {
  console.warn("rebuild-native-modules: prebuild-install not found, skipping");
  process.exit(0);
}

const result = spawnSync(process.execPath, [prebuildBin], {
  cwd: pkgRoot,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.warn(
    "rebuild-native-modules: prebuild-install failed; run `pnpm native:rebuild` after switching Node versions",
  );
}

process.exit(0);
