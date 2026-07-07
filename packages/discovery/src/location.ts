import type { EngineLocale, RemotePreference } from "@aperio-j/core";
import { cityMatchTerms, createEngineTranslator, displayCityLabel, resolveEngineLocale } from "@aperio-j/core";
import { isChinaCityProfile } from "@aperio-j/probe";

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
  /招聘|工作|岗位|公司|要求|经验|负责|管理|操作|检验|测试|老化|包装|组装|管理员|员|工程师|普工|电子厂|过于频繁|访问|配送|骑手/;

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
  if (cities.length === 0) return false;
  return isChinaCityProfile(cities[0]!, cities.slice(1));
}

function isForeignCountryForProfile(locationText: string, cities: string[]): boolean {
  if (!profileHasCjkCity(cities)) return false;
  if (corpusMatchesCity(locationText, cities)) return false;
  return FOREIGN_COUNTRY_LOCATION.test(locationText);
}

const VAGUE_LOCATION = /^(?:不限|全国|面议|就近|各地|省内|周边城市?|证码校验|验证码|访问过于频繁)$/;

const INVALID_LOCATION_FRAGMENT = /证码|验证码|校验|过于频繁|访问限制/;

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
    for (const term of cityMatchTerms(hint)) {
      const key = normalizeCityKey(term);
      if (!key || key.length < 2) continue;

      const districtRe = new RegExp(
        `${escapeRegExp(key)}(?:市|省)?([\\u4e00-\\u9fff]{2,8}(?:区|县|镇|街道|新区))?`,
        "i",
      );
      const match = text.match(districtRe);
      if (match?.[0]) return match[0].trim();

      if (text.toLowerCase().includes(key)) {
        return displayCityLabel(hint, "zh-CN");
      }
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

function sanitizeExtractedLocation(value: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (VAGUE_LOCATION.test(trimmed)) return null;
  if (INVALID_LOCATION_FRAGMENT.test(trimmed)) return null;
  return trimmed;
}

/** Extract a human-readable location string from listing text. */
export function extractLocationText(text: string, cityHints: string[] = []): string | null {
  const labelMatch = text.match(LOCATION_LABEL);
  if (labelMatch?.[1]) {
    const labeled = sanitizeExtractedLocation(labelMatch[1].trim());
    if (labeled) return labeled;
  }

  const englishLabel = extractEnglishLocationLabel(text);
  if (englishLabel) {
    const labeled = sanitizeExtractedLocation(englishLabel);
    if (labeled) return labeled;
  }

  const fromHints = extractFromCityHint(text, cityHints);
  if (fromHints) {
    const labeled = sanitizeExtractedLocation(fromHints);
    if (labeled) return labeled;
  }

  const provinceCity = text.match(PROVINCE_CITY);
  if (provinceCity?.[1]) {
    const labeled = sanitizeExtractedLocation(provinceCity[1].trim());
    if (labeled) return labeled;
  }

  const cityMatches = [...text.matchAll(CITY_WITH_SUFFIX)];
  if (cityMatches.length > 0) {
    const labeled = sanitizeExtractedLocation(cityMatches[0]![0].trim());
    if (labeled) return labeled;
  }

  const special = extractSpecialRegion(text);
  if (special) {
    const labeled = sanitizeExtractedLocation(special);
    if (labeled) return labeled;
  }

  const compact = firstValidCompactLocation(text);
  if (compact) {
    const labeled = sanitizeExtractedLocation(compact);
    if (labeled) return labeled;
  }

  if (corpusClaimsRemoteWork(text)) return "远程";

  if (cityHints.length > 0) {
    const hint = cityHints.map((value) => value.trim()).find(Boolean);
    if (hint) return displayCityLabel(hint, "zh-CN");
  }

  return null;
}

const URL_HOST_CITY: Array<{ pattern: RegExp; city: string }> = [
  { pattern: /^sz\.58\.com$/i, city: "深圳" },
  { pattern: /^shenzhen\./i, city: "深圳" },
  { pattern: /^shenzhen\.zhaopin\.com$/i, city: "深圳" },
];

/** Infer profile city from city-scoped board URLs when listing text omits location. */
export function inferCityHintFromListingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    for (const rule of URL_HOST_CITY) {
      if (rule.pattern.test(host)) return rule.city;
    }

    if (/zhipin\.com$/i.test(host) && /\/shenzhen(?:\/|$)/i.test(path)) return "深圳";
    if (/51job\.com$/i.test(host) && /\/jobs\/shenzhen(?:\/|$)/i.test(path)) return "深圳";

    const zhaopinSub = host.match(/^([a-z0-9-]+)\.zhaopin\.com$/i);
    if (zhaopinSub?.[1] && !["www", "m", "api"].includes(zhaopinSub[1])) {
      const slug = zhaopinSub[1];
      if (slug === "shenzhen") return "深圳";
    }
  } catch {
    return null;
  }

  return null;
}

export function corpusMatchesCity(corpus: string, cities: string[]): boolean {
  const lower = corpus.toLowerCase();
  const terms = new Set<string>();

  for (const city of cities) {
    for (const term of cityMatchTerms(city)) {
      if (!term || term.length < 2) continue;
      terms.add(term);
      if (/[\u4e00-\u9fff]/.test(term)) {
        terms.add(`${term}市`);
        terms.add(`${term}省`);
      }
    }
  }

  return [...terms].some((key) => lower.includes(key));
}

function normalizeDistrictKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ");
}

export function corpusMatchesDistrict(corpus: string, districts: string[]): boolean {
  const lower = normalizeDistrictKey(corpus);
  if (!lower) return false;

  return districts.some((district) => {
    const normalized = normalizeDistrictKey(district);
    if (!normalized || normalized.length < 2) return false;
    return lower.includes(normalized);
  });
}

export function locationMatchesProfile(
  profile: {
    primaryCity: string;
    acceptableCities: string[];
    preferredDistricts?: string[];
    remotePreference: RemotePreference;
  },
  locationText: string | null,
  corpus?: string,
): boolean {
  const cities = [profile.primaryCity, ...profile.acceptableCities].filter(Boolean);
  const districts = (profile.preferredDistricts ?? []).filter(Boolean);
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
    if (districts.length > 0 && corpusMatchesDistrict(locationText, districts)) return true;
    if (corpusMatchesCity(locationText, cities)) return true;
  }

  if (searchable && corpusClaimsRemoteWork(searchable)) {
    return profile.remotePreference !== "onsite-only";
  }

  if (searchable && corpusMatchesCity(searchable, cities)) {
    return true;
  }

  if (searchable && districts.length > 0 && corpusMatchesDistrict(searchable, districts)) {
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
