export type EngineLocale = "zh-CN" | "en" | "es";

export const DEFAULT_ENGINE_LOCALE: EngineLocale = "en";

export interface EngineCatalogMeta {
  locale: string;
  version: string;
}

export interface EngineCatalog {
  meta: EngineCatalogMeta;
  listSeparator: string;
  sentenceSeparator: string;
  explanationSuffix: string;
  cautionSeparator: string;
  redFlags: Record<string, string>;
  matcher: {
    exclusion: Record<string, string>;
    notRecommended: string;
    explanation: Record<string, string>;
    caution: Record<string, string>;
  };
}

export interface EngineTranslator {
  locale: EngineLocale;
  catalog: EngineCatalog;
  t: (key: string, params?: Record<string, string | number>) => string;
  joinList: (items: string[]) => string;
}
