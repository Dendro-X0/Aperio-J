import type { SeekerProfile } from "@aperio-j/core";
import { isChinaCityProfile } from "@aperio-j/probe";

/** Scrape/discovery fallback policy (C6). */

export function isScrapeDiscoveryFallbackEnabled(): boolean {
  return process.env.APERO_J_DISCOVERY_FALLBACK !== "false";
}

/** Run scrape discovery after fetch when connectors + registry returned no items. */
export function shouldRunScrapeDiscovery(fetchedItemCount: number): boolean {
  if (fetchedItemCount > 0) return false;
  return isScrapeDiscoveryFallbackEnabled();
}

/** CN profiles use capture-first intake — skip heavy auto-rediscovery on refresh. */
export function shouldRunScrapeDiscoveryForProfile(
  profile: SeekerProfile,
  fetchedItemCount: number,
): boolean {
  if (
    isChinaCityProfile(
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
    )
  ) {
    return false;
  }
  return shouldRunScrapeDiscovery(fetchedItemCount);
}

/** Run scrape discovery before fetch when registry is empty/unhealthy. */
export function shouldRunInitialScrapeDiscovery(options: {
  connectorConfigCount: number;
  enabledRegistryCount: number;
  healthyRegistryCount: number;
}): boolean {
  if (!isScrapeDiscoveryFallbackEnabled()) return false;
  if (options.connectorConfigCount > 0) return false;
  return options.enabledRegistryCount === 0 || options.healthyRegistryCount === 0;
}

export function shouldRunInitialScrapeDiscoveryForProfile(
  profile: SeekerProfile,
  options: {
    connectorConfigCount: number;
    enabledRegistryCount: number;
    healthyRegistryCount: number;
  },
): boolean {
  if (
    isChinaCityProfile(
      profile.constraints.primaryCity,
      profile.constraints.acceptableCities,
    )
  ) {
    return options.enabledRegistryCount === 0;
  }
  return shouldRunInitialScrapeDiscovery(options);
}
