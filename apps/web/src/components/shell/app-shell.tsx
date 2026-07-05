"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar, type ShellStats } from "@/components/shell/app-topbar";
import { DesktopTitlebar } from "@/components/shell/desktop-titlebar";
import { SkipToContent } from "@/components/shell/skip-to-content";

export interface AppShellProfileSummary {
  city: string;
  industries?: string[];
  roles: string[];
}

export function AppShell({
  children,
  profileSummary,
  stats,
  primaryAction,
}: {
  children: React.ReactNode;
  profileSummary?: AppShellProfileSummary;
  stats?: ShellStats;
  primaryAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <DesktopTitlebar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SkipToContent />
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppTopbar
            pathname={pathname}
            profileSummary={profileSummary}
            stats={stats}
            mobileOpen={mobileOpen}
            onOpenMobileMenu={() => setMobileOpen(true)}
            primaryAction={primaryAction}
          />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto outline-none"
          >
            <div className="mx-auto w-full max-w-7xl px-4 py-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
