export type StreamWorkCategory = "remote" | "onsite";

/** Hostnames of known remote-only job boards (RSS/list). */
const REMOTE_BOARD_HOST_PATTERN =
  /weworkremotely|remoteok\.com|remote\.co|jobspresso|remotive\.com|workingnomads|arbeitnow|hnhiring|dynamitejobs|nodesk/i;

export function isRemoteBoardUrl(seedUrl: string): boolean {
  try {
    return REMOTE_BOARD_HOST_PATTERN.test(new URL(seedUrl).hostname.toLowerCase());
  } catch {
    return REMOTE_BOARD_HOST_PATTERN.test(seedUrl.toLowerCase());
  }
}

/** Classify a stream as remote work vs on-site (full-time / part-time boards). */
export function classifyStreamWorkCategory(input: {
  regionHint: string;
  seedUrl: string;
}): StreamWorkCategory {
  if (input.regionHint.trim().toLowerCase() === "remote") {
    return "remote";
  }
  if (isRemoteBoardUrl(input.seedUrl)) {
    return "remote";
  }
  return "onsite";
}
