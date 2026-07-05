"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ProfileContextBar } from "@/components/shell/profile-context-bar";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export interface ShellStats {
  streamCount?: number;
  matchedCount?: number;
}

function breadcrumbForPath(pathname: string, t: (key: string) => string): { section: string; page: string } {
  if (pathname.startsWith("/inbox/") && pathname !== "/inbox") {
    return { section: t("groups.discover"), page: t("pages.inboxDetail") };
  }
  if (pathname.startsWith("/sources")) {
    return { section: t("groups.discover"), page: t("pages.sources") };
  }
  if (pathname.startsWith("/settings")) {
    return { section: t("groups.mine"), page: t("pages.settings") };
  }
  return { section: t("groups.discover"), page: t("pages.inbox") };
}

export function AppTopbar({
  pathname,
  profileSummary,
  stats,
  mobileOpen,
  onOpenMobileMenu,
  primaryAction,
}: {
  pathname: string;
  profileSummary?: { city: string; industries?: string[]; roles: string[] };
  stats?: ShellStats;
  mobileOpen?: boolean;
  onOpenMobileMenu: () => void;
  primaryAction?: React.ReactNode;
}) {
  const { t } = useTranslations("shell");
  const crumb = breadcrumbForPath(pathname, t);

  return (
    <header className="z-30 shrink-0 border-b border-border bg-background px-4 py-2">
      <div className="flex min-h-[calc(var(--header-height)-1rem)] flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          onClick={onOpenMobileMenu}
          aria-label={t("openMenu")}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-sheet"
        >
          <Menu className="h-4 w-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <nav aria-label={t("breadcrumbLabel")} className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{crumb.section}</span>
            <span className="text-muted-foreground" aria-hidden>
              /
            </span>
            <span className="truncate font-medium text-foreground">{crumb.page}</span>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats?.streamCount !== undefined && (
            <Link href="/sources" title={t("stats.streamsTooltip")}>
              <Badge variant="outline" className="shrink-0 transition-colors hover:bg-muted">
                {t("stats.streams", { count: stats.streamCount })}
              </Badge>
            </Link>
          )}
          {stats?.matchedCount !== undefined && (
            <Badge variant="outline" className="shrink-0">
              {t("stats.matches", { count: stats.matchedCount })}
            </Badge>
          )}
          {primaryAction}
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {profileSummary && (
        <ProfileContextBar
          summary={profileSummary}
          compact
          className={cn(
            "mt-2 w-full",
            pathname.startsWith("/settings")
              ? "hidden"
              : pathname === "/inbox" || pathname.startsWith("/inbox/")
                ? "hidden md:flex"
                : undefined,
          )}
        />
      )}
    </header>
  );
}
