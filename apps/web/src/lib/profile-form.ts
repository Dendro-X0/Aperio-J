import type {
  EducationLevel,
  EmploymentType,
  EvidenceArtifact,
  IndustryProximity,
  RemotePreference,
  SeekerProfile,
} from "@aperio-j/core";
import { inferCapabilitiesFromArtifacts } from "@aperio-j/discovery/transferable";

/** Single-page settings form — no wizard, no third-party import. */
export interface ProfileSettingsForm {
  /** One or more city tags; first is primary for legacy constraints. */
  cities: string[];
  remotePreference: RemotePreference;
  employmentTypes: EmploymentType[];
  /** Taxonomy industry labels or custom text — required for discovery. */
  industries: string[];
  /** Current/target occupations — required for discovery. */
  occupations: string[];
  /** Free text: past work + skills (optional portfolio detail). */
  backgroundText: string;
  /** Comma-separated roles to explore. */
  desiredRolesText: string;
  /** Comma-separated roles/phrases to avoid. */
  avoidText: string;
  excludeProductionLine: boolean;
  excludeSales: boolean;
  hideRedFlagListings: boolean;
  preferDirectHire: boolean;
  allowAgencyPostings: boolean;
}

export const DEFAULT_TRUST = {
  allowAgencyPostings: false,
  hideRedFlagListings: true,
  preferDirectHire: true,
  excludeFoodService: false,
  industryProximity: "open-to-any" as IndustryProximity,
  educationLevel: "high-school" as EducationLevel,
};

export const EMPTY_PROFILE_FORM: ProfileSettingsForm = {
  cities: [],
  remotePreference: "remote-only",
  employmentTypes: ["full-time"],
  industries: [],
  occupations: [],
  backgroundText: "",
  desiredRolesText: "",
  avoidText: "",
  excludeProductionLine: false,
  excludeSales: false,
  hideRedFlagListings: DEFAULT_TRUST.hideRedFlagListings,
  preferDirectHire: DEFAULT_TRUST.preferDirectHire,
  allowAgencyPostings: DEFAULT_TRUST.allowAgencyPostings,
};

function splitList(value: string): string[] {
  return value
    .split(/[,，、\n;；]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function splitProfileList(value: string): string[] {
  return splitList(value);
}

function backgroundToArtifacts(
  text: string,
  occupations: string[],
  industries: string[],
): EvidenceArtifact[] {
  const trimmed = text.trim();
  const primaryOcc = occupations[0]?.trim() ?? "";
  const primaryInd = industries[0]?.trim() || "未指定";

  if (!trimmed && occupations.length === 0) return [];

  if (!trimmed) {
    return occupations.map((occupation, index) => ({
      id: `art-${index + 1}`,
      title: occupation.trim(),
      industry: industries[index]?.trim() || primaryInd,
      duties: occupation.trim(),
      tools: [],
      period: "未指定",
    }));
  }

  const lines = trimmed.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const duties = lines.length > 1 ? lines.slice(1).join("；") : trimmed;
  const title = primaryOcc || (lines[0]?.slice(0, 80) ?? "工作经历");

  return [
    {
      id: "art-1",
      title: title.length > 40 && !primaryOcc ? "工作经历" : title,
      industry: primaryInd,
      duties: duties || trimmed,
      tools: [],
      period: "未指定",
    },
  ];
}

function backgroundToSkillTokens(text: string): string[] {
  return splitList(text.replace(/\n/g, ","));
}

export function buildSeekerProfileFromSettings(
  form: ProfileSettingsForm,
  id: string,
): SeekerProfile {
  const cities = form.cities.map((city) => city.trim()).filter(Boolean);
  const industries = form.industries.map((value) => value.trim()).filter(Boolean);
  const occupations = form.occupations.map((value) => value.trim()).filter(Boolean);
  const remotePreference =
    cities.length === 0
      ? "remote-only"
      : form.remotePreference === "remote-only"
        ? "hybrid-ok"
        : form.remotePreference;
  const artifacts = backgroundToArtifacts(form.backgroundText, occupations, industries);
  const skillTokens = backgroundToSkillTokens(form.backgroundText);
  const desiredRolesFromText = splitList(form.desiredRolesText);
  const desiredRoles =
    desiredRolesFromText.length > 0
      ? desiredRolesFromText
      : occupations.length > 0
        ? occupations
        : ["不限"];
  const avoidParts = splitList(form.avoidText);

  const inferredCapabilities = inferCapabilitiesFromArtifacts(artifacts);

  return {
    id,
    constraints: {
      primaryCity: cities[0] ?? "",
      acceptableCities: cities.slice(1),
      remotePreference,
      employmentTypes:
        form.employmentTypes.length > 0 ? form.employmentTypes : ["full-time"],
      allowAgencyPostings: form.allowAgencyPostings,
      hideRedFlagListings: form.hideRedFlagListings,
      preferDirectHire: form.preferDirectHire,
    },
    intent: {
      desiredRoles,
      desiredIndustries: industries,
      avoidRoles: avoidParts,
      avoidPhrases: avoidParts,
      industryProximity: DEFAULT_TRUST.industryProximity,
      excludeProductionLine: form.excludeProductionLine,
      excludeSales: form.excludeSales,
      excludeFoodService: DEFAULT_TRUST.excludeFoodService,
    },
    artifacts,
    skillTokens,
    certificates: [],
    experienceYears: 0,
    educationLevel: DEFAULT_TRUST.educationLevel,
    languages: [],
    inferredCapabilities,
    seekerDigest: [...cities.slice(0, 1), ...industries, ...occupations].filter(Boolean).join(" · "),
  };
}

export function settingsFormFromProfile(profile: SeekerProfile): ProfileSettingsForm {
  const artifact = profile.artifacts[0];
  const backgroundText =
    artifact != null
      ? [artifact.duties, ...profile.skillTokens].filter(Boolean).join("\n")
      : profile.skillTokens.join(", ");

  const industries = profile.intent.desiredIndustries
    .map((value) => value.trim())
    .filter((value) => value && value !== "未指定");

  const artifactIndustries = profile.artifacts
    .map((item) => item.industry.trim())
    .filter((value) => value && value !== "未指定");

  const occupationsFromArtifacts = profile.artifacts
    .map((item) => item.title.trim())
    .filter((value) => value && value !== "工作经历");

  const occupationsFromRoles = profile.intent.desiredRoles.filter(
    (role) => role.trim() && role !== "不限",
  );

  const occupations =
    occupationsFromArtifacts.length > 0 ? occupationsFromArtifacts : occupationsFromRoles;

  const cities = [
    profile.constraints.primaryCity,
    ...profile.constraints.acceptableCities,
  ].filter(Boolean);

  return {
    cities,
    remotePreference: profile.constraints.remotePreference,
    employmentTypes: profile.constraints.employmentTypes.filter(
      (t) => t !== "unknown",
    ) as EmploymentType[],
    industries: [...new Set(industries.length > 0 ? industries : artifactIndustries)],
    occupations: [...new Set(occupations)],
    backgroundText,
    desiredRolesText: profile.intent.desiredRoles.filter((r) => r !== "不限").join(", "),
    avoidText: [...new Set([...profile.intent.avoidRoles, ...profile.intent.avoidPhrases])].join(
      ", ",
    ),
    excludeProductionLine: profile.intent.excludeProductionLine,
    excludeSales: profile.intent.excludeSales,
    hideRedFlagListings: profile.constraints.hideRedFlagListings,
    preferDirectHire: profile.constraints.preferDirectHire,
    allowAgencyPostings: profile.constraints.allowAgencyPostings,
  };
}

/** @deprecated Use ProfileSettingsForm */
export type OnboardingFormState = ProfileSettingsForm;
