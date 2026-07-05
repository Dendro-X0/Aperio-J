"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { InboxItem } from "@/lib/match-service";
import { cautionsForCard } from "@/lib/card-cautions";
import {
  bodyExcerpt,
  displayLocationText,
  displayTaxonomyLabel,
  sanitizeDisplayText,
  taxonomyTagsForCard,
} from "@/lib/display-localize";
import { MatchScorePill } from "@/components/inbox/match-score-pill";
import { matchScoreTier, matchScoreTierLabelKey } from "@/lib/match-score";
import { useI18n, useTranslations } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InboxJobGridCard({
  item,
  muted = false,
  remoteOnly = false,
}: {
  item: InboxItem;
  muted?: boolean;
  remoteOnly?: boolean;
}) {
  const { locale } = useI18n();
  const { t: tEnums } = useTranslations("enums");
  const { t: tCard } = useTranslations("inbox.card");
  const { t: tDetail } = useTranslations("inbox.detail");

  const { opportunity, match, source } = item;
  const title = sanitizeDisplayText(opportunity.title, { maxLength: 120 }) || opportunity.title;
  const excerpt = bodyExcerpt(opportunity.body, opportunity.title);
  const taxonomyTags = taxonomyTagsForCard(
    opportunity.taxonomyRefs ?? match.taxonomyHits ?? [],
    { remoteOnly, limit: 3 },
  );
  const href = `/inbox/${encodeURIComponent(opportunity.id)}`;
  const score = match.breakdown.finalScore;
  const tierLabel = tCard(matchScoreTierLabelKey(matchScoreTier(score)));
  const cardCautions = cautionsForCard(item);
  const locationLabel = displayLocationText(opportunity.locationText, locale, { remoteOnly });

  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={tDetail("openDetail", { title })}
    >
      <Card
        className={cn(
          "h-full transition-shadow motion-safe:hover:shadow-md",
          muted && "opacity-80",
        )}
      >
        <CardContent className="flex h-full flex-col gap-2 pt-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-2 text-sm font-semibold leading-snug">
              {title}
            </h2>
            <MatchScorePill
              score={score}
              muted={muted}
              tierLabel={tierLabel}
              ariaLabel={`${tCard("matchScore", { score })} — ${tierLabel}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {locationLabel && (
              <Badge variant="outline" className="text-[10px]">
                {locationLabel}
              </Badge>
            )}
            {taxonomyTags.map((ref) => (
              <Badge key={ref.id} variant="secondary" className="text-[10px]">
                {displayTaxonomyLabel(ref, locale)}
              </Badge>
            ))}
          </div>

          {excerpt && (
            <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}

          {cardCautions.length > 0 && (
            <p className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">
                {cardCautions[0]}
                {cardCautions.length > 1 &&
                  tCard("cautionMore", { count: cardCautions.length - 1 })}
              </span>
            </p>
          )}

          {source && (
            <p className="truncate text-[11px] text-muted-foreground">
              {source.kind === "capture"
                ? tEnums("streamKind.capture")
                : source.label}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function InboxJobGridSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 pt-0">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-6 w-[4.5rem] shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}
