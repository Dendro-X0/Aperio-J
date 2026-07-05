import type { EngineLocale, RemotePreference } from "@aperio-j/core";
import { createEngineTranslator, resolveEngineLocale } from "@aperio-j/core";

export const REMOTE_LOCATION_PATTERN = /(?:remote|远程|在家办公|居家办公|线上办公|work from home)/i;

const EXPLICIT_REMOTE_PATTERN =
  /(?:\b(?:fully|100%)\s+remote\b|\bremote\s+(?:position|role|job|work|opportunity|ok|friendly|first)\b|\bwork\s+(?:from\s+home|remotely)\b|(?:^|[\s:：])远程(?:办公|工作)?(?:[\s,.;:，。；]|$)|居家办公|在家办公|可远程|支持远程)/i;

const REMOTE_NEGATION_PATTERN =
  /(?:\bno\s+remote\b|\bnot\s+(?:a\s+)?remote\b|\bon[-\s]?site\s+(?:only|required|mandatory)\b|\bin[-\s]?office\b|\bmust\s+(?:be\s+)?(?:located|based)\b)/i;

const ENGLISH_LOCATION_LABEL =
  /(?:headquarters?|(?:work\s+)?location|office(?:\s+location)?|based\s+in|workplace)[:：]\s*([^\n]{2,80})/i;

const LOCATION_LABEL =
  /(?:工作(?:地点|地|城市|区域)|上班地点|任职地点|办公地点|地点)[:：\s]+([^\n，,。；;]{2,40})/;

const CITY_WITH_SUFFIX =
  /([\u4e00-\u9fff]{2,8}市)(?:[\u4e00-\u9fff]{2,6}(?:区|县|镇|街道|新区|开发区))?/g;

const COMPACT_CITY_DISTRICT =
  /([\u4e00-\u9fff]{2,4}[\u4e00-\u9fff]{2,4}(?:区|县|镇|街道|新区)?)/g;

const COMPACT_NOISE =
  /招聘|工作|岗位|公司|要求|经验|负责|管理|操作|检验|测试|老化|包装|组装|管理员|员|工程师/;

function firstValidCompactLocation(text: string): string | null {
  for (const match of text.matchAll(COMPACT_CITY_DISTRICT)) {
    const candidate = match[1]?.trim();
    if (!candidate || COMPACT_NOISE.test(candidate)) continue;
    if (candidate.length > 12) continue;
    return candidate;
  }
  return null;
}

function extractSpecialRegion(text: string): string | null {
  for (const region of SPECIAL_REGIONS) {
    if (!text.includes(region)) continue;
    const districtMatch = text.match(
      new RegExp(`${escapeRegExp(region)}[\\u4e00-\\u9fff]{0,6}(?:区|县|镇|街道|新区)?`),
    );
    return districtMatch?.[0]?.trim() ?? region;
  }
  return null;
}

const PROVINCE_CITY = /([\u4e00-\u9fff]{2,8}省[\u4e00-\u9fff]{2,8}市)/;

const SPECIAL_REGIONS = [
  "香港",
  "澳门",
  "台北",
  "新北",
  "高雄",
  "台中",
  "深圳",
  "杭州",
  "宁波",
  "温州",
  "苏州",
  "南京",
  "武汉",
  "成都",
  "重庆",
  "西安",
  "青岛",
  "天津",
  "北京",
  "上海",
];

const BROAD_REMOTE_LOCATION =
  /^(?:worldwide|global|anywhere|various(?: locations)?|multiple (?:countries|locations)|international|emea|apac|americas|europe|asia|africa|oceania|latam|latin america|north america|south america)$/i;

const FOREIGN_COUNTRY_LOCATION =
  /\b(?:germany|france|united states|usa|u\.s\.a\.|uk|united kingdom|canada|australia|brazil|india|ukraine|algeria|austria|bahrain|poland|mexico|spain|italy|netherlands|sweden|norway|denmark|finland|ireland|portugal|belgium|switzerland|romania|hungary|czech(?: republic)?|israel|turkey|egypt|south africa|new zealand|singapore|japan|south korea|korea|taiwan|hong kong|malaysia|indonesia|philippines|thailand|vietnam)\b/i;

/** True when a location string is a broad remote region, not a specific city. */
export function isBroadRemoteLocation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (BROAD_REMOTE_LOCATION.test(trimmed)) return true;

  const parts = trimmed
    .split(/[,，、/]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3 && !parts.some((part) => /[\u4e00-\u9fff]/.test(part))) {
    return true;
  }

  return false;
}

function profileHasCjkCity(cities: string[]): boolean {
  return cities.some((city) => /[\u4e00-\u9fff]/.test(city));
}

function isForeignCountryForProfile(locationText: string, cities: string[]): boolean {
  if (!profileHasCjkCity(cities)) return false;
  if (corpusMatchesCity(locationText, cities)) return false;
  return FOREIGN_COUNTRY_LOCATION.test(locationText);
}

const VAGUE_LOCATION = /^(?:不限|全国|面议|就近|各地|省内|周边城市?)$/;

export function normalizeCityKey(city: string): string {
  return city
    .trim()
    .replace(/(?:市|省|自治区|特别行政区)$/g, "")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractFromCityHint(text: string, cityHints: string[]): string | null {
  for (const hint of cityHints) {
    const key = normalizeCityKey(hint);
    if (!key || key.length < 2) continue;

    const districtRe = new RegExp(
      `${escapeRegExp(key)}(?:市|省)?([\\u4e00-\\u9fff]{2,8}(?:区|县|镇|街道|新区))?`,
      "i",
    );
    const match = text.match(districtRe);
    if (match?.[0]) return match[0].trim();

    if (text.toLowerCase().includes(key)) {
      return hint.trim();
    }
  }
  return null;
}

function extractEnglishLocationLabel(text: string): string | null {
  const match = text.match(ENGLISH_LOCATION_LABEL);
  if (!match?.[1]) return null;

  const labeled = match[1].trim().replace(/\s+/g, " ");
  if (!labeled || /^(?:remote|n\/a|tbd|various|worldwide)$/i.test(labeled)) return null;
  return labeled;
}

/** True when listing text explicitly claims a remote work arrangement. */
export function corpusClaimsRemoteWork(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (REMOTE_NEGATION_PATTERN.test(text)) return false;
  if (/^(?:remote|远程|work from home|居家办公|在家办公|线上办公)$/i.test(trimmed)) {
    return true;
  }
  return EXPLICIT_REMOTE_PATTERN.test(text);
}

/** Extract a human-readable location string from listing text. */
export function extractLocationText(text: string, cityHints: string[] = []): string | null {
  const labelMatch = text.match(LOCATION_LABEL);
  if (labelMatch?.[1]) {
    const labeled = labelMatch[1].trim();
    if (!VAGUE_LOCATION.test(labeled)) return labeled;
  }

  const englishLabel = extractEnglishLocationLabel(text);
  if (englishLabel) return englishLabel;

  const fromHints = extractFromCityHint(text, cityHints);
  if (fromHints) return fromHints;

  const provinceCity = text.match(PROVINCE_CITY);
  if (provinceCity?.[1]) return provinceCity[1].trim();

  const cityMatches = [...text.matchAll(CITY_WITH_SUFFIX)];
  if (cityMatches.length > 0) {
    return cityMatches[0]![0].trim();
  }

  const special = extractSpecialRegion(text);
  if (special) return special;

  const compact = firstValidCompactLocation(text);
  if (compact) return compact;

  if (corpusClaimsRemoteWork(text)) return "远程";

  return null;
}

export function corpusMatchesCity(corpus: string, cities: string[]): boolean {
  const lower = corpus.toLowerCase();

  return cities.some((city) => {
    const key = normalizeCityKey(city);
    if (!key || key.length < 2) return false;
    return lower.includes(key) || lower.includes(`${key}市`) || lower.includes(`${key}省`);
  });
}

export function locationMatchesProfile(
  profile: {
    primaryCity: string;
    acceptableCities: string[];
    remotePreference: RemotePreference;
  },
  locationText: string | null,
  corpus?: string,
): boolean {
  const cities = [profile.primaryCity, ...profile.acceptableCities].filter(Boolean);
  const searchable = corpus?.toLowerCase() ?? "";

  if (cities.length === 0) {
    if (locationText && corpusClaimsRemoteWork(locationText)) return true;
    if (searchable && corpusClaimsRemoteWork(searchable)) return true;
    if (locationText) return false;
    return true;
  }

  if (locationText) {
    if (isBroadRemoteLocation(locationText)) {
      return profile.remotePreference !== "onsite-only";
    }
    if (
      corpusClaimsRemoteWork(locationText) ||
      (searchable && corpusClaimsRemoteWork(searchable))
    ) {
      return profile.remotePreference !== "onsite-only";
    }
    if (isForeignCountryForProfile(locationText, cities)) return false;
    if (corpusMatchesCity(locationText, cities)) return true;
  }

  if (searchable && corpusClaimsRemoteWork(searchable)) {
    return profile.remotePreference !== "onsite-only";
  }

  if (searchable && corpusMatchesCity(searchable, cities)) {
    return true;
  }

  if (!locationText) {
    if (searchable && isBroadRemoteLocation(searchable)) {
      return profile.remotePreference !== "onsite-only";
    }
    if (searchable && isForeignCountryForProfile(searchable, cities)) return false;
    if (profileHasCjkCity(cities) && profile.remotePreference !== "onsite-only") {
      return true;
    }
    return profile.remotePreference === "remote-only";
  }

  return false;
}

/** Localize canonical location labels (e.g. remote) for display in the active locale. */
export function localizeLocationText(
  locationText: string | null | undefined,
  locale?: EngineLocale | string,
): string | null {
  if (!locationText?.trim()) return null;
  const trimmed = locationText.trim();
  if (REMOTE_LOCATION_PATTERN.test(trimmed)) {
    const resolved = typeof locale === "string" ? resolveEngineLocale(locale) : (locale ?? "zh-CN");
    return createEngineTranslator(resolved).t("common.remoteLocation");
  }
  return trimmed;
}
