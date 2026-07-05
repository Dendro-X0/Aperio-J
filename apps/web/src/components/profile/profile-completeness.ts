import type { ProfileSettingsForm } from "@/lib/profile-form";
import { isDiscoveryReadyForm } from "@/lib/profile-readiness";
import type { ProfileSectionId } from "@/components/profile/profile-sections";

export function isProfileSectionComplete(
  section: ProfileSectionId,
  form: ProfileSettingsForm,
): boolean {
  switch (section) {
    case "location":
      // Empty cities = valid remote-only mode
      return true;
    case "employment":
      return form.employmentTypes.length > 0;
    case "background":
      return isDiscoveryReadyForm(form);
    case "intent":
      return Boolean(form.desiredRolesText.trim());
    default:
      return true;
  }
}

export function profileCompletenessScore(form: ProfileSettingsForm): {
  completed: number;
  total: number;
  sections: ProfileSectionId[];
} {
  const sections: ProfileSectionId[] = ["location", "employment", "background", "intent"];
  const completed = sections.filter((id) => isProfileSectionComplete(id, form)).length;
  return { completed, total: sections.length, sections };
}
