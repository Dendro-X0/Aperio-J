import {
  inboxFilterPresetLabel,
  INBOX_PRESET_OTHER,
  resolveInboxFilterPresetIds,
} from "@/lib/inbox-filter-presets";

/** Common role aliases users type before picking a catalog label. */
const ROLE_ALIASES: Record<string, string[]> = {
  en: [
    "Frontend",
    "Front-end",
    "Backend",
    "Back-end",
    "Full-stack",
    "Full stack",
    "DevOps",
    "Mobile",
    "QA",
    "Data science",
    "Machine learning",
  ],
  "zh-CN": ["前端", "后端", "全栈", "运维", "移动开发", "测试", "数据", "机器学习"],
};

export function roleSuggestionsForIndustry(industryLabel: string, locale: string): string[] {
  const presetIds = resolveInboxFilterPresetIds(industryLabel);
  const fromTaxonomy = presetIds
    .filter((id) => id !== INBOX_PRESET_OTHER)
    .map((id) => inboxFilterPresetLabel(id, locale))
    .filter((label): label is string => Boolean(label));

  const aliases = ROLE_ALIASES[locale] ?? ROLE_ALIASES.en;
  return [...new Set([...fromTaxonomy, ...aliases])].sort((a, b) =>
    a.localeCompare(b, locale),
  );
}

export function roleSuggestionsForIndustries(industryLabels: string[], locale: string): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const industry of industryLabels) {
    for (const suggestion of roleSuggestionsForIndustry(industry, locale)) {
      const key = suggestion.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(suggestion);
    }
  }

  return merged.sort((a, b) => a.localeCompare(b, locale));
}

export function filterTagSuggestions(
  suggestions: string[],
  query: string,
  selected: string[],
  limit = 8,
): string[] {
  const normalizedSelected = new Set(selected.map((item) => item.toLowerCase()));
  const q = query.trim().toLowerCase();

  return suggestions
    .filter((item) => !normalizedSelected.has(item.toLowerCase()))
    .filter((item) => !q || item.toLowerCase().includes(q))
    .slice(0, limit);
}

export function resolveTagDraft(
  draft: string,
  suggestions: string[],
  selected: string[],
): string | null {
  const trimmed = draft.trim();
  if (!trimmed) return null;

  const normalizedSelected = new Set(selected.map((item) => item.toLowerCase()));
  const exact = suggestions.find((item) => item.toLowerCase() === trimmed.toLowerCase());
  if (exact && !normalizedSelected.has(exact.toLowerCase())) return exact;

  const prefixMatches = suggestions.filter(
    (item) =>
      !normalizedSelected.has(item.toLowerCase()) &&
      item.toLowerCase().startsWith(trimmed.toLowerCase()),
  );
  if (prefixMatches.length === 1) return prefixMatches[0]!;

  if (!normalizedSelected.has(trimmed.toLowerCase())) return trimmed;
  return null;
}
