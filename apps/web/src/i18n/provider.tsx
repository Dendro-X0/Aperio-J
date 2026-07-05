"use client";

import { createContext, useContext, useMemo } from "react";
import type { Messages } from "./messages/zh-CN";
import {
  createTranslator,
  listSeparator,
  localeToDateLocale,
  type Locale,
  type TranslationParams,
} from "./translate";

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: string, params?: TranslationParams) => string;
  dateLocale: string;
  listSeparator: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      messages,
      t: createTranslator(messages),
      dateLocale: localeToDateLocale(locale),
      listSeparator: listSeparator(locale),
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function useTranslations(namespace?: string) {
  const { t, ...rest } = useI18n();

  return {
    ...rest,
    t: (key: string, params?: TranslationParams) =>
      t(namespace ? `${namespace}.${key}` : key, params),
  };
}
