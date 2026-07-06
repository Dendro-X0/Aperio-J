import type { ProfileSettingsForm } from "@/lib/profile-form";
import { cityIdentityKey } from "@aperio-j/core";

function normalizeForm(form: ProfileSettingsForm): ProfileSettingsForm {
  return {
    ...form,
    cities: [...form.cities].map((city) => cityIdentityKey(city)).filter(Boolean).sort(),
    industries: [...form.industries].map((value) => value.trim()).filter(Boolean).sort(),
    occupations: [...form.occupations].map((value) => value.trim()).filter(Boolean).sort(),
    backgroundText: form.backgroundText.trim(),
    desiredRolesText: form.desiredRolesText.trim(),
    avoidText: form.avoidText.trim(),
    employmentTypes: [...form.employmentTypes].sort(),
    excludeProductionLine: form.excludeProductionLine,
    excludeSales: form.excludeSales,
    excludeFoodService: form.excludeFoodService,
    hideRedFlagListings: form.hideRedFlagListings,
    preferDirectHire: form.preferDirectHire,
    allowAgencyPostings: form.allowAgencyPostings,
  };
}

export function isProfileFormDirty(
  current: ProfileSettingsForm,
  initial: ProfileSettingsForm,
): boolean {
  return (
    JSON.stringify(normalizeForm(current)) !== JSON.stringify(normalizeForm(initial))
  );
}
