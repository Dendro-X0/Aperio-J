"use client";

import { matchScoreTier } from "@/lib/match-score";
import { cn } from "@/lib/utils";

const tierClassName: Record<
  ReturnType<typeof matchScoreTier>,
  string
> = {
  strong: "border-primary/40 bg-primary/10 text-primary",
  fair: "border-primary/25 bg-primary/5 text-primary",
  broad: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
  weak: "border-border/50 bg-muted/20 text-muted-foreground/75",
};

const tierLabelClassName: Record<ReturnType<typeof matchScoreTier>, string> = {
  strong: "opacity-90",
  fair: "opacity-90",
  broad: "opacity-75",
  weak: "opacity-70",
};

export function MatchScorePill({
  score,
  tierLabel,
  muted = false,
  ariaLabel,
  size = "sm",
}: {
  score: number;
  tierLabel: string;
  muted?: boolean;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  const tier = matchScoreTier(score);
  const subdued = tier === "broad" || tier === "weak";

  return (
    <span
      className={cn(
        "inline-flex max-w-[6.5rem] shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 tabular-nums",
        size === "md" ? "px-2.5 py-1" : "px-2 py-0.5",
        subdued && !muted && "opacity-85",
        muted
          ? "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
          : tierClassName[tier],
      )}
      aria-label={ariaLabel}
    >
      <span className={cn("shrink-0 font-bold leading-none", size === "md" ? "text-base" : "text-xs", subdued && "font-semibold")}>
        {score}
      </span>
      <span className="h-3 w-px shrink-0 bg-current opacity-25" aria-hidden />
      <span
        className={cn(
          "min-w-0 truncate font-medium uppercase leading-none tracking-wide",
          size === "md" ? "text-[10px]" : "text-[9px]",
          tierLabelClassName[tier],
        )}
      >
        {tierLabel}
      </span>
    </span>
  );
}
