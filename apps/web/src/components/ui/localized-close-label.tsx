"use client";

import { useTranslations } from "@/i18n/provider";

export function LocalizedCloseLabel() {
  const { t } = useTranslations("common");
  return <span className="sr-only">{t("close")}</span>;
}
