import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SignalPack } from "./builtin-packs.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseSignalPack(raw: unknown, source: string): SignalPack | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.locale !== "string" || !raw.locale.trim()) return null;
  if (!Array.isArray(raw.citySlugs) || raw.citySlugs.length === 0) return null;
  if (!Array.isArray(raw.roleKeywords) || raw.roleKeywords.length === 0) return null;
  if (!Array.isArray(raw.streams) || raw.streams.length === 0) return null;

  const streams = raw.streams
    .map((row) => {
      if (!isRecord(row)) return null;
      if (typeof row.id !== "string" || typeof row.label !== "string") return null;
      if (typeof row.seedUrl !== "string" || !row.seedUrl.startsWith("http")) return null;
      const kind = row.kind === "rss" ? "rss" : "list_page";
      const tier = row.domainTier;
      const domainTier =
        tier === "gov" || tier === "edu" || tier === "company" || tier === "aggregator"
          ? tier
          : "unknown";
      return { id: row.id, label: row.label, seedUrl: row.seedUrl, kind, domainTier };
    })
    .filter((row): row is SignalPack["streams"][number] => row != null);

  if (streams.length === 0) return null;

  return {
    id: raw.id.trim(),
    locale: raw.locale.trim(),
    citySlugs: raw.citySlugs.map(String),
    cityLabels: Array.isArray(raw.cityLabels) ? raw.cityLabels.map(String) : undefined,
    roleKeywords: raw.roleKeywords.map(String),
    streams,
  };
}

export function resolveSignalPacksDir(): string | null {
  const fromEnv = process.env.APERO_J_SIGNAL_PACKS_DIR?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    join(process.cwd(), "probe-packs"),
    join(process.cwd(), "../../probe-packs"),
    join(process.cwd(), "../../../probe-packs"),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  return null;
}

/** Load community JSON packs from `probe-packs/` or APERO_J_SIGNAL_PACKS_DIR. */
export function loadExternalSignalPacks(dir = resolveSignalPacksDir()): SignalPack[] {
  if (!dir || !existsSync(dir)) return [];

  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(dir, entry.name));

  const packs: SignalPack[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
      const pack = parseSignalPack(raw, file);
      if (pack) packs.push(pack);
    } catch {
      // skip invalid community pack
    }
  }

  return packs;
}
