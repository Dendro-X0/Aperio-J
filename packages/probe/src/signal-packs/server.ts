import { loadExternalSignalPacks } from "./load-external.js";
import { registerExternalSignalPacks } from "./resolve.js";

let loaded = false;

/** Load JSON packs from probe-packs/ — server-only (uses node:fs). */
export function loadCommunitySignalPacks(): void {
  if (loaded) return;
  registerExternalSignalPacks(loadExternalSignalPacks());
  loaded = true;
}

export { loadExternalSignalPacks, resolveSignalPacksDir } from "./load-external.js";
