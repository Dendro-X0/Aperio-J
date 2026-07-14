import { isIntlRemoteBoardUrl } from "./network-region.js";

/** True when APERO_J_RSS_RELAY_URL is configured for international feed relay. */
export function isRssRelayEnabled(): boolean {
  return Boolean(process.env.APERO_J_RSS_RELAY_URL?.trim());
}

/**
 * Rewrite a feed URL through a deploy-side relay (e.g. Singapore worker).
 * Only international remote boards are relayed unless relayIntlOnly is false.
 *
 * APERO_J_RSS_RELAY_URL examples:
 * - https://relay.example.com/fetch?url=
 * - https://relay.example.com/fetch?url={url}
 */
export function resolveRelayFetchUrl(
  url: string,
  options?: { relayIntlOnly?: boolean },
): string {
  const relayBase = process.env.APERO_J_RSS_RELAY_URL?.trim();
  if (!relayBase) return url;

  const relayIntlOnly = options?.relayIntlOnly !== false;
  if (relayIntlOnly && !isIntlRemoteBoardUrl(url)) return url;

  if (relayBase.includes("{url}")) {
    return relayBase.replaceAll("{url}", encodeURIComponent(url));
  }

  if (relayBase.endsWith("=")) {
    return `${relayBase}${encodeURIComponent(url)}`;
  }

  const separator = relayBase.includes("?") ? "&" : "?";
  return `${relayBase}${separator}url=${encodeURIComponent(url)}`;
}
