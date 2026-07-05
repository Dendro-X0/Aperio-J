import { isRemoteBoardUrl } from "@aperio-j/core";
import { corpusClaimsRemoteWork } from "@aperio-j/discovery/location";
import type { InboxItem } from "@/lib/match-service";

export type InboxWorkMode = "remote" | "onsite";
export type InboxWorkModeFilter = "all" | InboxWorkMode;

const REMOTE_SOURCE_SITE_PATTERN =
  /remotive|remoteok|weworkremotely|remote\.co|jobspresso|arbeitnow|dynamitejobs/i;

export function inboxItemWorkMode(item: InboxItem): InboxWorkMode {
  const { opportunity, source } = item;

  if (opportunity.locationText && corpusClaimsRemoteWork(opportunity.locationText)) {
    return "remote";
  }

  const corpus = [
    opportunity.title,
    opportunity.body,
    opportunity.locationText,
    opportunity.employerHint,
  ]
    .filter(Boolean)
    .join(" ");

  if (corpusClaimsRemoteWork(corpus)) return "remote";
  if (source?.seedUrl && isRemoteBoardUrl(source.seedUrl)) return "remote";

  const site = opportunity.sourceSite ?? source?.site ?? "";
  if (REMOTE_SOURCE_SITE_PATTERN.test(site)) return "remote";

  return "onsite";
}

export function matchesWorkModeFilter(
  item: InboxItem,
  workMode: InboxWorkModeFilter,
): boolean {
  if (workMode === "all") return true;
  return inboxItemWorkMode(item) === workMode;
}
