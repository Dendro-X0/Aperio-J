"use client";

import Link from "next/link";
import { AlertTriangle, Briefcase } from "lucide-react";
import type { InboxItem } from "@/lib/match-service";
import {
  bodyExcerpt,
  displayLocationText,
} from "@/lib/display-localize";
import { MatchScorePill } from "@/components/inbox/match-score-pill";
import { matchScoreTier, matchScoreTierLabelKey } from "@/lib/match-score";
import { useI18n, useTranslations } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui/page-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InboxJobCard({
  item,
  onFeedback,
  feedbackBusy,
  muted = false,
}: {
  item: InboxItem;
  onFeedback?: (action: string) => void;
  feedbackBusy?: boolean;
  muted?: boolean;
}) {
  const { locale } = useI18n();
  const { t } = useTranslations("inbox.card");
  const { t: tCommon } = useTranslations("common");
  const { t: tEnums } = useTranslations("enums");
  const { t: tFeedback } = useTranslations("inbox.feedback");

  const { opportunity, match, source } = item;
  const excerpt = bodyExcerpt(opportunity.body, opportunity.title);
  const posterLabel =
    tEnums(`posterType.${opportunity.posterType}` as "posterType.direct") ??
    opportunity.posterType;
  const locationLabel = displayLocationText(opportunity.locationText, locale);
  const score = match.breakdown.finalScore;
  const tierLabel = t(matchScoreTierLabelKey(matchScoreTier(score)));

  return (
    <Card
      className={cn(
        "transition-shadow motion-safe:hover:shadow-md",
        muted && "opacity-80",
      )}
    >
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h2 className="text-base font-semibold leading-snug">{opportunity.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {locationLabel && <span>{locationLabel}</span>}
              {opportunity.employerHint && <span>{opportunity.employerHint}</span>}
              <Badge variant="outline">{posterLabel}</Badge>
              {muted && match.exclusionReason && (
                <Badge variant="destructive">{match.exclusionReason}</Badge>
              )}
            </div>
          </div>
          <MatchScorePill
            score={score}
            muted={muted}
            tierLabel={tierLabel}
            size="md"
            ariaLabel={`${t("matchScore", { score })} — ${tierLabel}`}
          />
        </div>

        {excerpt && (
          <p className="line-clamp-2 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
            {excerpt}
          </p>
        )}

        {match.cautions.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {match.cautions.join(tCommon("cautionSeparator"))}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="min-w-0 truncate">
            {source && (
              <>
                {source.kind === "capture" ? tEnums("streamKind.capture") : source.label}
                <span>{tCommon("separator")}</span>
                {tEnums(`streamKind.${source.kind}` as "streamKind.rss") ?? source.kind}
              </>
            )}
          </div>
          <a
            href={opportunity.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-medium text-primary hover:underline"
          >
            {t("viewOriginal", {
              site: opportunity.sourceSite ?? tCommon("externalLink"),
            })}
          </a>
        </div>
      </CardContent>

      {onFeedback && !muted && (
        <CardFooter className="gap-2 border-t bg-transparent">
          <Button
            variant="ghost"
            size="sm"
            disabled={feedbackBusy}
            onClick={() => onFeedback("not-interested")}
          >
            {tFeedback("notInterested")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={feedbackBusy}
            onClick={() => onFeedback("agency-scam")}
          >
            {tFeedback("agencyScam")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={feedbackBusy}
            onClick={() => onFeedback("applied")}
          >
            {tFeedback("applied")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function InboxEmptyState({
  cnCaptureFirst = false,
  cnRemoteFirst = false,
  remoteFirst = false,
}: {
  cnCaptureFirst?: boolean;
  cnRemoteFirst?: boolean;
  remoteFirst?: boolean;
}) {
  const { t } = useTranslations("inbox");
  const { t: tMarket } = useTranslations("inbox.marketplace");

  const title = cnCaptureFirst
    ? t("empty.cnTitle")
    : cnRemoteFirst || remoteFirst
      ? t("empty.remoteTitle")
      : t("empty.title");
  const description = cnCaptureFirst
    ? t("empty.cnDescription")
    : cnRemoteFirst || remoteFirst
      ? t("empty.remoteDescription")
      : t("empty.description");

  return (
    <PageEmpty
      icon={Briefcase}
      title={title}
      description={description}
      action={
        cnCaptureFirst ? undefined : (
          <Link href="/settings" className={buttonVariants()}>
            {tMarket("emptyCta")}
          </Link>
        )
      }
    />
  );
}

export function InboxJobCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-0">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}
