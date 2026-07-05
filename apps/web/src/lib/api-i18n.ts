import { getMessages } from "@/i18n/catalog";
import { createTranslator, resolveLocale, type Locale } from "@/i18n/translate";

export function getApiTranslator(localeInput?: string | null) {
  const locale: Locale = resolveLocale(localeInput);
  const messages = getMessages(locale);
  return {
    locale,
    t: createTranslator(messages),
  };
}
