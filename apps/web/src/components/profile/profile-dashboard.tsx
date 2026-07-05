"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  EMPTY_PROFILE_FORM,
  type ProfileSettingsForm as ProfileFormState,
} from "@/lib/profile-form";
import { isProfileFormDirty } from "@/lib/profile-form-dirty";
import { isDiscoveryReadyForm } from "@/lib/profile-readiness";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useTranslations, useI18n } from "@/i18n/provider";
import { CityTagsInput, type CityTagsInputHandle } from "@/components/profile/city-tags-input";
import { AutocompleteTagsInput } from "@/components/profile/autocomplete-tags-input";
import { IndustryCatalogDialog } from "@/components/profile/industry-catalog-dialog";
import { ProfileFieldCard } from "@/components/profile/profile-field-card";
import { RemotePreferenceField } from "@/components/profile/remote-preference-field";
import { LocalDataPanel } from "@/components/profile/local-data-panel";
import { ConnectorSettingsPanel } from "@/components/profile/connector-settings-panel";
import type { ConnectorCredentialSettings } from "@/lib/local-settings-store";
import { industryOptions } from "@/lib/industry-options";
import { roleSuggestionsForIndustries } from "@/lib/role-options";
import { splitProfileList } from "@/lib/profile-form";
import {
  PROFILE_NAV_GROUPS,
  PROFILE_SECTIONS,
  PROFILE_SETUP_SECTIONS,
  type ProfileSectionId,
} from "@/components/profile/profile-sections";
import {
  isProfileSectionComplete,
  profileCompletenessScore,
} from "@/components/profile/profile-completeness";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

function FirstSetupGuide({
  form,
  onJumpToSection,
}: {
  form: ProfileFormState;
  onJumpToSection: (section: ProfileSectionId) => void;
}) {
  const { t } = useTranslations("profile");
  const steps: {
    id: ProfileSectionId;
    labelKey:
      | "setupSteps.location"
      | "setupSteps.employment"
      | "setupSteps.portfolio"
      | "setupSteps.preferences";
  }[] = [
    { id: "location", labelKey: "setupSteps.location" },
    { id: "employment", labelKey: "setupSteps.employment" },
    { id: "background", labelKey: "setupSteps.portfolio" },
    { id: "intent", labelKey: "setupSteps.preferences" },
  ];

  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => {
        const done = isProfileSectionComplete(step.id, form);
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onJumpToSection(step.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                done
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/20 hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="text-muted-foreground">{t(step.labelKey)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export interface ProfileDashboardProps {
  initialForm?: ProfileFormState;
  profileId?: string;
  isFirstSetup?: boolean;
  initialConnectorSettings?: ConnectorCredentialSettings | null;
}

function CompletenessBar({
  form,
  activeSection,
  onJumpToSection,
}: {
  form: ProfileFormState;
  activeSection: ProfileSectionId;
  onJumpToSection: (section: ProfileSectionId) => void;
}) {
  const { t } = useTranslations("profile");
  const score = profileCompletenessScore(form);
  const percent = Math.round((score.completed / score.total) * 100);

  if (!score.sections.includes(activeSection) || score.completed === score.total) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("completeness.label")}</span>
        <span className="tabular-nums">
          {t("completeness.fraction", { completed: score.completed, total: score.total })}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {score.sections.map((sectionId) => {
          const done = isProfileSectionComplete(sectionId, form);
          return (
            <button
              key={sectionId}
              type="button"
              onClick={() => onJumpToSection(sectionId)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide transition-colors hover:opacity-90",
                done
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/20",
              )}
            >
              {done && <Check className="h-3 w-3" aria-hidden />}
              {t(`completeness.${sectionId}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProfileDashboard({
  initialForm = EMPTY_PROFILE_FORM,
  profileId,
  isFirstSetup = false,
  initialConnectorSettings = null,
}: ProfileDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupRequired = searchParams.get("setup") === "required";
  const { locale } = useI18n();
  const { t } = useTranslations("profile");
  const { t: tEnums } = useTranslations("enums");
  const { t: tTrust } = useTranslations("profile.trust");

  const [baselineForm, setBaselineForm] = useState(initialForm);
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>("location");
  const [navQuery, setNavQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"save" | "pipeline">("save");
  const [discoveryPromptOpen, setDiscoveryPromptOpen] = useState(false);
  const [discoveryPromptReason, setDiscoveryPromptReason] = useState<"save" | "location">("save");
  const [error, setError] = useState<string | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [industryCatalogOpen, setIndustryCatalogOpen] = useState(false);
  const cityInputRef = useRef<CityTagsInputHandle>(null);

  const industrySuggestions = useMemo(
    () => industryOptions(locale).map((option) => option.label),
    [locale],
  );
  const roleSuggestions = useMemo(
    () => roleSuggestionsForIndustries(form.industries, locale),
    [form.industries, locale],
  );

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (section && PROFILE_SECTIONS.some((item) => item.id === section)) {
      setActiveSection(section as ProfileSectionId);
    }
  }, []);

  const isDirty = useMemo(
    () => isProfileFormDirty(form, baselineForm),
    [form, baselineForm],
  );

  const requestLeave = useCallback((href: string) => {
    setPendingHref(href);
    setUnsavedOpen(true);
  }, []);

  useUnsavedChanges(isDirty && activeSection !== "reset", requestLeave);

  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        PROFILE_SECTIONS.map((section) => [section.id, t(section.labelKey)]),
      ) as Record<ProfileSectionId, string>,
    [t],
  );

  const filteredGroups = useMemo(() => {
    const query = navQuery.trim().toLowerCase();
    const availableSections = isFirstSetup
      ? PROFILE_SECTIONS.filter((section) => PROFILE_SETUP_SECTIONS.includes(section.id))
      : PROFILE_SECTIONS;

    return PROFILE_NAV_GROUPS.map((group) => ({
      ...group,
      sections: availableSections.filter((section) => {
        if (section.group !== group.id) return false;
        if (!query) return true;
        return sectionLabels[section.id].toLowerCase().includes(query);
      }),
    })).filter((group) => group.sections.length > 0);
  }, [navQuery, sectionLabels, isFirstSetup]);

  function selectSection(section: ProfileSectionId) {
    setActiveSection(section);
    const params = new URLSearchParams(window.location.search);
    params.set("section", section);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  function addIndustry(label: string) {
    setForm((prev) => {
      if (prev.industries.some((item) => item.toLowerCase() === label.toLowerCase())) {
        return prev;
      }
      return { ...prev, industries: [...prev.industries, label] };
    });
  }

  function addOccupationSuggestion(label: string) {
    setForm((prev) => {
      if (prev.occupations.some((item) => item.toLowerCase() === label.toLowerCase())) {
        return prev;
      }
      return { ...prev, occupations: [...prev.occupations, label] };
    });
  }

  function updateField<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleEmployment(type: ProfileFormState["employmentTypes"][number]) {
    setForm((prev) => ({
      ...prev,
      employmentTypes: prev.employmentTypes.includes(type)
        ? prev.employmentTypes.filter((item) => item !== type)
        : [...prev.employmentTypes, type],
    }));
  }

  function handleCancel() {
    if (isDirty) {
      requestLeave("/inbox");
      return;
    }
    router.push("/inbox");
  }

  function confirmLeave() {
    const href = pendingHref ?? "/inbox";
    setUnsavedOpen(false);
    setPendingHref(null);
    router.push(href);
  }

  async function resetProfile() {
    setResetting(true);
    setError(null);

    try {
      const response = await fetch("/api/data/reset", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? t("reset.error"));
      }
      setResetConfirmOpen(false);
      window.location.href = "/settings";
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : t("reset.error"));
    } finally {
      setResetting(false);
    }
  }

  async function skipSetup() {
    setSkipping(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skip: true, profileId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? t("errors.skipFailed"));
      }

      router.push("/inbox");
      router.refresh();
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : t("errors.skipFailed"));
    } finally {
      setSkipping(false);
    }
  }

  const discoveryReady = isDiscoveryReadyForm(form);
  const setupStepIndex = PROFILE_SETUP_SECTIONS.indexOf(activeSection);
  const inSetupWizard = isFirstSetup && setupStepIndex >= 0;
  const setupStepNumber = setupStepIndex >= 0 ? setupStepIndex + 1 : 1;
  const isLastSetupStep = setupStepIndex === PROFILE_SETUP_SECTIONS.length - 1;

  function goToPreviousSetupStep() {
    if (setupStepIndex > 0) {
      selectSection(PROFILE_SETUP_SECTIONS[setupStepIndex - 1]);
    }
  }

  function goToNextSetupStep() {
    if (setupStepIndex >= 0 && setupStepIndex < PROFILE_SETUP_SECTIONS.length - 1) {
      selectSection(PROFILE_SETUP_SECTIONS[setupStepIndex + 1]);
    }
  }

  async function submit(options?: { runPipeline?: boolean }) {
    const runPipeline = options?.runPipeline ?? false;
    setSubmitMode(runPipeline ? "pipeline" : "save");
    setSubmitting(true);
    setError(null);

    const committedCities = cityInputRef.current?.commitDraft() ?? form.cities;
    const formToSave =
      committedCities !== form.cities ? { ...form, cities: committedCities } : form;

    if (formToSave !== form) {
      setForm(formToSave);
    }

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: formToSave,
          profileId,
          complete: true,
          runPipeline,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        locationChanged?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? t("errors.saveFailed"));
      }

      setBaselineForm(formToSave);

      if (runPipeline) {
        router.replace("/inbox?discover=1");
        return;
      }

      if (isDiscoveryReadyForm(formToSave)) {
        setDiscoveryPromptReason(payload.locationChanged ? "location" : "save");
        setDiscoveryPromptOpen(true);
      } else if (isFirstSetup) {
        router.replace("/inbox");
      } else {
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDiscoveryRun() {
    setDiscoveryPromptOpen(false);
    router.push("/inbox?discover=1");
    router.refresh();
  }

  function dismissDiscoveryPrompt() {
    setDiscoveryPromptOpen(false);
    if (isFirstSetup) {
      router.push("/inbox");
      router.refresh();
    }
  }

  function renderSectionContent() {
    switch (activeSection) {
      case "location":
        return (
          <div className="space-y-4">
            <ProfileFieldCard
              title={t("location.citiesLabel")}
              description={t("sectionDesc.location")}
            >
              <CityTagsInput
                ref={cityInputRef}
                value={form.cities}
                onChange={(cities) => updateField("cities", cities)}
              />
            </ProfileFieldCard>
            {form.cities.length > 0 && (
              <ProfileFieldCard
                title={t("remotePreference.label")}
                description={t("remotePreference.sectionDesc")}
              >
                <RemotePreferenceField
                  value={form.remotePreference}
                  onChange={(remotePreference) => updateField("remotePreference", remotePreference)}
                />
              </ProfileFieldCard>
            )}
          </div>
        );
      case "employment":
        return (
          <ProfileFieldCard title={sectionLabels.employment} description={t("sectionDesc.employment")}>
            <div className="flex flex-wrap gap-2">
              {(["full-time", "part-time", "contract"] as const).map((type) => (
                <Toggle
                  key={type}
                  pressed={form.employmentTypes.includes(type)}
                  onPressedChange={() => toggleEmployment(type)}
                  variant="outline"
                  className="data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  {tEnums(`employmentType.${type}` as "employmentType.full-time")}
                </Toggle>
              ))}
            </div>
          </ProfileFieldCard>
        );
      case "background":
        return (
          <div className="space-y-4">
            <ProfileFieldCard
              title={t("industry")}
              description={t("industryHint")}
              required
            >
              <AutocompleteTagsInput
                id="industries"
                value={form.industries}
                onChange={(tags) => updateField("industries", tags)}
                suggestions={industrySuggestions}
                placeholder={t("tags.industryPlaceholder")}
                allowCustom
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIndustryCatalogOpen(true)}
              >
                {t("industryPicker.title")}
              </Button>
            </ProfileFieldCard>
            <ProfileFieldCard
              title={t("occupation")}
              description={t("occupationHint")}
              required
            >
              <AutocompleteTagsInput
                id="occupations"
                value={form.occupations}
                onChange={(tags) => updateField("occupations", tags)}
                suggestions={roleSuggestions}
                placeholder={t("tags.rolePlaceholder")}
                allowCustom
              />
              {roleSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {roleSuggestions.slice(0, 8).map((label) => {
                    const selected = form.occupations.some(
                      (item) => item.toLowerCase() === label.toLowerCase(),
                    );
                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={selected}
                        onClick={() => addOccupationSuggestion(label)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs transition-colors",
                          selected
                            ? "cursor-default border-primary/30 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </ProfileFieldCard>
            <ProfileFieldCard
              title={t("background")}
              description={t("backgroundFieldDesc")}
            >
              <Textarea
                id="backgroundText"
                rows={5}
                value={form.backgroundText}
                onChange={(e) => updateField("backgroundText", e.target.value)}
                placeholder={t("backgroundPlaceholder")}
              />
            </ProfileFieldCard>
          </div>
        );
      case "intent":
        return (
          <ProfileFieldCard title={sectionLabels.intent} description={t("sectionDesc.intent")}>
            <AutocompleteTagsInput
              id="desiredRoles"
              value={splitProfileList(form.desiredRolesText)}
              onChange={(tags) => updateField("desiredRolesText", tags.join(", "))}
              suggestions={roleSuggestions}
              placeholder={t("tags.rolesPlaceholder")}
              allowCustom
            />
          </ProfileFieldCard>
        );
      case "exclusions":
        return (
          <div className="space-y-4">
            <ProfileFieldCard title={t("avoidRoles")} description={t("sectionDesc.exclusions")}>
              <AutocompleteTagsInput
                id="avoidText"
                value={splitProfileList(form.avoidText)}
                onChange={(tags) => updateField("avoidText", tags.join(", "))}
                suggestions={roleSuggestions}
                placeholder={t("avoidRolesPlaceholder")}
                allowCustom
              />
            </ProfileFieldCard>
            <ProfileFieldCard title={t("exclusionTogglesTitle")} description={t("exclusionTogglesDesc")}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="excludeProductionLine" className="flex-1 cursor-pointer">
                    {t("excludeProductionLine")}
                  </Label>
                  <Switch
                    id="excludeProductionLine"
                    checked={form.excludeProductionLine}
                    onCheckedChange={(checked) =>
                      updateField("excludeProductionLine", Boolean(checked))
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="excludeSales" className="flex-1 cursor-pointer">
                    {t("excludeSales")}
                  </Label>
                  <Switch
                    id="excludeSales"
                    checked={form.excludeSales}
                    onCheckedChange={(checked) => updateField("excludeSales", Boolean(checked))}
                  />
                </div>
              </div>
            </ProfileFieldCard>
          </div>
        );
      case "connectors":
        return <ConnectorSettingsPanel initialSettings={initialConnectorSettings} />;
      case "trust":
        return (
          <div className="space-y-3">
            <ProfileFieldCard
              title={tTrust("hideRedFlags")}
              description={t("trust.hideRedFlagsDesc")}
            >
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="hideRedFlagListings" className="flex-1 cursor-pointer text-sm">
                  {t("trust.hideRedFlagsToggle")}
                </Label>
                <Switch
                  id="hideRedFlagListings"
                  checked={form.hideRedFlagListings}
                  onCheckedChange={(checked) =>
                    updateField("hideRedFlagListings", Boolean(checked))
                  }
                />
              </div>
            </ProfileFieldCard>
            <ProfileFieldCard
              title={tTrust("preferDirectHire")}
              description={t("trust.preferDirectHireDesc")}
            >
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="preferDirectHire" className="flex-1 cursor-pointer text-sm">
                  {t("trust.preferDirectHireToggle")}
                </Label>
                <Switch
                  id="preferDirectHire"
                  checked={form.preferDirectHire}
                  onCheckedChange={(checked) =>
                    updateField("preferDirectHire", Boolean(checked))
                  }
                />
              </div>
            </ProfileFieldCard>
            <ProfileFieldCard
              title={tTrust("filterAgency")}
              description={t("trust.filterAgencyDesc")}
            >
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="allowAgencyPostings" className="flex-1 cursor-pointer text-sm">
                  {t("trust.allowAgencyToggle")}
                </Label>
                <Switch
                  id="allowAgencyPostings"
                  checked={form.allowAgencyPostings}
                  onCheckedChange={(checked) =>
                    updateField("allowAgencyPostings", Boolean(checked))
                  }
                />
              </div>
            </ProfileFieldCard>
            <p className="text-sm text-muted-foreground">{t("trustNote")}</p>
          </div>
        );
      case "reset":
        return (
          <LocalDataPanel
            resetting={resetting}
            onResetClick={() => setResetConfirmOpen(true)}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {setupRequired && isFirstSetup && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm">
            <p className="font-medium">{t("setupRedirect.title")}</p>
            <p className="mt-1 text-muted-foreground">{t("setupRedirect.description")}</p>
          </CardContent>
        </Card>
      )}
      <div className="space-y-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isFirstSetup ? (
            <>
              <span className="font-medium text-foreground">{t("firstSetupTitle")}</span>
              {" — "}
              {t("firstSetupDescription")}
            </>
          ) : (
            t("description")
          )}
        </p>
        {isFirstSetup && (
          <FirstSetupGuide form={form} onJumpToSection={selectSection} />
        )}
      </div>

      <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-3 py-2 lg:hidden">
          <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(isFirstSetup
              ? PROFILE_SETUP_SECTIONS
              : PROFILE_SECTIONS.map((section) => section.id)
            ).map((sectionId) => {
              const section = PROFILE_SECTIONS.find((item) => item.id === sectionId);
              if (!section) return null;
              const selected = activeSection === section.id;
              const done =
                section.completenessKey && isProfileSectionComplete(section.id, form);
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectSection(section.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {sectionLabels[section.id]}
                  {done && <Check className="h-3 w-3" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:min-h-[36rem] lg:flex-row">
          <aside className="hidden w-full shrink-0 border-b bg-muted/20 lg:block lg:w-64 lg:border-b-0 lg:border-r">
            <div className="p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={navQuery}
                  onChange={(e) => setNavQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="pl-8"
                  aria-label={t("searchPlaceholder")}
                />
              </div>
            </div>

            <nav aria-label={t("title")} className="space-y-4 px-2 pb-4 lg:px-3">
              {filteredGroups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(group.labelKey)}
                  </p>
                  <ul className="space-y-0.5">
                    {group.sections.map((section) => {
                      const Icon = section.icon;
                      const selected = activeSection === section.id;
                      const done =
                        section.completenessKey &&
                        isProfileSectionComplete(section.id, form);
                      return (
                        <li key={section.id}>
                          <button
                            type="button"
                            onClick={() => selectSection(section.id)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                              selected
                                ? "bg-primary/10 font-medium text-primary shadow-[inset_2px_0_0_0_var(--primary)]"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              {sectionLabels[section.id]}
                            </span>
                            {done && (
                              <Check
                                className="h-3.5 w-3.5 shrink-0 text-primary"
                                aria-hidden
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {sectionLabels[activeSection]}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`sectionDesc.${activeSection}`)}
                  </p>
                </div>
                {inSetupWizard && (
                  <p className="shrink-0 text-xs font-medium text-muted-foreground">
                    {t("setupProgress", {
                      current: setupStepNumber,
                      total: PROFILE_SETUP_SECTIONS.length,
                    })}
                  </p>
                )}
              </div>
              <CompletenessBar
                form={form}
                activeSection={activeSection}
                onJumpToSection={selectSection}
              />
            </header>

            <div className="flex-1 px-5 py-5 sm:px-6">{renderSectionContent()}</div>

            <footer className="flex flex-col gap-3 border-t bg-muted/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-center gap-2 sm:mr-auto">
                {error && <p className="text-sm text-destructive">{error}</p>}
                {isDirty && !error && activeSection !== "reset" && (
                  <p className="text-xs text-muted-foreground">{t("unsaved.hint")}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {inSetupWizard && setupStepIndex > 0 && (
                  <Button
                    variant="outline"
                    type="button"
                    disabled={submitting || skipping}
                    onClick={goToPreviousSetupStep}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    {t("wizard.back")}
                  </Button>
                )}
                {activeSection !== "reset" && isFirstSetup && (
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={submitting || skipping}
                    onClick={skipSetup}
                  >
                    {skipping ? t("skipping") : t("skipSetup")}
                  </Button>
                )}
                {activeSection !== "reset" && !isFirstSetup && (
                  <Button variant="ghost" type="button" onClick={handleCancel}>
                    {t("cancel")}
                  </Button>
                )}
                {inSetupWizard && !isLastSetupStep && (
                  <Button type="button" onClick={goToNextSetupStep}>
                    {t("wizard.next")}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                )}
                {activeSection !== "reset" && (!inSetupWizard || isLastSetupStep) && (
                  <>
                    <Button
                      type="button"
                      variant={isFirstSetup ? "outline" : "default"}
                      disabled={submitting || (!isFirstSetup && !isDirty)}
                      onClick={() => submit()}
                    >
                      {submitting && submitMode === "save" ? t("saving") : t("save")}
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting || !discoveryReady}
                      onClick={() => submit({ runPipeline: true })}
                    >
                      {submitting && submitMode === "pipeline"
                        ? t("saving")
                        : t("submit")}
                    </Button>
                  </>
                )}
              </div>
            </footer>
          </div>
        </div>
      </div>

      <Dialog open={discoveryPromptOpen} onOpenChange={setDiscoveryPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {discoveryPromptReason === "location"
                ? t("discoveryPrompt.locationTitle")
                : t("discoveryPrompt.title")}
            </DialogTitle>
            <DialogDescription>
              {discoveryPromptReason === "location"
                ? t("discoveryPrompt.locationDescription")
                : t("discoveryPrompt.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={dismissDiscoveryPrompt}>
              {t("discoveryPrompt.later")}
            </Button>
            <Button onClick={confirmDiscoveryRun}>{t("discoveryPrompt.run")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unsaved.title")}</DialogTitle>
            <DialogDescription>{t("unsaved.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsavedOpen(false)}>
              {t("unsaved.stay")}
            </Button>
            <Button variant="destructive" onClick={confirmLeave}>
              {t("unsaved.leave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reset.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("reset.confirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>
              {t("reset.cancel")}
            </Button>
            <Button variant="destructive" disabled={resetting} onClick={resetProfile}>
              {resetting ? t("reset.resetting") : t("reset.confirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IndustryCatalogDialog
        open={industryCatalogOpen}
        onOpenChange={setIndustryCatalogOpen}
        selected={form.industries}
        onAdd={addIndustry}
      />
    </div>
  );
}

/** @deprecated Use ProfileDashboard */
export const ProfileSettingsForm = ProfileDashboard;
