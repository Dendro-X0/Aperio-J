import { getServerLocale } from "@/i18n/server";
import { getApiTranslator } from "@/lib/api-i18n";
import { SOURCE_ERROR } from "@/lib/source-registry";

const SERVICE_ERROR_KEYS: Record<string, string> = {
  [SOURCE_ERROR.INVALID_URL_SCHEME]: "api.sourceInvalidUrlScheme",
  [SOURCE_ERROR.VALIDATION_FAILED]: "api.sourceValidationFailed",
  [SOURCE_ERROR.DELETE_NOT_CUSTOM]: "api.sourceDeleteNotCustom",
  [SOURCE_ERROR.SESSION_AUTH_BLOCKED]: "api.sourceSessionAuthBlocked",
  [SOURCE_ERROR.SESSION_AUTH_CUSTOM_ONLY]: "api.sourceSessionAuthCustomOnly",
};

export async function getRequestTranslator() {
  const locale = await getServerLocale();
  return getApiTranslator(locale);
}

export function translateApiError(
  t: (key: string) => string,
  error: unknown,
  fallbackKey: string,
): string {
  if (!(error instanceof Error)) return t(fallbackKey);
  const mapped = SERVICE_ERROR_KEYS[error.message];
  if (mapped) return t(mapped);
  return error.message || t(fallbackKey);
}
