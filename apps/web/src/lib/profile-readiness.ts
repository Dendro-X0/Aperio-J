import type { SeekerProfile } from "@aperio-j/core";
import type { ProfileSettingsForm } from "@/lib/profile-form";

const PLACEHOLDER_INDUSTRY = "未指定";
const PLACEHOLDER_TITLE = "工作经历";
const OPEN_ROLE = "不限";

export function isDiscoveryReadyForm(form: ProfileSettingsForm): boolean {
  return form.industries.length > 0 && form.occupations.length > 0;
}

export function isDiscoveryReadyProfile(profile: SeekerProfile): boolean {
  const hasIndustry =
    profile.intent.desiredIndustries.some(
      (value) => value.trim() && value !== PLACEHOLDER_INDUSTRY,
    ) ||
    profile.artifacts.some(
      (artifact) => artifact.industry.trim() && artifact.industry !== PLACEHOLDER_INDUSTRY,
    );

  const hasOccupation =
    profile.artifacts.some(
      (artifact) => artifact.title.trim() && artifact.title !== PLACEHOLDER_TITLE,
    ) ||
    profile.intent.desiredRoles.some((role) => role.trim() && role !== OPEN_ROLE);

  return hasIndustry && hasOccupation;
}

export function discoveryMissingFields(
  form: ProfileSettingsForm,
): ("industry" | "occupation")[] {
  const missing: ("industry" | "occupation")[] = [];
  if (form.industries.length === 0) missing.push("industry");
  if (form.occupations.length === 0) missing.push("occupation");
  return missing;
}
