"use client";

import { Loader2, Radar } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function EngineActivityPanel({
  phase,
  detail,
  namespace = "engine.match",
  className,
}: {
  phase: string;
  detail?: string;
  namespace?: "engine.match" | "engine.discover";
  className?: string;
}) {
  const { t } = useTranslations(namespace);

  const label = t(
    `phases.${phase}` as "phases.preparing",
    detail ? { detail, count: detail } : undefined,
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-primary/25 bg-primary/5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative h-1 overflow-hidden bg-primary/10">
        <div className="engine-progress-bar absolute inset-y-0 w-1/3 rounded-full bg-primary/80" />
      </div>

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center">
          <span className="engine-radar-ring absolute inset-0 rounded-full border border-primary/40" />
          <span className="engine-radar-ring engine-radar-ring-delay absolute inset-0 rounded-full border border-primary/25" />
          <Radar className="relative h-4 w-4 text-primary motion-safe:animate-pulse" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
            <span className="truncate">{label}</span>
          </p>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      </div>
    </div>
  );
}
