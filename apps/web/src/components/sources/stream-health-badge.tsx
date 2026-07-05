"use client";

import { useTranslations } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  stale: "bg-amber-500",
  dead: "bg-destructive",
  unknown: "bg-muted-foreground",
};

export function StreamHealthBadge({ health }: { health: string }) {
  const { t: tEnums } = useTranslations("enums");
  const label =
    tEnums(`streamHealth.${health}` as "streamHealth.healthy") ?? health;

  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", HEALTH_DOT[health] ?? HEALTH_DOT.unknown)}
        aria-hidden
      />
      {label}
    </Badge>
  );
}
