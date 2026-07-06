"use client";

import { Sparkles } from "lucide-react";
import {
  PROFILE_INTENT_PRESETS,
  type ProfileIntentPresetId,
} from "@/lib/profile-intent-suggestions";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function ProfileIntentPresetCards({
  onApply,
  activePreset,
}: {
  onApply: (presetId: ProfileIntentPresetId) => void;
  activePreset?: ProfileIntentPresetId | null;
}) {
  const { t } = useTranslations("profile");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        {t("presets.title")}
      </div>
      <p className="text-xs text-muted-foreground">{t("presets.description")}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_INTENT_PRESETS.map((preset) => {
          const selected = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApply(preset.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/40",
              )}
            >
              <p className="text-sm font-medium">{t(preset.titleKey)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(preset.descriptionKey)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
