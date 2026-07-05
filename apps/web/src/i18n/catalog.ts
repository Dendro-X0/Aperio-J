import { messages as en } from "./messages/en";
import { messages as es } from "./messages/es";
import { messages as zhCN } from "./messages/zh-CN";
import type { Locale } from "./translate";

const catalogs = {
  "zh-CN": zhCN,
  en,
  es,
} as const;

export function getMessages(locale: Locale) {
  return catalogs[locale];
}
