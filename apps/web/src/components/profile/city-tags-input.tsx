"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { useI18n, useTranslations } from "@/i18n/provider";
import {
  canonicalCityLabel,
  citiesShareIdentity,
  cityIdentityKey,
  cityMatchTerms,
  displayCityLabel,
  isRemoteCityLabel,
  matchCityLabelFromGeo,
  resolveCityDraftLabel,
} from "@/lib/city-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MetroSuggestion {
  id: string;
  label: string;
}

export interface CityTagsInputHandle {
  commitDraft: () => string[];
}

export const CityTagsInput = forwardRef<
  CityTagsInputHandle,
  {
    value: string[];
    onChange: (cities: string[]) => void;
  }
>(function CityTagsInput({ value, onChange }, ref) {
  const { locale } = useI18n();
  const { t } = useTranslations("profile.location");
  const [draft, setDraft] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [metroSuggestions, setMetroSuggestions] = useState<MetroSuggestion[]>([]);
  const skipBlurCommitRef = useRef(false);

  const selectedIdentityKeys = useMemo(
    () => new Set(value.map((city) => cityIdentityKey(city))),
    [value],
  );

  useEffect(() => {
    const query = draft.trim();
    const exclude = [...selectedIdentityKeys].join(",");
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          limit: "8",
          exclude,
        });
        const response = await fetch(`/api/geo/cities?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { cities?: MetroSuggestion[] };
        setMetroSuggestions(payload.cities ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }, query ? 120 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft, selectedIdentityKeys]);

  const filteredSuggestions = useMemo(() => {
    const available = metroSuggestions.filter(
      (item) => !value.some((city) => citiesShareIdentity(city, item.label)),
    );

    const query = draft.trim().toLowerCase();
    if (!query) return available;

    return available.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        cityMatchTerms(item.label).some((term) => term.includes(query)),
    );
  }, [draft, metroSuggestions, value]);

  const suggestionLabels = useMemo(
    () => filteredSuggestions.map((item) => item.label),
    [filteredSuggestions],
  );

  const draftLabel = useMemo(() => {
    const trimmed = draft.trim();
    if (!trimmed) return null;
    return resolveCityDraftLabel(trimmed, locale, suggestionLabels);
  }, [draft, locale, suggestionLabels]);

  const canAddDraft = Boolean(
    draftLabel && !value.some((city) => citiesShareIdentity(city, draftLabel)),
  );

  function addCity(city: string) {
    const label = canonicalCityLabel(city, locale);
    if (!label || value.some((existing) => citiesShareIdentity(existing, label))) return;
    onChange([...value, label]);
    setDraft("");
    setDetectError(null);
  }

  function commitDraft(): string[] {
    const trimmed = draft.trim();
    if (!trimmed) return value;

    const label = resolveCityDraftLabel(trimmed, locale, suggestionLabels);
    if (!label || value.some((city) => citiesShareIdentity(city, label))) {
      setDraft("");
      return value;
    }

    const next = [...value, label];
    onChange(next);
    setDraft("");
    setDetectError(null);
    return next;
  }

  useImperativeHandle(
    ref,
    () => ({ commitDraft }),
    [draft, locale, onChange, suggestionLabels, value],
  );

  function removeCity(city: string) {
    const key = cityIdentityKey(city);
    onChange(value.filter((item) => cityIdentityKey(item) !== key));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleBlur() {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    commitDraft();
  }

  function selectSuggestion(label: string) {
    skipBlurCommitRef.current = true;
    addCity(label);
  }

  async function detectFromIp() {
    setDetecting(true);
    setDetectError(null);

    try {
      const response = await fetch("/api/geo/detect");
      const payload = (await response.json()) as {
        city?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(t("detectFailed"));
      }

      if (!payload.city) {
        throw new Error(t("detectNoCity"));
      }

      const label = matchCityLabelFromGeo(payload.city, locale) ?? payload.city.trim();
      if (isRemoteCityLabel(label, locale)) {
        throw new Error(t("detectNoCity"));
      }
      addCity(label);
    } catch (error) {
      setDetectError(error instanceof Error ? error.message : t("detectFailed"));
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        )}
      >
        {value.map((city) => (
          <Badge key={cityIdentityKey(city)} variant="secondary" className="gap-1 pr-1">
            {displayCityLabel(city, locale)}
            <button
              type="button"
              onClick={() => removeCity(city)}
              className="rounded-sm p-0.5 hover:bg-muted"
              aria-label={t("removeCity", { city: displayCityLabel(city, locale) })}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? t("cityPlaceholder") : t("addCityPlaceholder")}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          aria-label={t("cityInputLabel")}
          aria-autocomplete="list"
          aria-controls={filteredSuggestions.length > 0 ? "city-suggestions" : undefined}
        />
      </div>

      {filteredSuggestions.length > 0 && (
        <ul id="city-suggestions" className="flex flex-wrap gap-1.5" role="listbox">
          {filteredSuggestions.map((item) => (
            <li key={item.id} role="option">
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(item.label);
                }}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAddDraft && draftLabel && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={commitDraft}
          >
            {t("customCity", { city: draftLabel })}
          </Button>
          <p className="text-xs text-muted-foreground">{t("customCityHint")}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={detecting}
          onMouseDown={(event) => event.preventDefault()}
          onClick={detectFromIp}
        >
          <MapPin className="h-3.5 w-3.5" />
          {detecting ? t("detecting") : t("detectFromIp")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {value.length === 0 ? t("remoteDefaultHint") : t("cityHint")}
        </p>
      </div>

      {detectError && <p className="text-xs text-destructive">{detectError}</p>}
    </div>
  );
});
