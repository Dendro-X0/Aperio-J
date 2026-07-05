import { loadEngineCatalog } from "./load-catalog.js";
import { resolveEngineLocale } from "./load-catalog.js";
import type { EngineLocale, EngineTranslator } from "./types.js";

function getNested(catalog: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = catalog;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? `{${name}}`),
  );
}

export function createEngineTranslator(locale?: EngineLocale | string): EngineTranslator {
  const resolved = typeof locale === "string" ? resolveEngineLocale(locale) : (locale ?? "zh-CN");
  const catalog = loadEngineCatalog(resolved);

  const root = catalog as unknown as Record<string, unknown>;

  return {
    locale: resolved,
    catalog,
    t(key: string, params?: Record<string, string | number>) {
      const template = getNested(root, key);
      if (!template) return key;
      return interpolate(template, params);
    },
    joinList(items: string[]) {
      return items.filter(Boolean).join(catalog.listSeparator);
    },
  };
}
