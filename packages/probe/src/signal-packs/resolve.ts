import type { SeekerProfile } from "@aperio-j/core";
import { isChinaCityProfile, normalizeCity, resolveCitySlug } from "../probe-packs.js";
import type { SignalPack } from "./builtin-packs.js";
import { BUILTIN_SIGNAL_PACKS } from "./builtin-packs.js";

let cachedPacks: SignalPack[] | null = null;
let registeredExternal: SignalPack[] = [];

export function resetSignalPackCache(): void {
  cachedPacks = null;
  registeredExternal = [];
}

/** Register packs loaded from disk (server startup only). */
export function registerExternalSignalPacks(packs: SignalPack[]): void {
  registeredExternal = packs;
  cachedPacks = null;
}

export function listSignalPacks(): SignalPack[] {
  if (!cachedPacks) {
    cachedPacks = [...BUILTIN_SIGNAL_PACKS, ...registeredExternal];
  }
  return cachedPacks;
}

function profileIntentCorpus(profile: Pick<SeekerProfile, "intent" | "artifacts">): string {
  return [
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    ...profile.artifacts.map((artifact) => artifact.title),
    ...profile.artifacts.map((artifact) => artifact.industry),
    ...profile.artifacts.map((artifact) => artifact.duties),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function cityMatchesPack(
  pack: SignalPack,
  primaryCity: string,
  acceptableCities: string[],
): boolean {
  const slug = resolveCitySlug(primaryCity);
  const cities = [primaryCity, ...acceptableCities].map((city) => city.trim()).filter(Boolean);
  const cityKeys = cities.map(normalizeCity);

  if (slug && pack.citySlugs.includes(slug)) return true;

  const labels = (pack.cityLabels ?? []).map(normalizeCity);
  return cityKeys.some((key) =>
    labels.some((label) => key.includes(label) || label.includes(key)),
  );
}

function roleMatchesPack(pack: SignalPack, corpus: string): boolean {
  if (!corpus.trim()) return false;
  return pack.roleKeywords.some((keyword) => {
    const norm = keyword.trim().toLowerCase();
    if (norm.length < 2) return false;
    return corpus.includes(norm);
  });
}

/** Resolve city × role signal packs for a seeker profile. */
export function resolveSignalPacksForProfile(
  profile: Pick<SeekerProfile, "constraints" | "intent" | "artifacts">,
): SignalPack[] {
  const city = profile.constraints.primaryCity.trim();
  if (!city || !isChinaCityProfile(city, profile.constraints.acceptableCities)) {
    return [];
  }

  const corpus = profileIntentCorpus(profile);
  return listSignalPacks().filter(
    (pack) =>
      pack.locale.startsWith("zh-CN") &&
      cityMatchesPack(pack, city, profile.constraints.acceptableCities) &&
      roleMatchesPack(pack, corpus),
  );
}

export function flattenSignalPackStreams(packs: SignalPack[]) {
  const seen = new Set<string>();
  const streams: Array<{ packId: string; stream: SignalPack["streams"][number] }> = [];

  for (const pack of packs) {
    for (const stream of pack.streams) {
      if (seen.has(stream.seedUrl)) continue;
      seen.add(stream.seedUrl);
      streams.push({ packId: pack.id, stream });
    }
  }

  return streams;
}

export type { SignalPack } from "./builtin-packs.js";
