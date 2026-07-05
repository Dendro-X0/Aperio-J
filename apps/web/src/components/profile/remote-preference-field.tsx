"use client";

import type { RemotePreference } from "@aperio-j/core";
import { useTranslations } from "@/i18n/provider";
import { Toggle } from "@/components/ui/toggle";

const OPTIONS: RemotePreference[] = ["remote-only", "hybrid-ok", "onsite-only"];

export function RemotePreferenceField({
  value,
  onChange,
}: {
  value: RemotePreference;
  onChange: (value: RemotePreference) => void;
}) {
  const { t } = useTranslations("profile.remotePreference");

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <Toggle
            key={option}
            pressed={value === option}
            onPressedChange={() => onChange(option)}
            variant="outline"
            className="data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            {t(option)}
          </Toggle>
        ))}
      </div>
    </div>
  );
}
