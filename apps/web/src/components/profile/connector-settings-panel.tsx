"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/provider";
import { ProfileFieldCard } from "@/components/profile/profile-field-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectorCredentialSettings } from "@/lib/local-settings-store";

type SavePayload = {
  adzuna?: { appId?: string; appKey?: string | null };
  reed?: { apiKey?: string | null };
  usajobs?: { apiKey?: string | null; email?: string };
  franceTravail?: { clientId?: string; clientSecret?: string | null };
  worknet?: { authKey?: string | null };
  careerjet?: { apiKey?: string | null };
  jooble?: { apiKey?: string | null };
};

export function ConnectorSettingsPanel({
  initialSettings,
}: {
  initialSettings: ConnectorCredentialSettings | null;
}) {
  const { t } = useTranslations("settings.connectors");
  const [adzunaAppId, setAdzunaAppId] = useState(initialSettings?.adzuna.appId ?? "");
  const [adzunaAppKey, setAdzunaAppKey] = useState("");
  const [adzunaConfigured, setAdzunaConfigured] = useState(
    initialSettings?.adzuna.configured ?? false,
  );
  const [adzunaHasAppKey, setAdzunaHasAppKey] = useState(initialSettings?.adzuna.hasAppKey ?? false);

  const [reedApiKey, setReedApiKey] = useState("");
  const [reedConfigured, setReedConfigured] = useState(initialSettings?.reed.configured ?? false);
  const [reedHasApiKey, setReedHasApiKey] = useState(initialSettings?.reed.hasApiKey ?? false);

  const [usajobsEmail, setUsajobsEmail] = useState(initialSettings?.usajobs.email ?? "");
  const [usajobsApiKey, setUsajobsApiKey] = useState("");
  const [usajobsConfigured, setUsajobsConfigured] = useState(
    initialSettings?.usajobs.configured ?? false,
  );
  const [usajobsHasApiKey, setUsajobsHasApiKey] = useState(
    initialSettings?.usajobs.hasApiKey ?? false,
  );

  const [ftClientId, setFtClientId] = useState(initialSettings?.franceTravail.clientId ?? "");
  const [ftClientSecret, setFtClientSecret] = useState("");
  const [ftConfigured, setFtConfigured] = useState(
    initialSettings?.franceTravail.configured ?? false,
  );
  const [ftHasClientSecret, setFtHasClientSecret] = useState(
    initialSettings?.franceTravail.hasClientSecret ?? false,
  );

  const [worknetAuthKey, setWorknetAuthKey] = useState("");
  const [worknetConfigured, setWorknetConfigured] = useState(
    initialSettings?.worknet.configured ?? false,
  );
  const [worknetHasAuthKey, setWorknetHasAuthKey] = useState(
    initialSettings?.worknet.hasAuthKey ?? false,
  );

  const [careerjetApiKey, setCareerjetApiKey] = useState("");
  const [careerjetConfigured, setCareerjetConfigured] = useState(
    initialSettings?.careerjet.configured ?? false,
  );
  const [careerjetHasApiKey, setCareerjetHasApiKey] = useState(
    initialSettings?.careerjet.hasApiKey ?? false,
  );

  const [joobleApiKey, setJoobleApiKey] = useState("");
  const [joobleConfigured, setJoobleConfigured] = useState(
    initialSettings?.jooble.configured ?? false,
  );
  const [joobleHasApiKey, setJoobleHasApiKey] = useState(
    initialSettings?.jooble.hasApiKey ?? false,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveCredentials(payload: SavePayload) {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/settings/connectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as ConnectorCredentialSettings & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? t("saveFailed"));
      }

      setAdzunaConfigured(body.adzuna.configured);
      setAdzunaHasAppKey(body.adzuna.hasAppKey);
      if (body.adzuna.appId) setAdzunaAppId(body.adzuna.appId);
      setAdzunaAppKey("");

      setReedConfigured(body.reed.configured);
      setReedHasApiKey(body.reed.hasApiKey);
      setReedApiKey("");

      setUsajobsConfigured(body.usajobs.configured);
      setUsajobsHasApiKey(body.usajobs.hasApiKey);
      if (body.usajobs.email) setUsajobsEmail(body.usajobs.email);
      setUsajobsApiKey("");

      setFtConfigured(body.franceTravail.configured);
      setFtHasClientSecret(body.franceTravail.hasClientSecret);
      if (body.franceTravail.clientId) setFtClientId(body.franceTravail.clientId);
      setFtClientSecret("");

      setWorknetConfigured(body.worknet.configured);
      setWorknetHasAuthKey(body.worknet.hasAuthKey);
      setWorknetAuthKey("");

      setCareerjetConfigured(body.careerjet.configured);
      setCareerjetHasApiKey(body.careerjet.hasApiKey);
      setCareerjetApiKey("");

      setJoobleConfigured(body.jooble.configured);
      setJoobleHasApiKey(body.jooble.hasApiKey);
      setJoobleApiKey("");

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <ProfileFieldCard title={t("adzunaTitle")} description={t("adzunaDescription")}>
        <CredentialFields
          fields={[
            {
              id: "adzunaAppId",
              label: t("adzunaAppId"),
              value: adzunaAppId,
              onChange: setAdzunaAppId,
              placeholder: t("adzunaAppIdPlaceholder"),
            },
            {
              id: "adzunaAppKey",
              label: t("adzunaAppKey"),
              value: adzunaAppKey,
              onChange: setAdzunaAppKey,
              type: "password",
              placeholder: adzunaHasAppKey
                ? t("adzunaAppKeyKeepPlaceholder")
                : t("adzunaAppKeyPlaceholder"),
            },
          ]}
          configured={adzunaConfigured}
          configuredLabel={t("adzunaConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearKeys")}
          canSave={Boolean(adzunaAppId.trim())}
          canClear={adzunaHasAppKey}
          onSave={() =>
            saveCredentials({
              adzuna: { appId: adzunaAppId, appKey: adzunaAppKey.trim() || undefined },
            })
          }
          onClear={() => saveCredentials({ adzuna: { appId: adzunaAppId, appKey: null } })}
        />
      </ProfileFieldCard>

      <ProfileFieldCard title={t("reedTitle")} description={t("reedDescription")}>
        <CredentialFields
          fields={[
            {
              id: "reedApiKey",
              label: t("reedApiKey"),
              value: reedApiKey,
              onChange: setReedApiKey,
              type: "password",
              placeholder: reedHasApiKey ? t("secretKeepPlaceholder") : t("reedApiKeyPlaceholder"),
            },
          ]}
          configured={reedConfigured}
          configuredLabel={t("reedConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearReedKey")}
          canSave={Boolean(reedApiKey.trim())}
          canClear={reedHasApiKey}
          onSave={() =>
            saveCredentials({ reed: { apiKey: reedApiKey.trim() || undefined } })
          }
          onClear={() => saveCredentials({ reed: { apiKey: null } })}
        />
      </ProfileFieldCard>

      <ProfileFieldCard title={t("usajobsTitle")} description={t("usajobsDescription")}>
        <CredentialFields
          fields={[
            {
              id: "usajobsEmail",
              label: t("usajobsEmail"),
              value: usajobsEmail,
              onChange: setUsajobsEmail,
              placeholder: t("usajobsEmailPlaceholder"),
            },
            {
              id: "usajobsApiKey",
              label: t("usajobsApiKey"),
              value: usajobsApiKey,
              onChange: setUsajobsApiKey,
              type: "password",
              placeholder: usajobsHasApiKey
                ? t("secretKeepPlaceholder")
                : t("usajobsApiKeyPlaceholder"),
            },
          ]}
          configured={usajobsConfigured}
          configuredLabel={t("usajobsConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearUsajobsKeys")}
          canSave={Boolean(usajobsEmail.trim()) && (Boolean(usajobsApiKey.trim()) || usajobsHasApiKey)}
          canClear={usajobsHasApiKey}
          onSave={() =>
            saveCredentials({
              usajobs: {
                email: usajobsEmail,
                apiKey: usajobsApiKey.trim() || undefined,
              },
            })
          }
          onClear={() => saveCredentials({ usajobs: { email: usajobsEmail, apiKey: null } })}
        />
      </ProfileFieldCard>

      <ProfileFieldCard title={t("franceTravailTitle")} description={t("franceTravailDescription")}>
        <CredentialFields
          fields={[
            {
              id: "ftClientId",
              label: t("franceTravailClientId"),
              value: ftClientId,
              onChange: setFtClientId,
              placeholder: t("franceTravailClientIdPlaceholder"),
            },
            {
              id: "ftClientSecret",
              label: t("franceTravailClientSecret"),
              value: ftClientSecret,
              onChange: setFtClientSecret,
              type: "password",
              placeholder: ftHasClientSecret
                ? t("secretKeepPlaceholder")
                : t("franceTravailClientSecretPlaceholder"),
            },
          ]}
          configured={ftConfigured}
          configuredLabel={t("franceTravailConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearFranceTravailKeys")}
          canSave={Boolean(ftClientId.trim()) && (Boolean(ftClientSecret.trim()) || ftHasClientSecret)}
          canClear={ftHasClientSecret}
          onSave={() =>
            saveCredentials({
              franceTravail: {
                clientId: ftClientId,
                clientSecret: ftClientSecret.trim() || undefined,
              },
            })
          }
          onClear={() =>
            saveCredentials({ franceTravail: { clientId: ftClientId, clientSecret: null } })
          }
        />
      </ProfileFieldCard>

      <ProfileFieldCard title={t("worknetTitle")} description={t("worknetDescription")}>
        <CredentialFields
          fields={[
            {
              id: "worknetAuthKey",
              label: t("worknetAuthKey"),
              value: worknetAuthKey,
              onChange: setWorknetAuthKey,
              type: "password",
              placeholder: worknetHasAuthKey
                ? t("secretKeepPlaceholder")
                : t("worknetAuthKeyPlaceholder"),
            },
          ]}
          configured={worknetConfigured}
          configuredLabel={t("worknetConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearWorknetKey")}
          canSave={Boolean(worknetAuthKey.trim())}
          canClear={worknetHasAuthKey}
          onSave={() =>
            saveCredentials({ worknet: { authKey: worknetAuthKey.trim() || undefined } })
          }
          onClear={() => saveCredentials({ worknet: { authKey: null } })}
        />
      </ProfileFieldCard>

      <ProfileFieldCard title={t("careerjetTitle")} description={t("careerjetDescription")}>
        <CredentialFields
          fields={[
            {
              id: "careerjetApiKey",
              label: t("careerjetApiKey"),
              value: careerjetApiKey,
              onChange: setCareerjetApiKey,
              type: "password",
              placeholder: careerjetHasApiKey
                ? t("secretKeepPlaceholder")
                : t("careerjetApiKeyPlaceholder"),
            },
          ]}
          configured={careerjetConfigured}
          configuredLabel={t("careerjetConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearCareerjetKey")}
          canSave={Boolean(careerjetApiKey.trim())}
          canClear={careerjetHasApiKey}
          onSave={() =>
            saveCredentials({ careerjet: { apiKey: careerjetApiKey.trim() || undefined } })
          }
          onClear={() => saveCredentials({ careerjet: { apiKey: null } })}
        />
      </ProfileFieldCard>

      <ProfileFieldCard title={t("joobleTitle")} description={t("joobleDescription")}>
        <CredentialFields
          fields={[
            {
              id: "joobleApiKey",
              label: t("joobleApiKey"),
              value: joobleApiKey,
              onChange: setJoobleApiKey,
              type: "password",
              placeholder: joobleHasApiKey
                ? t("secretKeepPlaceholder")
                : t("joobleApiKeyPlaceholder"),
            },
          ]}
          configured={joobleConfigured}
          configuredLabel={t("joobleConfigured")}
          localOnlyNote={t("localOnlyNote")}
          error={error}
          saved={saved}
          saving={saving}
          saveLabel={t("save")}
          savingLabel={t("saving")}
          savedLabel={t("saved")}
          clearLabel={t("clearJoobleKey")}
          canSave={Boolean(joobleApiKey.trim())}
          canClear={joobleHasApiKey}
          onSave={() => saveCredentials({ jooble: { apiKey: joobleApiKey.trim() || undefined } })}
          onClear={() => saveCredentials({ jooble: { apiKey: null } })}
        />
      </ProfileFieldCard>
    </div>
  );
}

function CredentialFields({
  fields,
  configured,
  configuredLabel,
  localOnlyNote,
  error,
  saved,
  saving,
  saveLabel,
  savingLabel,
  savedLabel,
  clearLabel,
  canSave,
  canClear,
  onSave,
  onClear,
}: {
  fields: Array<{
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
  }>;
  configured: boolean;
  configuredLabel: string;
  localOnlyNote: string;
  error: string | null;
  saved: boolean;
  saving: boolean;
  saveLabel: string;
  savingLabel: string;
  savedLabel: string;
  clearLabel: string;
  canSave: boolean;
  canClear: boolean;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>{field.label}</Label>
          <Input
            id={field.id}
            type={field.type}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            placeholder={field.placeholder}
            autoComplete="off"
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{localOnlyNote}</p>
      {configured && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{configuredLabel}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-700 dark:text-emerald-300">{savedLabel}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={saving || !canSave} onClick={onSave}>
          {saving ? savingLabel : saveLabel}
        </Button>
        {canClear && (
          <Button variant="outline" disabled={saving} onClick={onClear}>
            {clearLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
