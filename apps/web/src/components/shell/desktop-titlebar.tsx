"use client";

import { useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";
import { AperioLogo } from "@/components/brand/aperio-logo";
import { isDesktopShell } from "@/lib/desktop-shell";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type WindowApi = typeof import("@tauri-apps/api/window");

async function loadWindowApi(): Promise<WindowApi | null> {
  if (!isDesktopShell()) {
    return null;
  }

  try {
    return await import("@tauri-apps/api/window");
  } catch {
    return null;
  }
}

function TitlebarButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-10 items-center justify-center text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "[-webkit-app-region:no-drag] [app-region:no-drag]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DesktopTitlebar() {
  const { t: tApp } = useTranslations("app");
  const { t } = useTranslations("shell");
  const [isDesktop, setIsDesktop] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const desktop = isDesktopShell();
    setIsDesktop(desktop);
    if (!desktop) {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const windowApi = await loadWindowApi();
      if (!windowApi || cancelled) {
        return;
      }

      const appWindow = windowApi.getCurrentWindow();
      setMaximized(await appWindow.isMaximized());

      unlisten = await appWindow.onResized(async () => {
        setMaximized(await appWindow.isMaximized());
      });
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  if (!isDesktop) {
    return null;
  }

  async function withWindow(action: (windowApi: WindowApi) => Promise<void>) {
    const windowApi = await loadWindowApi();
    if (!windowApi) {
      return;
    }
    await action(windowApi);
  }

  return (
    <div
      className={cn(
        "desktop-titlebar flex h-[var(--titlebar-height)] shrink-0 items-stretch border-b border-border bg-background/95 backdrop-blur-sm",
        "select-none",
      )}
    >
      <div
        data-tauri-drag-region
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 px-3",
          "[-webkit-app-region:drag] [app-region:drag]",
        )}
      >
        <AperioLogo size={20} title={tApp("name")} />
        <span className="truncate text-sm font-semibold tracking-tight text-foreground">
          {tApp("name")}
        </span>
      </div>

      <div className="flex shrink-0 items-stretch [-webkit-app-region:no-drag] [app-region:no-drag]">
        <TitlebarButton
          label={t("windowMinimize")}
          onClick={() => void withWindow(async (api) => api.getCurrentWindow().minimize())}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </TitlebarButton>
        <TitlebarButton
          label={maximized ? t("windowRestore") : t("windowMaximize")}
          onClick={() =>
            void withWindow(async (api) => {
              await api.getCurrentWindow().toggleMaximize();
              setMaximized(await api.getCurrentWindow().isMaximized());
            })
          }
        >
          <Square className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        </TitlebarButton>
        <TitlebarButton
          label={t("windowClose")}
          className="hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => void withWindow(async (api) => api.getCurrentWindow().close())}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </TitlebarButton>
      </div>
    </div>
  );
}
