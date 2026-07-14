import type { NetworkEnvironment, SeekerProfile } from "@aperio-j/core";
import { isChinaCityProfile } from "@aperio-j/probe";

export type ResolvedNetworkEnvironment = "mainland-cn" | "overseas";

export function resolveProfileNetworkEnvironment(
  profile: SeekerProfile,
): ResolvedNetworkEnvironment {
  const setting: NetworkEnvironment = profile.constraints.networkEnvironment ?? "auto";
  if (setting === "mainland-cn") return "mainland-cn";
  if (setting === "overseas") return "overseas";

  const city = profile.constraints.primaryCity.trim();
  if (isChinaCityProfile(city, profile.constraints.acceptableCities)) {
    return "mainland-cn";
  }
  return "overseas";
}

export function isCnNetworkContext(profile: SeekerProfile): boolean {
  return resolveProfileNetworkEnvironment(profile) === "mainland-cn";
}
