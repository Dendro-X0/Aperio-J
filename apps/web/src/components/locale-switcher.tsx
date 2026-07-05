"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "@/i18n/translate";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: Locale; labelKey: "locale.zhCN" | "locale.en" | "locale.es" }[] = [
  { value: "zh-CN", labelKey: "locale.zhCN" },
  { value: "en", labelKey: "locale.en" },
  { value: "es", labelKey: "locale.es" },
];

export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();

  const current =
    OPTIONS.find((option) => option.value === locale) ?? OPTIONS[0];

  function setLocale(next: Locale) {
    if (next === locale || !SUPPORTED_LOCALES.includes(next)) return;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs font-normal"
            aria-label={t("locale.label")}
          />
        }
      >
        <Languages className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="max-w-[5rem] truncate">{t(current.labelKey)}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setLocale(option.value)}>
            <span className="flex-1">{t(option.labelKey)}</span>
            {locale === option.value && <Check className="h-4 w-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
