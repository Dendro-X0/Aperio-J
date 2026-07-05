"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchScorePill } from "@/components/inbox/match-score-pill";
import { cn } from "@/lib/utils";

export function DetailPanel({
  title,
  children,
  className,
  contentClassName,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function ScoreRing({
  score,
  muted,
  size = "lg",
  tierLabel,
  ariaLabel,
}: {
  score: number;
  muted?: boolean;
  size?: "md" | "lg";
  tierLabel: string;
  ariaLabel: string;
}) {
  return (
    <MatchScorePill
      score={score}
      muted={muted}
      tierLabel={tierLabel}
      ariaLabel={ariaLabel}
      size={size === "lg" ? "md" : "sm"}
    />
  );
}

export function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
