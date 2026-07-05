import type { LucideIcon } from "lucide-react";
import { Ban, Briefcase, Database, FileText, MapPin, Plug, Shield, Target } from "lucide-react";

export type ProfileSectionId =
  | "location"
  | "employment"
  | "background"
  | "intent"
  | "exclusions"
  | "connectors"
  | "trust"
  | "reset";

export type ProfileNavGroupId = "matching" | "filters" | "trust" | "system";

export const PROFILE_SECTIONS: {
  id: ProfileSectionId;
  icon: LucideIcon;
  labelKey: `sections.${ProfileSectionId}`;
  group: ProfileNavGroupId;
  completenessKey?: `completeness.${ProfileSectionId}`;
}[] = [
  {
    id: "location",
    icon: MapPin,
    labelKey: "sections.location",
    group: "matching",
    completenessKey: "completeness.location",
  },
  {
    id: "employment",
    icon: Briefcase,
    labelKey: "sections.employment",
    group: "matching",
    completenessKey: "completeness.employment",
  },
  {
    id: "background",
    icon: FileText,
    labelKey: "sections.background",
    group: "matching",
    completenessKey: "completeness.background",
  },
  {
    id: "intent",
    icon: Target,
    labelKey: "sections.intent",
    group: "matching",
    completenessKey: "completeness.intent",
  },
  {
    id: "exclusions",
    icon: Ban,
    labelKey: "sections.exclusions",
    group: "filters",
  },
  {
    id: "connectors",
    icon: Plug,
    labelKey: "sections.connectors",
    group: "system",
  },
  {
    id: "trust",
    icon: Shield,
    labelKey: "sections.trust",
    group: "trust",
  },
  {
    id: "reset",
    icon: Database,
    labelKey: "sections.reset",
    group: "system",
  },
];

export const PROFILE_NAV_GROUPS: {
  id: ProfileNavGroupId;
  labelKey: `navGroups.${ProfileNavGroupId}`;
}[] = [
  { id: "matching", labelKey: "navGroups.matching" },
  { id: "filters", labelKey: "navGroups.filters" },
  { id: "trust", labelKey: "navGroups.trust" },
  { id: "system", labelKey: "navGroups.system" },
];

export const PROFILE_COMPLETENESS_SECTIONS: ProfileSectionId[] = [
  "location",
  "employment",
  "background",
  "intent",
];

/** First-time setup wizard section order. */
export const PROFILE_SETUP_SECTIONS: ProfileSectionId[] = [
  "location",
  "employment",
  "background",
  "intent",
];
