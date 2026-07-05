export type MatchScoreTier = "strong" | "fair" | "broad" | "weak";

export function matchScoreTier(score: number): MatchScoreTier {
  if (score >= 70) return "strong";
  if (score >= 63) return "fair";
  if (score >= 50) return "broad";
  return "weak";
}

export function matchScoreTierLabelKey(
  tier: MatchScoreTier,
): "scoreStrong" | "scoreFair" | "scoreBroad" | "scoreWeak" {
  if (tier === "strong") return "scoreStrong";
  if (tier === "fair") return "scoreFair";
  if (tier === "broad") return "scoreBroad";
  return "scoreWeak";
}

export function isLowConfidenceScore(score: number): boolean {
  return score < 63;
}
