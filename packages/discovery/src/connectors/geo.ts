import {
  isAdzunaCountrySupported as coreIsAdzunaCountrySupported,
  resolveAdzunaRoute,
  resolveMetro,
} from "@aperio-j/core";

export const GERMAN_CITY_PATTERN =
  /frankfurt|berlin|munich|hamburg|bonn|cologne|köln|stuttgart|düsseldorf|dusseldorf|leipzig|dresden|hannover|nürnberg|nuremberg|德国|法兰克福|柏林|慕尼黑/i;

const SINGAPORE_CITY_PATTERN = /singapore|新加坡/i;

type CountryRule = { code: string; pattern: RegExp };

/** Legacy regex fallback for free-form cities outside the metro catalog. */
const ADZUNA_CITY_RULES: CountryRule[] = [
  {
    code: "de",
    pattern:
      /frankfurt|berlin|munich|hamburg|bonn|cologne|köln|deutsch|germany|德国|法兰克福|柏林|慕尼黑/i,
  },
  { code: "gb", pattern: /london|manchester|birmingham|edinburgh|glasgow|uk|united kingdom|英国/i },
  {
    code: "us",
    pattern:
      /new york|san francisco|austin|seattle|los angeles|chicago|boston|usa|united states|美国/i,
  },
  { code: "au", pattern: /sydney|melbourne|brisbane|perth|australia|澳大利亚/i },
  { code: "at", pattern: /vienna|wien|graz|salzburg|austria|österreich/i },
  { code: "be", pattern: /brussels|bruxelles|antwerp|ghent|belgium|belgië/i },
  { code: "br", pattern: /s[aã]o paulo|rio de janeiro|brazil|brasil/i },
  {
    code: "ca",
    pattern: /toronto|vancouver|montreal|ottawa|calgary|edmonton|canada/i,
  },
  { code: "ch", pattern: /zurich|zürich|geneva|genève|bern|basel|switzerland|schweiz/i },
  { code: "es", pattern: /madrid|barcelona|valencia|seville|spain|españa/i },
  { code: "fr", pattern: /paris|lyon|marseille|toulouse|nice|france|法国/i },
  {
    code: "in",
    pattern:
      /bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|pune|kolkata|india|印度/i,
  },
  { code: "it", pattern: /milan|milano|rome|roma|turin|florence|italy|italia/i },
  { code: "mx", pattern: /mexico city|ciudad de m[eé]xico|guadalajara|monterrey|mexico|méxico/i },
  {
    code: "nl",
    pattern: /amsterdam|rotterdam|the hague|den haag|utrecht|netherlands|holland|荷兰/i,
  },
  { code: "nz", pattern: /auckland|wellington|christchurch|new zealand/i },
  { code: "pl", pattern: /warsaw|warszawa|krakow|kraków|wroclaw|poland|polska/i },
  { code: "sg", pattern: SINGAPORE_CITY_PATTERN },
  { code: "za", pattern: /johannesburg|cape town|durban|pretoria|south africa/i },
];

const JOBICY_GEO_RULES: Array<{ geo: string; pattern: RegExp }> = [
  { geo: "germany", pattern: GERMAN_CITY_PATTERN },
  { geo: "france", pattern: /paris|lyon|marseille|france|法国/i },
  { geo: "netherlands", pattern: /amsterdam|rotterdam|netherlands|holland|荷兰/i },
  { geo: "spain", pattern: /madrid|barcelona|spain|españa/i },
  { geo: "italy", pattern: /milan|rome|turin|italy|italia/i },
  { geo: "poland", pattern: /warsaw|krakow|poland|polska/i },
  { geo: "switzerland", pattern: /zurich|geneva|bern|switzerland|schweiz/i },
  { geo: "singapore", pattern: SINGAPORE_CITY_PATTERN },
  { geo: "japan", pattern: /tokyo|osaka|kyoto|yokohama|東京|大阪|日本|japan/i },
  { geo: "china", pattern: /beijing|shanghai|shenzhen|guangzhou|hangzhou|北京|上海|深圳|广州|杭州|中国/i },
  { geo: "hong-kong", pattern: /hong kong|香港/i },
  { geo: "south-korea", pattern: /seoul|busan|incheon|首尔|韩国|korea/i },
  { geo: "australia", pattern: /sydney|melbourne|australia/i },
  { geo: "canada", pattern: /toronto|vancouver|montreal|canada/i },
  { geo: "argentina", pattern: /buenos aires|argentina/i },
  { geo: "brazil", pattern: /s[aã]o paulo|rio de janeiro|brazil|brasil/i },
  { geo: "apac", pattern: /taipei|taiwan|bangkok|thailand|manila|philippines|kuala lumpur|malaysia|jakarta|indonesia|vietnam|hanoi|ho chi minh/i },
];

function resolveAdzunaCountryFallback(city: string): string | null {
  const lower = city.trim().toLowerCase();
  if (!lower) return null;

  for (const rule of ADZUNA_CITY_RULES) {
    if (rule.pattern.test(lower)) return rule.code;
  }

  return null;
}

/** ISO 3166-1 alpha-2 for Adzuna and Himalayas country filters. */
export function resolveAdzunaCountry(city: string): string | null {
  const route = resolveAdzunaRoute(city);
  if (route) return route.country;
  return resolveAdzunaCountryFallback(city);
}

export function isAdzunaCountrySupported(country: string): boolean {
  return coreIsAdzunaCountrySupported(country);
}

export function isGermanCity(city: string): boolean {
  const metro = resolveMetro(city);
  if (metro) return metro.countryCode === "de";
  return GERMAN_CITY_PATTERN.test(city.trim());
}

export function isSingaporeCity(city: string): boolean {
  const metro = resolveMetro(city);
  if (metro) return metro.countryCode === "sg";
  return SINGAPORE_CITY_PATTERN.test(city.trim());
}

const KOREAN_CITY_PATTERN =
  /seoul|busan|incheon|daegu|daejeon|gwangju|suwon|ulsan|changwon|首尔|釜山|仁川|韩国|korea|대한민국|서울|부산/i;

export function isKoreanCity(city: string): boolean {
  const metro = resolveMetro(city);
  if (metro) return metro.countryCode === "kr";
  return KOREAN_CITY_PATTERN.test(city.trim());
}

export function isUkCity(city: string): boolean {
  const metro = resolveMetro(city);
  if (metro) return metro.countryCode === "gb";
  return resolveAdzunaCountryFallback(city) === "gb";
}

export function isUsCity(city: string): boolean {
  const metro = resolveMetro(city);
  if (metro) return metro.countryCode === "us";
  return resolveAdzunaCountryFallback(city) === "us";
}

export function isFrenchCity(city: string): boolean {
  const metro = resolveMetro(city);
  if (metro) return metro.countryCode === "fr";
  return resolveAdzunaCountryFallback(city) === "fr";
}

/** Jobicy `geo` slug when profile city maps to a regional remote filter. */
export function resolveJobicyGeo(city: string): string | null {
  const metro = resolveMetro(city);
  if (metro) {
    const byCountry: Record<string, string> = {
      de: "germany",
      fr: "france",
      nl: "netherlands",
      es: "spain",
      it: "italy",
      pl: "poland",
      ch: "switzerland",
      sg: "singapore",
      jp: "japan",
      cn: "china",
      hk: "hong-kong",
      kr: "south-korea",
      au: "australia",
      ca: "canada",
      br: "brazil",
    };
    if (byCountry[metro.countryCode]) return byCountry[metro.countryCode]!;
  }

  const lower = city.trim().toLowerCase();
  if (!lower) return null;

  for (const rule of JOBICY_GEO_RULES) {
    if (rule.pattern.test(lower)) return rule.geo;
  }

  return null;
}

/** Strip Chinese 市 suffix and normalize city labels for APIs. */
export function normalizeCityForApi(city: string): string {
  const route = resolveAdzunaRoute(city);
  if (route) return route.where;

  const trimmed = city.trim().replace(/市$/u, "");
  if (/^frankfurt$/i.test(trimmed) || /法兰克福/.test(trimmed)) return "Frankfurt";
  if (/^berlin$/i.test(trimmed) || /柏林/.test(trimmed)) return "Berlin";
  if (/^munich$/i.test(trimmed) || /慕尼黑/.test(trimmed)) return "München";
  if (/^singapore$/i.test(trimmed) || /新加坡/.test(trimmed)) return "Singapore";
  return trimmed;
}
