import type { Messages } from "./messages/zh-CN";

export type Locale = "zh-CN" | "en" | "es";

export const LOCALE_COOKIE = "aperio_j_locale";
export const DEFAULT_LOCALE: Locale = "zh-CN";
export const SUPPORTED_LOCALES: Locale[] = ["zh-CN", "en", "es"];

export type TranslationParams = Record<string, string | number>;

function getNestedValue(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    token in params ? String(params[token]) : `{${token}}`,
  );
}

export function createTranslator(messages: Messages) {
  return function t(key: string, params?: TranslationParams): string {
    const value = getNestedValue(messages, key);
    if (!value) return key;
    return interpolate(value, params);
  };
}

export function resolveLocale(input?: string | null): Locale {
  const matched = matchSupportedLocale(input);
  return matched ?? DEFAULT_LOCALE;
}

export function matchSupportedLocale(input?: string | null): Locale | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "zh-cn" || normalized === "zh") return "zh-CN";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  return null;
}

export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      let q = 1;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key === "q" && value) {
          const parsed = Number.parseFloat(value);
          if (Number.isFinite(parsed)) q = parsed;
        }
      }
      return { tag: tag?.trim() ?? "", q };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

export function resolveLocaleFromPreferences(
  preferences: readonly (string | null | undefined)[],
): Locale {
  for (const preference of preferences) {
    const matched = matchSupportedLocale(preference);
    if (matched) return matched;
  }
  return DEFAULT_LOCALE;
}

export function localeToHtmlLang(locale: Locale): string {
  return locale;
}

export function localeToDateLocale(locale: Locale): string {
  if (locale === "en") return "en-US";
  if (locale === "es") return "es-ES";
  return "zh-CN";
}

export function listSeparator(locale: Locale): string {
  if (locale === "zh-CN") return "、";
  return ", ";
}
