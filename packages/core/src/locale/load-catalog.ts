import type { EngineCatalog, EngineLocale } from "./types.js";
import { DEFAULT_ENGINE_LOCALE } from "./types.js";
import zhCN from "../catalogs/locales/zh-CN.json" with { type: "json" };
import en from "../catalogs/locales/en.json" with { type: "json" };
import es from "../catalogs/locales/es.json" with { type: "json" };

const CATALOGS: Record<EngineLocale, EngineCatalog> = {
  "zh-CN": zhCN as EngineCatalog,
  en: en as EngineCatalog,
  es: es as EngineCatalog,
};

const catalogCache = new Map<EngineLocale, EngineCatalog>();

export function loadEngineCatalog(locale: EngineLocale): EngineCatalog {
  const cached = catalogCache.get(locale);
  if (cached) return cached;
  const catalog = CATALOGS[locale];
  catalogCache.set(locale, catalog);
  return catalog;
}

export function resolveEngineLocale(input: string | null | undefined): EngineLocale {
  if (!input) return DEFAULT_ENGINE_LOCALE;
  const normalized = input.trim().toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (normalized === "zh-cn" || normalized.startsWith("zh")) return "zh-CN";
  return "en";
}
