import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src", "catalogs");

mkdirSync(join(target, "locales"), { recursive: true });
mkdirSync(join(target, "taxonomies"), { recursive: true });

cpSync(join(root, "locales"), join(target, "locales"), { recursive: true });
cpSync(join(root, "taxonomies"), join(target, "taxonomies"), { recursive: true });
