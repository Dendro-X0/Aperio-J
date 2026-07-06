"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/provider";
import { ProfileFieldCard } from "@/components/profile/profile-field-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CnSessionCredentialSettings } from "@/lib/local-settings-store";

export function CnSessionSettingsPanel({
  initialSettings,
}: {
  initialSettings: CnSessionCredentialSettings | null;
}) {
  const { t } = useTranslations("settings.cnSession");
  const [zhipinCookie, setZhipinCookie] = useState("");
  const [zhaopinCookie, setZhaopinCookie] = useState("");
  const [cookie58, setCookie58] = useState("");
  const [configured, setConfigured] = useState(initialSettings?.configured ?? false);
  const [hasZhipinCookie, setHasZhipinCookie] = useState(initialSettings?.hasZhipinCookie ?? false);
  const [hasZhaopinCookie, setHasZhaopinCookie] = useState(initialSettings?.hasZhaopinCookie ?? false);
  const [has58Cookie, setHas58Cookie] = useState(initialSettings?.has58Cookie ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveSession(payload: {
    zhipinCookie?: string | null;
    zhaopinCookie?: string | null;
    cookie58?: string | null;
  }) {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/settings/cn-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as CnSessionCredentialSettings & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("saveFailed"));
      }

      setConfigured(body.configured);
      setHasZhipinCookie(body.hasZhipinCookie);
      setHasZhaopinCookie(body.hasZhaopinCookie);
      setHas58Cookie(body.has58Cookie);
      setZhipinCookie("");
      setZhaopinCookie("");
      setCookie58("");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileFieldCard title={t("title")} description={t("description")}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("warning")}</p>

        <div className="space-y-2">
          <Label htmlFor="cnZhipinCookie">{t("zhipinLabel")}</Label>
          <Input
            id="cnZhipinCookie"
            value={zhipinCookie}
            onChange={(e) => setZhipinCookie(e.target.value)}
            placeholder={hasZhipinCookie ? t("secretKeepHint") : t("cookiePlaceholder")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnZhaopinCookie">{t("zhaopinLabel")}</Label>
          <Input
            id="cnZhaopinCookie"
            value={zhaopinCookie}
            onChange={(e) => setZhaopinCookie(e.target.value)}
            placeholder={hasZhaopinCookie ? t("secretKeepHint") : t("cookiePlaceholder")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cn58Cookie">{t("cookie58Label")}</Label>
          <Input
            id="cn58Cookie"
            value={cookie58}
            onChange={(e) => setCookie58(e.target.value)}
            placeholder={has58Cookie ? t("secretKeepHint") : t("cookiePlaceholder")}
            autoComplete="off"
          />
        </div>

        {configured && <p className="text-xs text-muted-foreground">{t("configuredNote")}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-primary">{t("saved")}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={saving || (!zhipinCookie.trim() && !zhaopinCookie.trim() && !cookie58.trim())}
            onClick={() =>
              saveSession({
                zhipinCookie: zhipinCookie.trim() || undefined,
                zhaopinCookie: zhaopinCookie.trim() || undefined,
                cookie58: cookie58.trim() || undefined,
              })
            }
          >
            {saving ? t("saving") : t("save")}
          </Button>
          {configured && (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => saveSession({ zhipinCookie: null, zhaopinCookie: null, cookie58: null })}
            >
              {t("clear")}
            </Button>
          )}
        </div>
      </div>
    </ProfileFieldCard>
  );
}
