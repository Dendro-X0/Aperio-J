"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useI18n, useTranslations } from "@/i18n/provider";
import {
  filterIndustryOptions,
  INDUSTRY_GROUP_IDS,
  industryOptions,
  isCatalogIndustryLabel,
  type IndustryGroupId,
} from "@/lib/industry-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export function IndustryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { locale } = useI18n();
  const { t } = useTranslations("profile.industryPicker");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<IndustryGroupId>("all");
  const [customDraft, setCustomDraft] = useState("");

  const options = useMemo(() => industryOptions(locale), [locale]);

  const filtered = useMemo(
    () => filterIndustryOptions(options, query, group),
    [options, query, group],
  );

  const isCustom = Boolean(value.trim()) && !isCatalogIndustryLabel(value, locale);

  function openPicker() {
    setQuery("");
    setGroup("all");
    setCustomDraft(isCustom ? value : "");
    setOpen(true);
  }

  function selectIndustry(label: string) {
    onChange(label);
    setOpen(false);
  }

  function applyCustom() {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        id="industry"
        onClick={openPicker}
        className="h-auto min-h-9 w-full justify-between px-2.5 py-2 font-normal"
      >
        <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
          {value || t("triggerPlaceholder")}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>

      {value && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isCustom ? "secondary" : "outline"}>{value}</Badge>
          {isCustom && (
            <span className="text-xs text-muted-foreground">{t("customBadge")}</span>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={clearSelection}>
            {t("clear")}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(85vh,40rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 border-b px-5 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-8"
                autoFocus
              />
            </div>

            <div className="-mx-1 flex flex-wrap gap-1.5 px-1 pb-0.5">
              <FilterChip
                selected={group === "all"}
                onClick={() => setGroup("all")}
                label={t("groups.all")}
              />
              {INDUSTRY_GROUP_IDS.map((groupId) => (
                <FilterChip
                  key={groupId}
                  selected={group === groupId}
                  onClick={() => setGroup(groupId)}
                  label={t(`groups.${groupId}` as "groups.manufacturing")}
                />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((option) => {
                  const selected = value === option.label;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => selectIndustry(option.label)}
                        className={cn(
                          "flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/30 hover:bg-muted/50",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium">{option.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {t(`groups.${option.group}` as "groups.manufacturing")}
                          </span>
                        </span>
                        {selected && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="flex-col gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-col sm:items-stretch">
            <div className="space-y-2">
              <Label htmlFor="custom-industry">{t("customLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-industry"
                  value={customDraft}
                  onChange={(event) => setCustomDraft(event.target.value)}
                  placeholder={t("customPlaceholder")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyCustom();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={applyCustom} disabled={!customDraft.trim()}>
                  {t("useCustom")}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
