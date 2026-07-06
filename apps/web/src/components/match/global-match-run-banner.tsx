"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n/provider";
import { EngineActivityPanel } from "@/components/engine/engine-activity-panel";
import { useMatchRun } from "@/components/match/match-run-provider";
import { Button } from "@/components/ui/button";

export function GlobalMatchRunBanner() {
  const pathname = usePathname();
  const { t } = useTranslations("shell.matchRun");
  const { status, phase, phaseDetail, result, error, cancel, dismiss, isRunning } = useMatchRun();

  const onInbox = pathname === "/inbox" || pathname.startsWith("/inbox/");

  if (status === "idle") return null;
  if (isRunning && onInbox) return null;

  if (isRunning) {
    return (
      <div className="shrink-0 border-b border-primary/20 bg-background px-4 py-2">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <EngineActivityPanel
            phase={phase}
            detail={phaseDetail}
            namespace="engine.match"
            className="flex-1 border-0 bg-transparent"
          />
          <div className="flex shrink-0 gap-2 self-end sm:self-center">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/inbox" />}>
              {t("viewInbox")}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "completed" && result && !onInbox) {
    return (
      <div className="shrink-0 border-b border-primary/20 bg-primary/5 px-4 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            {t("completed", {
              matched: result.matchedCount,
              total: result.opportunityCount,
            })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" nativeButton={false} render={<Link href="/inbox" />}>
              {t("viewInbox")}
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              {t("dismiss")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            {t("dismiss")}
          </Button>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="shrink-0 border-b px-4 py-2 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <p>{t("cancelled")}</p>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            {t("dismiss")}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
