"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import type { TaxonomyKind, TaxonomyRef } from "@aperio-j/core";
import { expandTaxonomyWithParents } from "@aperio-j/discovery/taxonomy";
import type { InboxItem } from "@/lib/match-service";
import {
  displayLocationText,
  displayTaxonomyLabel,
  sanitizeDisplayText,
  stripHtml,
} from "@/lib/display-localize";
import { JobDescriptionContent } from "@/components/inbox/job-description-content";
import { MatchExplanationContent } from "@/components/inbox/match-explanation-content";
import { useI18n, useTranslations } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BreakdownRow,
  DetailPanel,
  ScoreRing,
} from "@/components/inbox/inbox-detail-panels";
import type { Locale } from "@/i18n/translate";
import { matchScoreTier, matchScoreTierLabelKey } from "@/lib/match-score";
import { cn } from "@/lib/utils";

function mergeTaxonomyRefs(...groups: TaxonomyRef[][]): TaxonomyRef[] {
  const seen = new Set<string>();
  const merged: TaxonomyRef[] = [];
  for (const group of groups) {
    for (const ref of group) {
      if (seen.has(ref.id)) continue;
      seen.add(ref.id);
      merged.push(ref);
    }
  }
  return merged;
}

function groupTaxonomyRefs(refs: TaxonomyRef[]): Record<TaxonomyKind, TaxonomyRef[]> {
  return {
    city: refs.filter((ref) => ref.kind === "city"),
    industry: refs.filter((ref) => ref.kind === "industry"),
    subSector: refs.filter((ref) => ref.kind === "subSector"),
  };
}

function TaxonomySection({
  title,
  refs,
  locale,
}: {
  title: string;
  refs: TaxonomyRef[];
  locale: Locale;
}) {
  if (refs.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {refs.map((ref) => (
          <Badge key={ref.id} variant="secondary">
            {displayTaxonomyLabel(ref, locale)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function InboxOpportunityDetailView({
  item,
  excluded = false,
  remoteOnly = false,
}: {
  item: InboxItem;
  excluded?: boolean;
  remoteOnly?: boolean;
}) {
  const { locale } = useI18n();
  const { t } = useTranslations("inbox.detail");
  const { t: tEnums } = useTranslations("enums");
  const { t: tFeedback } = useTranslations("inbox.feedback");
  const { t: tCard } = useTranslations("inbox.card");
  const { t: tCommon } = useTranslations("common");
  const { t: tNav } = useTranslations("nav");
  const { t: tInbox } = useTranslations("inbox");

  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { opportunity, match, source } = item;
  const title = sanitizeDisplayText(opportunity.title, { maxLength: 200 }) || opportunity.title;
  const muted = excluded || match.excluded;
  const posterLabel =
    tEnums(`posterType.${opportunity.posterType}` as "posterType.direct") ??
    opportunity.posterType;
  const taxonomy = groupTaxonomyRefs(
    expandTaxonomyWithParents(
      mergeTaxonomyRefs(opportunity.taxonomyRefs ?? [], match.taxonomyHits ?? []),
      locale,
    ),
  );
  const contacts = opportunity.contactHints;
  const hasContacts =
    contacts.phones.length > 0 ||
    contacts.emails.length > 0 ||
    contacts.wechat.length > 0 ||
    contacts.qq.length > 0;
  const hasBody =
    stripHtml(opportunity.body).length > 0 &&
    stripHtml(opportunity.body) !== opportunity.title.trim();
  const locationLabel = displayLocationText(opportunity.locationText, locale, { remoteOnly });

  const score = match.breakdown.finalScore;
  const tierLabel = tCard(matchScoreTierLabelKey(matchScoreTier(score)));

  async function sendFeedback(action: string) {
    setFeedbackBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/inbox/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          sourceId: source?.id ?? opportunity.sourceId,
          action,
          roleCategories: opportunity.roleCategories,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? tInbox("errors.feedbackFailed"));
      }
      router.refresh();
    } catch (feedbackError) {
      setError(
        feedbackError instanceof Error
          ? feedbackError.message
          : tInbox("errors.feedbackFailed"),
      );
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/inbox"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 gap-1")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {tNav("backToInbox")}
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {locationLabel && (
                <Badge variant="outline">{locationLabel}</Badge>
              )}
              {source && (
                <Badge variant="secondary">
                  {source.kind === "capture"
                    ? tEnums("streamKind.capture")
                    : source.label}
                </Badge>
              )}
              <Badge variant="outline">{posterLabel}</Badge>
              {opportunity.employerHint && (
                <span className="text-sm text-muted-foreground">{opportunity.employerHint}</span>
              )}
              {muted && match.exclusionReason && (
                <Badge variant="destructive">{match.exclusionReason}</Badge>
              )}
            </div>
          </div>
          <ScoreRing
            score={score}
            muted={muted}
            size="lg"
            tierLabel={tierLabel}
            ariaLabel={`${tCard("matchScore", { score })} — ${tierLabel}`}
          />
        </CardContent>
      </Card>

      {match.cautions.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {match.cautions.join(tCommon("cautionSeparator"))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
          <DetailPanel title={t("matchExplanation")}>
            <MatchExplanationContent item={item} />
          </DetailPanel>

          {hasBody && (
            <DetailPanel title={t("fullDescription")}>
              <JobDescriptionContent body={opportunity.body} />
            </DetailPanel>
          )}

          {!hasBody && (
            <DetailPanel title={t("fullDescription")}>
              <p className="text-sm text-muted-foreground">{t("descriptionUnavailable")}</p>
              <a
                href={opportunity.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {tCard("viewOriginal", {
                  site: opportunity.sourceSite ?? tCommon("externalLink"),
                })}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </DetailPanel>
          )}

          {hasContacts && (
            <DetailPanel title={tCard("contacts")}>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {contacts.phones.map((value) => (
                  <li key={`p-${value}`}>{tCard("contactPhone", { value })}</li>
                ))}
                {contacts.emails.map((value) => (
                  <li key={`e-${value}`}>{tCard("contactEmail", { value })}</li>
                ))}
                {contacts.wechat.map((value) => (
                  <li key={`w-${value}`}>{tCard("contactWechat", { value })}</li>
                ))}
                {contacts.qq.map((value) => (
                  <li key={`q-${value}`}>{tCard("contactQq", { value })}</li>
                ))}
              </ul>
            </DetailPanel>
          )}
        </div>

        <div className="space-y-4">
          {!muted && (
            <DetailPanel title={t("scoreBreakdown")}>
              <div className="space-y-4">
                <BreakdownRow label={t("intent")} value={match.breakdown.intentScore} />
                <BreakdownRow label={t("capability")} value={match.breakdown.capabilityScore} />
                <BreakdownRow label={t("trust")} value={match.breakdown.trustScore} />
                <BreakdownRow label={t("geo")} value={match.breakdown.geoScore} />
              </div>
            </DetailPanel>
          )}

          <DetailPanel title={t("categories")}>
            <div className="space-y-4">
              <TaxonomySection title={t("city")} refs={taxonomy.city} locale={locale} />
              <TaxonomySection title={t("industry")} refs={taxonomy.industry} locale={locale} />
              <TaxonomySection title={t("subSector")} refs={taxonomy.subSector} locale={locale} />
              {taxonomy.city.length === 0 &&
                taxonomy.industry.length === 0 &&
                taxonomy.subSector.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
                )}
            </div>
          </DetailPanel>

          <DetailPanel title={t("sourcePanel")}>
            <div className="space-y-3 text-sm">
              {source && (
                <p className="text-muted-foreground">
                  {source.kind === "capture"
                    ? tEnums("streamKind.capture")
                    : source.label}
                  {tCommon("separator")}
                  {tEnums(`streamKind.${source.kind}` as "streamKind.rss") ?? source.kind}
                </p>
              )}
              <a
                href={opportunity.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                {tCard("viewOriginal", {
                  site: opportunity.sourceSite ?? tCommon("externalLink"),
                })}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </DetailPanel>

          {!muted && (
            <DetailPanel title={t("actionsPanel")}>
              <div className="space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feedbackBusy}
                    onClick={() => sendFeedback("not-interested")}
                  >
                    {tFeedback("notInterested")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feedbackBusy}
                    onClick={() => sendFeedback("agency-scam")}
                  >
                    {tFeedback("agencyScam")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feedbackBusy}
                    onClick={() => sendFeedback("applied")}
                  >
                    {tFeedback("applied")}
                  </Button>
                </div>
              </div>
            </DetailPanel>
          )}
        </div>
      </div>
    </div>
  );
}
