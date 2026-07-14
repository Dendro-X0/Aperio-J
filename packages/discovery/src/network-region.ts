/** Host patterns for international remote job boards (often slow or blocked from mainland CN). */
export const INTL_REMOTE_BOARD_HOST =
  /(?:^|\.)weworkremotely\.com|remoteok\.com|remotive\.com|dynamitejobs\.com|jobspresso\.co|remote\.co|workingnomads\.com|himalayas\.app|jobicy\.com|stackoverflow\.com\/jobs|authenticjobs\.com|justremote\.co|nodesk\.co|dailyremote\.com|flexjobs\.com|virtualvocations\.com|remotive\.com|arc\.dev|wellfound\.com|ycombinator\.com\/jobs/i;

/** CN gig / freelance sources that are usually reachable without a VPN. */
export const CN_ACCESSIBLE_SOURCE_HOST =
  /(?:^|\.)eleduck\.com|电鸭|zhubajie\.com|猪八戒|epwk\.com|一品威客|gov\.cn|hrss\.|rsj\.|zhipin\.com|51job\.com|lagou\.com|liepin\.com|zhaopin\.com/i;

export function isIntlRemoteBoardUrl(url: string): boolean {
  try {
    return INTL_REMOTE_BOARD_HOST.test(new URL(url).hostname);
  } catch {
    return INTL_REMOTE_BOARD_HOST.test(url);
  }
}

export function isCnAccessibleSourceUrl(url: string): boolean {
  if (CN_ACCESSIBLE_SOURCE_HOST.test(url)) return true;
  try {
    return CN_ACCESSIBLE_SOURCE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export type SourceNetworkReach = "cn" | "intl" | "global";

export function classifySourceNetworkReach(url: string): SourceNetworkReach {
  const cn = isCnAccessibleSourceUrl(url);
  const intl = isIntlRemoteBoardUrl(url);
  if (cn && !intl) return "cn";
  if (intl && !cn) return "intl";
  if (cn && intl) return "global";
  return "global";
}

/** True when an error likely reflects regional network reachability, not a dead credential or source. */
export function isLikelyRegionalNetworkFailure(error: string, url?: string): boolean {
  const normalized = error.trim().toLowerCase();
  if (
    /econnreset|etimedout|enotfound|eai_again|socket hang up|network error|fetch failed|certificate|tls|timed out|timeout|dns|getaddrinfo|connect timeout|aborted|undici|unable to verify|self signed|certificate has expired/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (/\b403\b/.test(normalized) && url && isIntlRemoteBoardUrl(url)) {
    return true;
  }

  if (/\b502\b|\b503\b|\b504\b/.test(normalized) && url && isIntlRemoteBoardUrl(url)) {
    return true;
  }

  return false;
}
