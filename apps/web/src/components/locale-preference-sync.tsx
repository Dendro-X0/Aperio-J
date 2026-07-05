"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, resolveLocaleFromPreferences } from "@/i18n/translate";
import { useI18n } from "@/i18n/provider";

function hasLocaleCookie(): boolean {
  return document.cookie.split(";").some((part) => part.trim().startsWith(`${LOCALE_COOKIE}=`));
}

export function LocalePreferenceSync() {
  const { locale } = useI18n();
  const router = useRouter();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || hasLocaleCookie()) return;
    synced.current = true;

    const preferred = resolveLocaleFromPreferences(
      typeof navigator !== "undefined" ? navigator.languages : [],
    );
    if (preferred === locale) return;

    document.cookie = `${LOCALE_COOKIE}=${preferred};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }, [locale, router]);

  return null;
}
