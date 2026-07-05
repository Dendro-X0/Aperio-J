"use client";

import { useTranslations } from "@/i18n/provider";

export function SkipToContent() {
  const { t } = useTranslations("shell");

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("skipToContent")}
    </a>
  );
}
