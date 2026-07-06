import type { RawFeedItem } from "@aperio-j/core";
import { resolveCitySlug } from "@aperio-j/probe";
import { isCnLowValueListing } from "./cn-feed-quality.js";

export const CN_NATIONAL_AGGREGATOR_HOSTS =
  /(?:^|\.)51job\.com|lagou\.com|liepin\.com|zhipin\.com|(?:^|\.)zhaopin\.com$/i;

function normalizeCityKey(city: string): string {
  return city.trim().replace(/市$/u, "").toLowerCase();
}

/** True when a URL points at a national board homepage, not a city-scoped listing. */
export function isNationalAggregatorRootUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";

    if (/^[a-z0-9-]+\.zhaopin\.com$/i.test(host) && host !== "www.zhaopin.com") {
      return false;
    }

    if (host.endsWith("zhipin.com")) {
      const segments = path.split("/").filter(Boolean);
      if (segments.length >= 1 && segments[0]!.length >= 2) return false;
      return path === "/";
    }

    if (/51job\.com$/i.test(host)) {
      return path === "/" || path === "/default.aspx";
    }

    if (/lagou\.com$/i.test(host)) {
      return path === "/" || path === "/wn/";
    }

    if (/liepin\.com$/i.test(host)) {
      return path === "/";
    }

    return false;
  } catch {
    return false;
  }
}

export function isCnJobAggregatorUrl(url: string): boolean {
  return CN_NATIONAL_AGGREGATOR_HOSTS.test(url);
}

export function seedUrlMatchesCityProfile(seedUrl: string, city: string): boolean {
  if (!city.trim()) return true;
  if (isNationalAggregatorRootUrl(seedUrl)) return false;
  if (!CN_NATIONAL_AGGREGATOR_HOSTS.test(seedUrl)) return true;

  const slug = resolveCitySlug(city.trim()) ?? normalizeCityKey(city);
  const cityKey = normalizeCityKey(city);

  try {
    const url = new URL(seedUrl);
    const path = url.pathname.toLowerCase();
    const host = url.hostname.toLowerCase();

    if (slug && (path.includes(`/${slug}`) || host.startsWith(`${slug}.`))) return true;
    if (cityKey && path.includes(cityKey)) return true;
    if (/[\u4e00-\u9fff]/.test(city) && seedUrl.includes(city.replace(/市$/u, ""))) return true;

    if (host.endsWith("zhipin.com") && slug && !path.includes(slug)) return false;
    if (host.includes("51job.com") && path === "/") return false;
    if (host.includes("lagou.com") && (path === "/" || path === "/wn")) return false;
    if (host.endsWith("zhaopin.com") && !host.startsWith(`${slug ?? cityKey}.`)) return false;
  } catch {
    return false;
  }

  return false;
}

const CITY_HUB_TITLE = /^[\u4e00-\u9fff]{2,8}(?:市|区|县)?(?:人才网|招聘网|招聘)(?:·|$)/;
const NAV_LINK_TITLE =
  /^(?:查看更多职位|热门城市|地区招聘|城市招聘|更多招聘|切换城市|全部城市)/;

const GOV_NON_JOB_TITLE =
  /(?:补贴|培训项目|认定名单|实施方案|办事指南|政策解读|专项资金|以旧换新|消费季)/;

const CN_JOB_DETAIL_PATH =
  /(?:job\.(?:htm|html)|job_detail|\/zhaopin\/|\/job\/|\/jobs\/|mpost|post_|position|geek\/|html\/jobs|search\?|\/p\d+\.htm|\d+\.html|\/jobdetail|\/xxgk\/|\/content\/|\/tzgg\/|\/zpxx\/)/i;

export function isLikelyCnJobDetailUrl(url: string): boolean {
  if (CN_JOB_DETAIL_PATH.test(url)) return true;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".gov.cn")) {
      return /\/(?:content|xxgk|tzgg|zpxx)\//i.test(parsed.pathname);
    }
  } catch {
    return false;
  }
  return false;
}

export function isCnCityHubListing(title: string, profileCities: string[]): boolean {
  const trimmed = title.trim();
  if (NAV_LINK_TITLE.test(trimmed)) return true;
  if (!CITY_HUB_TITLE.test(trimmed)) return false;

  const profileKeys = profileCities.map(normalizeCityKey).filter(Boolean);
  if (profileKeys.length === 0) return false;

  const titleCity = trimmed.match(/^([\u4e00-\u9fff]{2,8})/)?.[1] ?? "";
  const titleKey = normalizeCityKey(titleCity);
  if (!titleKey) return false;

  return !profileKeys.some((key) => titleKey.includes(key) || key.includes(titleKey));
}

export function isCnNonJobGovNotice(title: string): boolean {
  const trimmed = title.trim();
  if (/(?:招聘|岗位|职位|诚聘|聘用|招考)/.test(trimmed)) return false;
  return GOV_NON_JOB_TITLE.test(trimmed);
}

export function filterCnListPageItems(
  items: RawFeedItem[],
  options: { profileCities?: string[] } = {},
): RawFeedItem[] {
  const cities = options.profileCities ?? [];

  return items.filter((item) => {
    if (isCnCityHubListing(item.title, cities)) return false;
    if (isCnNonJobGovNotice(item.title)) return false;
    if (isCnLowValueListing(item.title, item.url)) return false;

    try {
      const host = new URL(item.url).hostname.toLowerCase();
      if (CN_NATIONAL_AGGREGATOR_HOSTS.test(host) && !isLikelyCnJobDetailUrl(item.url)) {
        return false;
      }
    } catch {
      return true;
    }

    return true;
  });
}

export function filterCnStreamCandidates<T extends { seedUrl: string }>(
  candidates: T[],
  city: string,
): T[] {
  if (!city.trim()) return candidates;
  return candidates.filter((candidate) => seedUrlMatchesCityProfile(candidate.seedUrl, city));
}

/** JS-rendered boards that cannot be scraped with plain HTTP fetch. */
export function isJsHeavyCnAggregatorUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /(?:^|\.)zhipin\.com|51job\.com|lagou\.com|liepin\.com|zhaopin\.com$/i.test(host);
  } catch {
    return false;
  }
}

export function isGovCnHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov.cn") || host.includes("mohrss.gov.cn");
  } catch {
    return false;
  }
}

/** Single job detail pages should not be used as stream seeds. */
export function isCnSingleJobDetailUrl(url: string): boolean {
  return /(?:showdw\?id=|jobdetail\/|\/jobdetail\/|htmls\/cb21dwPages|\/p\d+\.htm(?:\?|$))/i.test(
    url,
  );
}

/** Navigation/index pages that rarely contain job rows. */
export function isCnGovIndexOnlyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!isGovCnHost(url)) return false;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return /\/gkmlpt(?:\/index)?$/i.test(path) || path === "/gkmlpt";
  } catch {
    return false;
  }
}

/** Rewrite national aggregator roots to city-scoped listing URLs when possible. */
export function resolveCnCityListingUrl(seedUrl: string, city: string): string {
  const slug = resolveCitySlug(city.trim());
  if (!slug) return seedUrl;

  try {
    const parsed = new URL(seedUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";

    if (host === "www.zhipin.com" && path === "/") {
      return `https://www.zhipin.com/${slug}/`;
    }
    if (host === "www.lagou.com" && (path === "/" || path === "/wn")) {
      return `https://www.lagou.com/${slug}/`;
    }
    if (host === "www.51job.com" && path === "/") {
      return `https://${slug}.zhaopin.com/`;
    }
  } catch {
    return seedUrl;
  }

  return seedUrl;
}

export function prepareCnStreamFetchUrl(url: string, city: string): string {
  const rewritten = resolveCnCityListingUrl(url, city);
  if (seedUrlMatchesCityProfile(rewritten, city)) return rewritten;
  if (seedUrlMatchesCityProfile(url, city)) return url;
  return rewritten;
}

export function shouldSuppressCnFetchError(url: string, itemCount: number, error?: string): boolean {
  if (itemCount > 0) return false;
  if (!isJsHeavyCnAggregatorUrl(url) && !isGovCnHost(url)) return false;
  if (error && !/^0 items$/i.test(error.trim()) && !/no listings returned/i.test(error)) {
    return false;
  }
  return true;
}
