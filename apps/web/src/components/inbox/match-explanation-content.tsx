"use client";

import type { InboxItem } from "@/lib/match-service";
import { displayLocationText, displayTaxonomyLabel } from "@/lib/display-localize";
import { useI18n, useTranslations } from "@/i18n/provider";

export function MatchExplanationContent({ item }: { item: InboxItem }) {
  const { locale, listSeparator } = useI18n();
  const { t } = useTranslations("inbox.detail.explanation");
  const { t: tCommon } = useTranslations("common");

  const { opportunity, match } = item;

  if (match.excluded && match.exclusionReason) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("notRecommended", { reason: match.exclusionReason })}
      </p>
    );
  }

  const parts: string[] = [];

  if (match.taxonomyHits.length > 0) {
    parts.push(
      t("taxonomyMatch", {
        hits: match.taxonomyHits
          .map((ref) => displayTaxonomyLabel(ref, locale))
          .join(listSeparator),
      }),
    );
  }

  if (match.intentHits.length > 0) {
    parts.push(
      t("intentMatch", {
        hits: match.intentHits.slice(0, 4).join(listSeparator),
      }),
    );
  }

  if (match.capabilityHits.length > 0) {
    parts.push(
      t("capabilityMatch", {
        hits: match.capabilityHits.slice(0, 4).join(listSeparator),
      }),
    );
  }

  const location = displayLocationText(opportunity.locationText, locale);
  if (location) {
    parts.push(t("location", { location }));
  }

  if (opportunity.posterType === "direct") {
    parts.push(t("posterDirect"));
  } else if (opportunity.posterType === "agency") {
    parts.push(t("posterAgency"));
  }

  if (match.cautions.length > 0) {
    parts.push(
      t("cautions", {
        items: match.cautions.join(tCommon("cautionSeparator")),
      }),
    );
  }

  if (parts.length === 0) {
    return <p className="text-sm leading-relaxed text-muted-foreground">{t("fallback")}</p>;
  }

  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {parts.join(tCommon("sentenceSeparator"))}
      {tCommon("explanationSuffix")}
    </p>
  );
}
