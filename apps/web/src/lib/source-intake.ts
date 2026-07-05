import { USER_CUSTOM_DISCOVERED_VIA } from "./source-registry";

export type SourceIntakeType = "api" | "rss" | "scraped" | "custom";

export function resolveSourceIntakeType(input: {
  kind: string;
  origin: "user" | "auto";
  discoveredVia?: string;
}): SourceIntakeType {
  if (input.origin === "user" || input.discoveredVia === USER_CUSTOM_DISCOVERED_VIA) {
    return "custom";
  }
  if (input.discoveredVia?.startsWith("user-custom:")) {
    return "custom";
  }
  if (input.kind === "connector" || input.discoveredVia?.startsWith("connector:")) {
    return "api";
  }
  if (input.kind === "rss") {
    return "rss";
  }
  return "scraped";
}

export function connectorDiscoveredVia(connectorId: string): string {
  return `connector:${connectorId}`;
}
