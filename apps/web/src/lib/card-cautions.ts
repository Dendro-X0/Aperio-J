import type { InboxItem } from "@/lib/match-service";

/** Card-level cautions: hide lone low-severity poster-unknown warnings. */
export function cautionsForCard(item: InboxItem): string[] {
  const { match, opportunity } = item;
  if (match.cautions.length === 0) return [];

  const hasHighSeverity =
    (opportunity.redFlags?.length ?? 0) > 0 ||
    (opportunity.trustWarnings?.length ?? 0) > 0 ||
    match.cautions.length > 1;

  if (hasHighSeverity) return match.cautions;

  if (match.cautions.length === 1 && opportunity.posterType === "unknown") {
    return [];
  }

  return match.cautions;
}
