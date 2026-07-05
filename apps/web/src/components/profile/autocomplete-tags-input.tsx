"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { filterTagSuggestions, resolveTagDraft } from "@/lib/role-options";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AutocompleteTagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  addPlaceholder?: string;
  maxTags?: number;
  allowCustom?: boolean;
  id?: string;
  "aria-label"?: string;
}

export function AutocompleteTagsInput({
  value,
  onChange,
  suggestions,
  placeholder,
  addPlaceholder,
  maxTags,
  allowCustom = true,
  id,
  "aria-label": ariaLabel,
}: AutocompleteTagsInputProps) {
  const { t } = useTranslations("profile.tags");
  const [draft, setDraft] = useState("");
  const skipBlurCommitRef = useRef(false);

  const atMax = maxTags !== undefined && value.length >= maxTags;

  const filteredSuggestions = useMemo(
    () => filterTagSuggestions(suggestions, draft, value),
    [draft, suggestions, value],
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return;

    if (maxTags === 1) {
      onChange([trimmed]);
    } else if (maxTags === undefined || value.length < maxTags) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function commitDraft() {
    const label = resolveTagDraft(draft, suggestions, value);
    if (!label) {
      if (allowCustom && draft.trim() && !atMax) {
        addTag(draft.trim());
      } else {
        setDraft("");
      }
      return;
    }
    addTag(label);
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
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
    addTag(label);
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        )}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-sm p-0.5 hover:bg-muted"
              aria-label={t("removeTag", { tag })}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!atMax && (
          <Input
            id={id}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={
              value.length === 0
                ? (placeholder ?? t("placeholder"))
                : (addPlaceholder ?? t("addPlaceholder"))
            }
            className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            aria-label={ariaLabel ?? placeholder ?? t("placeholder")}
            aria-autocomplete="list"
            aria-controls={filteredSuggestions.length > 0 ? `${id}-suggestions` : undefined}
          />
        )}
      </div>

      {filteredSuggestions.length > 0 && draft.trim() && !atMax && (
        <ul
          id={id ? `${id}-suggestions` : undefined}
          className="flex flex-wrap gap-1.5"
          role="listbox"
        >
          {filteredSuggestions.map((label) => (
            <li key={label} role="option">
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(label);
                }}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
