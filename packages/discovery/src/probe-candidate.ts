import type { StreamCandidate, StreamKind } from "@aperio-j/core";
import { domainTierFromUrl } from "./validate-stream.js";

export function probeStreamId(seedUrl: string): string {
  let hash = 0;
  for (let i = 0; i < seedUrl.length; i++) {
    hash = (hash * 31 + seedUrl.charCodeAt(i)) >>> 0;
  }
  return `stream-${hash.toString(16)}`;
}

/** Lightweight candidate for search/registry hints — full validation happens at scan time. */
export function createLightweightStreamCandidate(input: {
  label: string;
  kind: StreamKind;
  seedUrl: string;
  discoveredVia: string;
  regionHint: string;
  confidence: number;
}): StreamCandidate {
  const tier = domainTierFromUrl(input.seedUrl);
  const confidence = Math.min(
    input.confidence + (tier === "gov" ? 0.08 : tier === "edu" ? 0.04 : 0),
    0.95,
  );

  return {
    id: probeStreamId(input.seedUrl),
    label: input.label,
    kind: input.kind,
    seedUrl: input.seedUrl,
    discoveredVia: input.discoveredVia,
    regionHint: input.regionHint,
    confidence,
    sampleItemCount: 0,
    lastValidatedAt: new Date().toISOString(),
    health: "unknown",
    validationTier: "candidate",
  };
}
