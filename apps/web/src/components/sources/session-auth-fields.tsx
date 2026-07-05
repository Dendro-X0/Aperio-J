"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SessionAuthMode = "none" | "cookie" | "bearer";

type SessionAuthFieldsProps = {
  authMode: SessionAuthMode;
  authSecret: string;
  onAuthModeChange: (mode: SessionAuthMode) => void;
  onAuthSecretChange: (secret: string) => void;
  labels: {
    modeLabel: string;
    modeNone: string;
    modeCookie: string;
    modeBearer: string;
    secretLabel: string;
    secretPlaceholderCookie: string;
    secretPlaceholderBearer: string;
    secretKeepHint?: string;
  };
  secretOptional?: boolean;
};

export function SessionAuthFields({
  authMode,
  authSecret,
  onAuthModeChange,
  onAuthSecretChange,
  labels,
  secretOptional = false,
}: SessionAuthFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="sessionAuthMode">{labels.modeLabel}</Label>
        <select
          id="sessionAuthMode"
          value={authMode}
          onChange={(e) => onAuthModeChange(e.target.value as SessionAuthMode)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="none">{labels.modeNone}</option>
          <option value="cookie">{labels.modeCookie}</option>
          <option value="bearer">{labels.modeBearer}</option>
        </select>
      </div>
      {authMode !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="sessionAuthSecret">{labels.secretLabel}</Label>
          <Input
            id="sessionAuthSecret"
            type="password"
            autoComplete="off"
            value={authSecret}
            onChange={(e) => onAuthSecretChange(e.target.value)}
            placeholder={
              authMode === "cookie"
                ? labels.secretPlaceholderCookie
                : labels.secretPlaceholderBearer
            }
          />
          {secretOptional && labels.secretKeepHint && (
            <p className="text-xs text-muted-foreground">{labels.secretKeepHint}</p>
          )}
        </div>
      )}
    </div>
  );
}
