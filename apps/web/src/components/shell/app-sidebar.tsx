"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ChevronLeft, ChevronRight, Radio, Settings2 } from "lucide-react";
import { AperioLogo } from "@/components/brand/aperio-logo";
import { cn } from "@/lib/utils";
import { useI18n, useTranslations } from "@/i18n/provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/inbox", key: "inbox", icon: Briefcase, group: "discover" },
  { href: "/sources", key: "sources", icon: Radio, group: "discover" },
  { href: "/settings", key: "settings", icon: Settings2, group: "mine" },
] as const;

function SidebarNav({
  collapsed,
  onNavigate,
  onToggleCollapsed,
  showCollapseControl,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
  showCollapseControl?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useTranslations("shell");
  const { t: tApp } = useTranslations("app");

  const groups = [
    { id: "discover", label: t("groups.discover") },
    { id: "mine", label: t("groups.mine") },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-[var(--header-height)] shrink-0 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "gap-2 px-4",
        )}
      >
        <AperioLogo size={32} title={tApp("name")} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tApp("name")}</p>
            <p className="truncate text-xs text-muted-foreground">{tApp("tagline")}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-2" aria-label={t("navLabel")}>
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group.id);
          return (
            <div key={group.id}>
              {!collapsed && (
                <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        title={collapsed ? t(`pages.${item.key}` as "pages.inbox") : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          collapsed && "justify-center px-2",
                          active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {!collapsed && <span>{t(`pages.${item.key}` as "pages.inbox")}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {showCollapseControl && onToggleCollapsed && (
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed && "justify-center px-2",
            )}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>{t("collapseSidebar")}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslations("shell");

  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col border-r border-border bg-background md:flex",
          collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
        )}
      >
        <SidebarNav
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
          showCollapseControl
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          id="mobile-nav-sheet"
          side="left"
          className="w-[var(--sidebar-width)] gap-0 p-0 sm:max-w-xs"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("navLabel")}</SheetTitle>
          </SheetHeader>
          <SidebarNav collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function useProfileChipLabel(profileSummary?: { city: string; roles: string[] }) {
  const { listSeparator } = useI18n();
  const { t: tCommon } = useTranslations("common");

  if (!profileSummary) return null;
  return `${profileSummary.city}${tCommon("separator")}${profileSummary.roles.join(listSeparator)}`;
}
