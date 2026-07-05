import type { EmploymentType } from "@aperio-j/core";

export {
  corpusMatchesCity,
  extractLocationText,
  localizeLocationText,
  locationMatchesProfile,
  normalizeCityKey,
} from "./location.js";

const FULL_TIME = [/全职/, /full[\s-]?time/i, /正式工/];
const PART_TIME = [/兼职/, /part[\s-]?time/i, /小时工/];
const CONTRACT = [/临时工/, /contract/i, /派遣/];

export function classifyEmploymentType(text: string): EmploymentType {
  const full = FULL_TIME.some((pattern) => pattern.test(text));
  const part = PART_TIME.some((pattern) => pattern.test(text));
  const contract = CONTRACT.some((pattern) => pattern.test(text));

  if (full && !part) return "full-time";
  if (part && !full) return "part-time";
  if (contract) return "contract";
  if (full && part) return "unknown";
  return "unknown";
}

export function tokenizeRequirements(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return [...new Set(normalized)];
}
