/** Locale-keyed probe pack — community-extensible registry. */

import type { SeekerProfile } from "@aperio-j/core";
import { resolveMetro } from "@aperio-j/core";
import {
  buildCountryFallbackStreams,
  resolveIndeedHostForCity,
  resolveMetroSlug,
} from "./metro-intl.js";

export interface RegistryStreamDef {
  id: string;
  label: string;
  seedUrl: string;
  kind: "rss" | "list_page";
  domainTier: "gov" | "edu" | "company" | "aggregator" | "unknown";
}

export interface ProbePack {
  id: string;
  locale: string;
  region?: string;
  cityLabels: string[];
  /** Lowercase aliases for city matching */
  cityAliases: string[];
  /** URL slug for aggregator templates, e.g. shenzhen */
  citySlug?: string;
  registryStreams: RegistryStreamDef[];
  /** Pages to scan for RSS autodiscovery */
  seedPages: string[];
}

/** National boards included in every matched CN city pack. */
const NATIONAL_AGGREGATORS: RegistryStreamDef[] = [
  {
    id: "cn-51job",
    label: "前程无忧",
    seedUrl: "https://www.51job.com/",
    kind: "list_page",
    domainTier: "aggregator",
  },
  {
    id: "cn-lagou",
    label: "拉勾招聘",
    seedUrl: "https://www.lagou.com/",
    kind: "list_page",
    domainTier: "aggregator",
  },
];

function cityAggregators(cityLabel: string, slug: string): RegistryStreamDef[] {
  return [
    {
      id: `${slug}-zhaopin`,
      label: `智联招聘·${cityLabel}`,
      seedUrl: `https://${slug}.zhaopin.com/`,
      kind: "list_page",
      domainTier: "aggregator",
    },
    {
      id: `${slug}-zhipin`,
      label: `BOSS直聘·${cityLabel}`,
      seedUrl: `https://www.zhipin.com/${slug}/`,
      kind: "list_page",
      domainTier: "aggregator",
    },
  ];
}

/** China metro slug aliases — used for CN probe packs and isChinaCityProfile. */
export const CN_CITY_SLUG_ALIASES: Record<string, string> = {
  深圳: "shenzhen",
  深圳市: "shenzhen",
  shenzhen: "shenzhen",
  sz: "shenzhen",
  东莞: "dongguan",
  东莞市: "dongguan",
  dongguan: "dongguan",
  dg: "dongguan",
  广州: "guangzhou",
  广州市: "guangzhou",
  guangzhou: "guangzhou",
  gz: "guangzhou",
  北京: "beijing",
  北京市: "beijing",
  beijing: "beijing",
  上海: "shanghai",
  上海市: "shanghai",
  shanghai: "shanghai",
  杭州: "hangzhou",
  杭州市: "hangzhou",
  hangzhou: "hangzhou",
  成都: "chengdu",
  成都市: "chengdu",
  chengdu: "chengdu",
  武汉: "wuhan",
  武汉市: "wuhan",
  wuhan: "wuhan",
  南京: "nanjing",
  南京市: "nanjing",
  nanjing: "nanjing",
  苏州: "suzhou",
  苏州市: "suzhou",
  suzhou: "suzhou",
  佛山: "foshan",
  佛山市: "foshan",
  foshan: "foshan",
  惠州: "huizhou",
  惠州市: "huizhou",
  huizhou: "huizhou",
  中山: "zhongshan",
  中山市: "zhongshan",
  zhongshan: "zhongshan",
  珠海: "zhuhai",
  珠海市: "zhuhai",
  zhuhai: "zhuhai",
  香港: "hongkong",
  "hong kong": "hongkong",
  hongkong: "hongkong",
};

/** Japan metro slug aliases — used for JP search sphere and slug resolution. */
export const JP_CITY_SLUG_ALIASES: Record<string, string> = {
  tokyo: "tokyo",
  东京: "tokyo",
  東京: "tokyo",
  osaka: "osaka",
  大阪: "osaka",
  yokohama: "yokohama",
  横浜: "yokohama",
  横滨: "yokohama",
  nagoya: "nagoya",
  名古屋: "nagoya",
  kyoto: "kyoto",
  京都: "kyoto",
  fukuoka: "fukuoka",
  福岡: "fukuoka",
  福冈: "fukuoka",
  kobe: "kobe",
  神戸: "kobe",
  神户: "kobe",
  sapporo: "sapporo",
  札幌: "sapporo",
};

const JAPANESE_KANA_PATTERN = /[\u3040-\u309f\u30a0-\u30ff]/;

export function hasJapaneseKana(text: string): boolean {
  return JAPANESE_KANA_PATTERN.test(text);
}

export function isJapanCityLabel(city: string): boolean {
  const raw = city.trim();
  if (!raw) return false;
  if (hasJapaneseKana(raw)) return true;

  const normalized = normalizeCity(raw);
  return raw in JP_CITY_SLUG_ALIASES || normalized in JP_CITY_SLUG_ALIASES;
}

export function isJapanCityProfile(primaryCity: string, acceptableCities: string[] = []): boolean {
  const cities = [primaryCity, ...acceptableCities].map((city) => city.trim()).filter(Boolean);
  return cities.some((city) => isJapanCityLabel(city));
}

const INTL_CITY_SLUG_ALIASES: Record<string, string> = {
  paris: "paris",
  london: "london",
  frankfurt: "frankfurt",
  "frankfurt am main": "frankfurt",
  bonn: "bonn",
  berlin: "berlin",
  amsterdam: "amsterdam",
  "new york": "newyork",
  nyc: "newyork",
  "san francisco": "sanfrancisco",
  sf: "sanfrancisco",
  "los angeles": "losangeles",
  austin: "austin",
  philadelphia: "philadelphia",
  chicago: "chicago",
  seattle: "seattle",
  boston: "boston",
  miami: "miami",
  denver: "denver",
  atlanta: "atlanta",
  "washington dc": "washingtondc",
  "washington d.c.": "washingtondc",
  "washington, d.c.": "washingtondc",
  toronto: "toronto",
  sydney: "sydney",
  singapore: "singapore",
  tokyo: "tokyo",
  东京: "tokyo",
  東京: "tokyo",
  osaka: "osaka",
  大阪: "osaka",
  yokohama: "yokohama",
  横浜: "yokohama",
  横滨: "yokohama",
  nagoya: "nagoya",
  名古屋: "nagoya",
  kyoto: "kyoto",
  京都: "kyoto",
  fukuoka: "fukuoka",
  福岡: "fukuoka",
  福冈: "fukuoka",
  kobe: "kobe",
  神戸: "kobe",
  神户: "kobe",
  sapporo: "sapporo",
  札幌: "sapporo",
  巴黎: "paris",
  伦敦: "london",
  法兰克福: "frankfurt",
  波恩: "bonn",
  柏林: "berlin",
};

/** Slug lookup for generic-pack fallback (community packs preferred when available). */
export const CITY_SLUG_ALIASES: Record<string, string> = {
  ...CN_CITY_SLUG_ALIASES,
  ...JP_CITY_SLUG_ALIASES,
  ...INTL_CITY_SLUG_ALIASES,
};

export const PROBE_PACKS: ProbePack[] = [
  {
    id: "zh-CN-GD-SZ",
    locale: "zh-CN",
    region: "GD-SZ",
    citySlug: "shenzhen",
    cityLabels: ["深圳", "深圳市"],
    cityAliases: ["深圳", "深圳市", "shenzhen", "sz"],
    registryStreams: [
      ...cityAggregators("深圳", "shenzhen"),
      {
        id: "sz-gov-hrss-portal",
        label: "深圳人社·通知公告",
        seedUrl: "https://hrss.sz.gov.cn/tzgg/",
        kind: "list_page",
        domainTier: "gov",
      },
    ],
    seedPages: [
      "https://shenzhen.zhaopin.com/",
      "https://www.zhipin.com/shenzhen/",
      "https://www.51job.com/jobs/shenzhen/",
    ],
  },
  {
    id: "zh-CN-GD-DG",
    locale: "zh-CN",
    region: "GD-DG",
    citySlug: "dongguan",
    cityLabels: ["东莞", "东莞市"],
    cityAliases: ["东莞", "东莞市", "dongguan", "dg"],
    registryStreams: [
      ...cityAggregators("东莞", "dongguan"),
      {
        id: "dg-gov-hrss",
        label: "东莞市人力资源和社会保障局",
        seedUrl: "https://rsj.dg.gov.cn/",
        kind: "list_page",
        domainTier: "gov",
      },
    ],
    seedPages: ["https://rsj.dg.gov.cn/", "https://dongguan.zhaopin.com/"],
  },
  {
    id: "zh-CN-GD-GZ",
    locale: "zh-CN",
    region: "GD-GZ",
    citySlug: "guangzhou",
    cityLabels: ["广州", "广州市"],
    cityAliases: ["广州", "广州市", "guangzhou", "gz"],
    registryStreams: [
      ...cityAggregators("广州", "guangzhou"),
      {
        id: "gz-gov-hrss",
        label: "广州市人力资源和社会保障局",
        seedUrl: "https://rsj.gz.gov.cn/",
        kind: "list_page",
        domainTier: "gov",
      },
    ],
    seedPages: ["https://rsj.gz.gov.cn/", "https://guangzhou.zhaopin.com/"],
  },
  {
    id: "zh-CN-generic",
    locale: "zh-CN",
    cityLabels: [],
    cityAliases: [],
    registryStreams: [...NATIONAL_AGGREGATORS],
    seedPages: [],
  },
  {
    id: "global-city",
    locale: "en",
    cityLabels: [],
    cityAliases: [],
    registryStreams: [],
    seedPages: [],
  },
  {
    id: "global-remote",
    locale: "en",
    cityLabels: [],
    cityAliases: [],
    registryStreams: [],
    seedPages: [],
  },
];

/** Remote-only RSS boards — used when no city is set, or as hybrid supplements. */
export const REMOTE_REGISTRY_STREAMS: RegistryStreamDef[] = [
  {
    id: "wwr-programming",
    label: "We Work Remotely · Programming",
    seedUrl: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-devops",
    label: "We Work Remotely · DevOps & Sysadmin",
    seedUrl: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-design",
    label: "We Work Remotely · Design",
    seedUrl: "https://weworkremotely.com/categories/remote-design-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-customer-support",
    label: "We Work Remotely · Customer Support",
    seedUrl: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-sales-marketing",
    label: "We Work Remotely · Sales & Marketing",
    seedUrl: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-product",
    label: "We Work Remotely · Product",
    seedUrl: "https://weworkremotely.com/categories/remote-product-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-all-other",
    label: "We Work Remotely · All other",
    seedUrl: "https://weworkremotely.com/categories/all-other-remote-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "remoteco-feed",
    label: "Remote.co · Jobs",
    seedUrl: "https://remote.co/remote-jobs/feed/",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "remoteok-feed",
    label: "Remote OK · Jobs",
    seedUrl: "https://remoteok.com/remote-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "jobspresso-feed",
    label: "Jobspresso · Remote",
    seedUrl: "https://jobspresso.co/feed/",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "wwr-all-remote",
    label: "We Work Remotely · All remote",
    seedUrl: "https://weworkremotely.com/remote-jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "hn-hiring",
    label: "Hacker News · Who is hiring",
    seedUrl: "https://hnhiring.com/latest/rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "remotive-feed",
    label: "Remotive · Remote jobs",
    seedUrl: "https://remotive.com/remote-jobs/feed",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "workingnomads-feed",
    label: "Working Nomads · Remote",
    seedUrl: "https://www.workingnomads.com/jobs.rss",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "arbeitnow-feed",
    label: "Arbeitnow · Remote & visa-friendly",
    seedUrl: "https://www.arbeitnow.com/api/job-board/feed",
    kind: "rss",
    domainTier: "aggregator",
  },
  {
    id: "dynamitejobs-feed",
    label: "Dynamite Jobs · Remote",
    seedUrl: "https://dynamitejobs.com/feed",
    kind: "rss",
    domainTier: "aggregator",
  },
];

/** Known employment portals for major international cities. */
export const INTL_CITY_REGISTRY: Record<string, RegistryStreamDef[]> = {
  paris: [
    {
      id: "paris-francetravail",
      label: "France Travail",
      seedUrl: "https://candidat.francetravail.fr/offres/recherche",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "paris-service-public",
      label: "Service Public · Recrutement",
      seedUrl: "https://choisirleservicepublic.gouv.fr/nous-recherchons-des-candidats",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  sanfrancisco: [
    {
      id: "sf-careers",
      label: "City of San Francisco Careers",
      seedUrl: "https://careers.sf.gov/",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "sf-gov-jobs",
      label: "SF.gov Jobs",
      seedUrl: "https://www.sf.gov/departments--jobs",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "sf-calcareers",
      label: "CalCareers · California state jobs",
      seedUrl: "https://www.calcareers.ca.gov/",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "sf-usajobs",
      label: "USAJOBS · Federal",
      seedUrl: "https://www.usajobs.gov/JobSearch/Search/GetFeed",
      kind: "rss",
      domainTier: "gov",
    },
  ],
  london: [
    {
      id: "uk-find-a-job",
      label: "GOV.UK Find a job",
      seedUrl: "https://www.gov.uk/find-a-job",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "uk-civil-service",
      label: "Civil Service Jobs",
      seedUrl: "https://www.civilservicejobs.service.gov.uk/",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "uk-reed",
      label: "Reed.co.uk · Jobs",
      seedUrl: "https://www.reed.co.uk/jobs",
      kind: "list_page",
      domainTier: "aggregator",
    },
  ],
  frankfurt: [
    {
      id: "de-arbeitsagentur",
      label: "Bundesagentur für Arbeit",
      seedUrl: "https://www.arbeitsagentur.de/jobsuche/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  bonn: [
    {
      id: "de-arbeitsagentur-bonn",
      label: "Bundesagentur für Arbeit",
      seedUrl: "https://www.arbeitsagentur.de/jobsuche/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  berlin: [
    {
      id: "de-arbeitsagentur-berlin",
      label: "Bundesagentur für Arbeit",
      seedUrl: "https://www.arbeitsagentur.de/jobsuche/suche?wo=Berlin",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "berlin-stepstone",
      label: "StepStone · Berlin",
      seedUrl: "https://www.stepstone.de/jobs/in-berlin",
      kind: "list_page",
      domainTier: "aggregator",
    },
  ],
  newyork: [
    {
      id: "nyc-careers",
      label: "NYC Careers",
      seedUrl: "https://www.nyc.gov/html/careers/html/home/home.shtml",
      kind: "list_page",
      domainTier: "gov",
    },
    {
      id: "nyc-usajobs",
      label: "USAJOBS · Federal",
      seedUrl: "https://www.usajobs.gov/JobSearch/Search/GetFeed",
      kind: "rss",
      domainTier: "gov",
    },
  ],
  toronto: [
    {
      id: "ca-jobbank",
      label: "Job Bank Canada",
      seedUrl: "https://www.jobbank.gc.ca/jobsearch/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  sydney: [
    {
      id: "au-workforce",
      label: "Workforce Australia",
      seedUrl: "https://www.workforceaustralia.gov.au/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  singapore: [
    {
      id: "sg-mycareersfuture",
      label: "MyCareersFuture Singapore",
      seedUrl: "https://www.mycareersfuture.gov.sg/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  tokyo: [
    {
      id: "jp-hellowork",
      label: "Hello Work (Japan)",
      seedUrl: "https://www.hellowork.mhlw.go.jp/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  osaka: [
    {
      id: "jp-hellowork-osaka",
      label: "Hello Work (Japan)",
      seedUrl: "https://www.hellowork.mhlw.go.jp/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
  amsterdam: [
    {
      id: "nl-werk",
      label: "Werk.nl",
      seedUrl: "https://www.werk.nl/werkzoekenden/",
      kind: "list_page",
      domainTier: "gov",
    },
  ],
};

// Attach remote streams to global-remote pack entry
const globalRemotePack = PROBE_PACKS.find((pack) => pack.id === "global-remote");
if (globalRemotePack) {
  globalRemotePack.registryStreams = [...REMOTE_REGISTRY_STREAMS];
}

export function normalizeCity(value: string): string {
  return value.trim().replace(/市$/u, "").toLowerCase();
}

export function resolveCitySlug(city: string): string | null {
  const raw = city.trim();
  if (!raw) return null;

  const direct = CITY_SLUG_ALIASES[raw] ?? CITY_SLUG_ALIASES[normalizeCity(raw)];
  if (direct) return direct;

  const normalized = normalizeCity(raw);
  const firstToken = normalized.split(/\s+/)[0] ?? "";
  if (firstToken && CITY_SLUG_ALIASES[firstToken]) {
    return CITY_SLUG_ALIASES[firstToken];
  }

  for (const pack of PROBE_PACKS) {
    if (!pack.citySlug) continue;
    const aliases = pack.cityAliases.map(normalizeCity);
    if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
      return pack.citySlug;
    }
  }

  const metroSlug = resolveMetroSlug(raw);
  if (metroSlug) return metroSlug;

  if (/^[a-z][a-z0-9-]*$/i.test(normalized)) return normalized;
  if (firstToken && /^[a-z][a-z0-9-]*$/i.test(firstToken)) return firstToken;
  return null;
}

const FALLBACK_PACK_IDS = new Set(["zh-CN-generic", "global-remote", "global-city"]);

const CN_TECH_INTENT =
  /\b(developer|engineer|programmer|devops|full[- ]?stack|software|frontend|backend|sre|data\s+scientist)\b|开发工程师|程序员|软件工程师|运维工程师|算法工程师|全栈|后端开发|前端开发/i;

const CN_LOCAL_OCCUPATION =
  /产线|普工|流水线|组装|操作工|质检|iqc|oqc|fqc|仓储|仓管|物料|设备维护|机修|杂工|服务员|后厨|factory\s*worker|warehouse|production\s*line|quality\s*(control|inspector)|general\s*labor|assembler|machine\s*operator/i;

const CN_MANUFACTURING_INDUSTRY = /制造|电子制造|工厂|制造业|manufacturing|assembly|电子/i;

const CN_TECH_INDUSTRY = /软件|互联网|\bit\b|software|saas|developer|程序员/i;

function profileIntentCorpus(profile: Pick<SeekerProfile, "intent" | "artifacts">): string {
  return [
    ...profile.intent.desiredRoles,
    ...profile.intent.desiredIndustries,
    ...profile.artifacts.map((artifact) => artifact.title),
    ...profile.artifacts.map((artifact) => artifact.industry),
    ...profile.artifacts.map((artifact) => artifact.duties),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Blue-collar / manufacturing profiles should use local search + onsite boards, not dev remote feeds. */
export function isCnLocalFirstOccupation(
  profile: Pick<SeekerProfile, "intent" | "artifacts">,
): boolean {
  const corpus = profileIntentCorpus(profile);
  if (!corpus.trim()) return false;

  if (CN_LOCAL_OCCUPATION.test(corpus)) return true;
  if (CN_TECH_INTENT.test(corpus) && !CN_MANUFACTURING_INDUSTRY.test(corpus)) return false;
  if (CN_MANUFACTURING_INDUSTRY.test(corpus) && !CN_TECH_INDUSTRY.test(corpus)) return true;
  return false;
}

/** CN city profile that should run local aggregator scrape (onsite-only). Hybrid/remote use remote boards. */
export function isCnLocalFirstProfile(profile: SeekerProfile): boolean {
  if (!isChinaCityProfile(profile.constraints.primaryCity, profile.constraints.acceptableCities)) {
    return false;
  }
  return profile.constraints.remotePreference === "onsite-only";
}

/** CN city profile that accepts remote/hybrid — Work Best-style intake (remote boards first). */
export function isCnRemoteFirstProfile(
  primaryCity: string,
  acceptableCities: string[] = [],
  remotePreference: "remote-only" | "hybrid-ok" | "onsite-only" = "hybrid-ok",
  profile?: Pick<SeekerProfile, "intent" | "artifacts" | "constraints">,
): boolean {
  if (remotePreference === "onsite-only") return false;
  if (!isChinaCityProfile(primaryCity, acceptableCities)) return false;
  if (profile) {
    const fullProfile = profile as SeekerProfile;
    if (isCnLocalFirstProfile(fullProfile)) return false;
  }
  return true;
}

/** Remote boards are the primary intake path (freelancers, nomads, global tech). */
export function isRemoteFirstProfile(profile: SeekerProfile): boolean {
  if (profile.constraints.remotePreference === "onsite-only") return false;
  if (profile.constraints.remotePreference === "remote-only") return true;
  if (isCnLocalFirstProfile(profile)) return false;
  return true;
}

const REMOTE_TECH_INTENT =
  /\b(developer|engineer|programmer|devops|full[- ]?stack|software|frontend|backend|sre|platform engineer|data engineer|machine learning|product manager|ux designer|ui designer|qa engineer|sdet)\b|开发工程师|程序员|软件工程师|前端开发|后端开发|全栈|运维工程师|数据工程师|算法工程师|产品经理|测试工程师/i;

const REMOTE_OPS_INTENT =
  /\b(?:operations|ops|customer\s+(?:support|success|service)|community\s+manager|social\s+media|content\s+(?:creator|moderator|operations)|e-?commerce|ecommerce|live\s*stream|livestream|virtual\s+assistant|moderator|copywriter|growth|marketing\s+assistant|community\s+operations)\b|运营|电商|直播|客服|内容运营|社群|新媒体|店铺运营|带货|主播助理|风控运营/iu;

/** Profile targets remote ops, gig, or e-commerce/live roles (non-developer). */
export function isRemoteOpsProfile(profile: SeekerProfile): boolean {
  if (profile.constraints.remotePreference === "onsite-only") return false;
  const corpus = profileIntentCorpus(profile);
  if (!corpus.trim()) return false;

  const opsIntent = REMOTE_OPS_INTENT.test(corpus);
  const techRoleIntent = REMOTE_TECH_INTENT.test(corpus);

  if (opsIntent && !techRoleIntent) return true;
  if (techRoleIntent || isRemoteTechProfile(profile)) return false;
  return opsIntent;
}

/** Profile targets remote tech roles (engineering, product, data). */
export function isRemoteTechProfile(profile: SeekerProfile): boolean {
  if (profile.constraints.remotePreference === "onsite-only") return false;
  if (isCnLocalFirstProfile(profile)) return false;
  const corpus = profileIntentCorpus(profile);
  if (!corpus.trim()) return false;
  return REMOTE_TECH_INTENT.test(corpus) || CN_TECH_INDUSTRY.test(corpus);
}

export function isChinaCityProfile(primaryCity: string, acceptableCities: string[] = []): boolean {
  const cities = [primaryCity, ...acceptableCities].map((city) => city.trim()).filter(Boolean);
  if (cities.length === 0) return false;
  if (isJapanCityProfile(primaryCity, acceptableCities)) return false;

  for (const pack of PROBE_PACKS) {
    if (FALLBACK_PACK_IDS.has(pack.id)) continue;
    const aliases = pack.cityAliases.map(normalizeCity);
    if (
      cities.some((city) => {
        const normalized = normalizeCity(city);
        return aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized));
      })
    ) {
      return true;
    }
  }

  return cities.some((city) => {
    if (/[\u4e00-\u9fff]/.test(city)) return true;
    const raw = city.trim();
    const normalized = normalizeCity(raw);
    return (
      raw in CN_CITY_SLUG_ALIASES ||
      normalized in CN_CITY_SLUG_ALIASES
    );
  });
}

export function resolveProbePack(primaryCity: string, acceptableCities: string[] = []): ProbePack {
  const cities = [primaryCity, ...acceptableCities].map(normalizeCity).filter(Boolean);

  if (cities.length === 0) {
    return PROBE_PACKS.find((pack) => pack.id === "global-remote")!;
  }

  for (const pack of PROBE_PACKS) {
    if (FALLBACK_PACK_IDS.has(pack.id)) continue;
    const aliases = pack.cityAliases.map(normalizeCity);
    if (cities.some((city) => aliases.some((alias) => city.includes(alias) || alias.includes(city)))) {
      return pack;
    }
  }

  if (isChinaCityProfile(primaryCity, acceptableCities)) {
    return PROBE_PACKS.find((pack) => pack.id === "zh-CN-generic")!;
  }

  return PROBE_PACKS.find((pack) => pack.id === "global-city")!;
}

export function getRegistryStreamById(packId: string, streamId: string): RegistryStreamDef | null {
  const pack = PROBE_PACKS.find((row) => row.id === packId);
  return pack?.registryStreams.find((row) => row.id === streamId) ?? null;
}

/** Build aggregator registry entries for a city slug (generic pack expansion). */
export function buildGenericCityStreams(city: string): RegistryStreamDef[] {
  const slug = resolveCitySlug(city);
  if (!slug) return [];

  const label = city.trim().replace(/市$/u, "") || city;
  return cityAggregators(label, slug);
}

/** Build international city registry + aggregator probes for global-city pack. */
export function buildInternationalCityStreams(city: string): RegistryStreamDef[] {
  const slug = resolveCitySlug(city) ?? normalizeCity(city).replace(/\s+/g, "");
  if (!slug) return [];

  const label = city.trim().replace(/市$/u, "") || city;
  const curated = INTL_CITY_REGISTRY[slug] ?? [];
  const metro = resolveMetro(city);
  const countryFallback =
    curated.length === 0 && metro
      ? buildCountryFallbackStreams(metro.countryCode, slug, label)
      : [];
  const indeedHost = resolveIndeedHostForCity(city, slug);
  const generic: RegistryStreamDef[] = [
    {
      id: `${slug}-indeed`,
      label: `Indeed · ${label}`,
      seedUrl: `https://${indeedHost}/jobs?l=${encodeURIComponent(label)}`,
      kind: "list_page",
      domainTier: "aggregator",
    },
    {
      id: `${slug}-linkedin`,
      label: `LinkedIn · ${label}`,
      seedUrl: `https://www.linkedin.com/jobs/search?location=${encodeURIComponent(label)}`,
      kind: "list_page",
      domainTier: "aggregator",
    },
  ];

  const seen = new Set<string>();
  return [...curated, ...countryFallback, ...generic].filter((stream) => {
    if (seen.has(stream.seedUrl)) return false;
    seen.add(stream.seedUrl);
    return true;
  });
}
