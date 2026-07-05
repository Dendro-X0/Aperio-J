import { cookies, headers } from "next/headers";
import { getMessages } from "./catalog";
import {
  createTranslator,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localeToDateLocale,
  localeToHtmlLang,
  parseAcceptLanguage,
  resolveLocale,
  resolveLocaleFromPreferences,
  type Locale,
} from "./translate";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie) return resolveLocale(fromCookie);

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    return resolveLocaleFromPreferences(parseAcceptLanguage(acceptLanguage));
  }

  return DEFAULT_LOCALE;
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    messages: getMessages(locale),
    t: createTranslator(getMessages(locale)),
    dateLocale: localeToDateLocale(locale),
    htmlLang: localeToHtmlLang(locale),
  };
}
