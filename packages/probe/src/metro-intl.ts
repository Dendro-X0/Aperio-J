import { getMetroEntries, resolveMetro } from "@aperio-j/core";

export interface MetroIntlStreamDef {
  id: string;
  label: string;
  seedUrl: string;
  kind: "rss" | "list_page";
  domainTier: "gov" | "edu" | "company" | "aggregator" | "unknown";
}

function normalizeCity(value: string): string {
  return value.trim().replace(/市$/u, "").toLowerCase();
}

let slugAliasCache: Record<string, string> | null = null;

/** Metro catalog terms → probe slug (e.g. München → munich). */
export function metroSlugAliases(): Record<string, string> {
  if (slugAliasCache) return slugAliasCache;

  slugAliasCache = {};
  for (const metro of getMetroEntries()) {
    const { slug } = metro;
    slugAliasCache[slug] = slug;

    for (const label of Object.values(metro.labels)) {
      const key = normalizeCity(label);
      if (key) slugAliasCache[key] = slug;
    }

    for (const term of metro.matchTerms) {
      const key = normalizeCity(term);
      if (key) slugAliasCache[key] = slug;
    }
  }

  return slugAliasCache;
}

export function resolveMetroSlug(city: string): string | null {
  const raw = city.trim();
  if (!raw) return null;

  const aliases = metroSlugAliases();
  const normalized = normalizeCity(raw);
  const direct = aliases[raw.toLowerCase()] ?? aliases[normalized];
  if (direct) return direct;

  const firstToken = normalized.split(/\s+/)[0] ?? "";
  if (firstToken && aliases[firstToken]) return aliases[firstToken];

  const metro = resolveMetro(raw);
  return metro?.slug ?? null;
}

const INDEED_HOST_BY_COUNTRY: Record<string, string> = {
  de: "de.indeed.com",
  gb: "uk.indeed.com",
  us: "www.indeed.com",
  ca: "ca.indeed.com",
  au: "au.indeed.com",
  fr: "fr.indeed.com",
  nl: "nl.indeed.com",
  es: "es.indeed.com",
  it: "it.indeed.com",
  pl: "pl.indeed.com",
  at: "at.indeed.com",
  ch: "ch.indeed.com",
  be: "be.indeed.com",
  in: "in.indeed.com",
  br: "br.indeed.com",
  mx: "mx.indeed.com",
  sg: "sg.indeed.com",
  jp: "jp.indeed.com",
  kr: "kr.indeed.com",
  nz: "nz.indeed.com",
  za: "za.indeed.com",
};

export function resolveIndeedHostForCity(city: string, slug: string): string {
  const metro = resolveMetro(city);
  if (metro && INDEED_HOST_BY_COUNTRY[metro.countryCode]) {
    return INDEED_HOST_BY_COUNTRY[metro.countryCode]!;
  }

  if (/tokyo|osaka|kyoto|yokohama|nagoya|fukuoka|sapporo|kobe|东京|東京|大阪|京都|横滨|横浜|名古屋|福冈|福岡|札幌|神户|神戸/i.test(city)) {
    return "jp.indeed.com";
  }

  if (/berlin|bonn|frankfurt|munich|hamburg|cologne|köln|柏林|法兰克福|波恩|慕尼黑/i.test(city)) {
    return "de.indeed.com";
  }

  return "www.indeed.com";
}

function bundesagenturStream(slug: string, label: string): MetroIntlStreamDef {
  return {
    id: `${slug}-arbeitsagentur`,
    label: "Bundesagentur für Arbeit",
    seedUrl: `https://www.arbeitsagentur.de/jobsuche/suche?wo=${encodeURIComponent(label)}`,
    kind: "list_page",
    domainTier: "gov",
  };
}

/** National employment portals for metros without a curated INTL_CITY_REGISTRY entry. */
export function buildCountryFallbackStreams(
  countryCode: string,
  slug: string,
  label: string,
): MetroIntlStreamDef[] {
  switch (countryCode) {
    case "de":
      return [bundesagenturStream(slug, label)];
    case "gb":
      return [
        {
          id: `${slug}-uk-find-a-job`,
          label: "GOV.UK Find a job",
          seedUrl: "https://www.gov.uk/find-a-job",
          kind: "list_page",
          domainTier: "gov",
        },
        {
          id: `${slug}-uk-reed`,
          label: "Reed.co.uk · Jobs",
          seedUrl: "https://www.reed.co.uk/jobs",
          kind: "list_page",
          domainTier: "aggregator",
        },
      ];
    case "fr":
      return [
        {
          id: `${slug}-francetravail`,
          label: "France Travail",
          seedUrl: "https://candidat.francetravail.fr/offres/recherche",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "us":
      return [
        {
          id: `${slug}-usajobs`,
          label: "USAJOBS · Federal",
          seedUrl: "https://www.usajobs.gov/JobSearch/Search/GetFeed",
          kind: "rss",
          domainTier: "gov",
        },
      ];
    case "ca":
      return [
        {
          id: `${slug}-ca-jobbank`,
          label: "Job Bank Canada",
          seedUrl: "https://www.jobbank.gc.ca/jobsearch/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "au":
      return [
        {
          id: `${slug}-au-workforce`,
          label: "Workforce Australia",
          seedUrl: "https://www.workforceaustralia.gov.au/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "nl":
      return [
        {
          id: `${slug}-nl-werk`,
          label: "Werk.nl",
          seedUrl: "https://www.werk.nl/werkzoekenden/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "sg":
      return [
        {
          id: `${slug}-sg-mcf`,
          label: "MyCareersFuture Singapore",
          seedUrl: "https://www.mycareersfuture.gov.sg/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "jp":
      return [
        {
          id: `${slug}-jp-hellowork`,
          label: "Hello Work (Japan)",
          seedUrl: "https://www.hellowork.mhlw.go.jp/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "kr":
      return [
        {
          id: `${slug}-kr-worknet`,
          label: "Worknet Korea",
          seedUrl: "https://www.work.go.kr/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "pl":
      return [
        {
          id: `${slug}-pl-praca`,
          label: "Praca.gov.pl",
          seedUrl: "https://www.praca.gov.pl/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "es":
      return [
        {
          id: `${slug}-es-sepe`,
          label: "SEPE Empleo",
          seedUrl: "https://www.sepe.es/HomeSepe/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "it":
      return [
        {
          id: `${slug}-it-anpal`,
          label: "ANPAL · Lavoro",
          seedUrl: "https://www.anpal.gov.it/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "at":
      return [
        {
          id: `${slug}-at-ams`,
          label: "AMS Austria",
          seedUrl: "https://www.ams.at/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "ch":
      return [
        {
          id: `${slug}-ch-jobroom`,
          label: "Job-Room.ch",
          seedUrl: "https://www.job-room.ch/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "be":
      return [
        {
          id: `${slug}-be-vdab`,
          label: "VDAB",
          seedUrl: "https://www.vdab.be/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "in":
      return [
        {
          id: `${slug}-in-ncs`,
          label: "National Career Service (India)",
          seedUrl: "https://www.ncs.gov.in/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "nz":
      return [
        {
          id: `${slug}-nz-careers`,
          label: "Careers NZ",
          seedUrl: "https://www.careers.govt.nz/",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    case "za":
      return [
        {
          id: `${slug}-za-gov`,
          label: "SA Government Jobs",
          seedUrl: "https://www.gov.za/about-government/government-jobs",
          kind: "list_page",
          domainTier: "gov",
        },
      ];
    default:
      return [];
  }
}
