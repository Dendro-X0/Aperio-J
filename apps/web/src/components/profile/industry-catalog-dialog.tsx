"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useI18n, useTranslations } from "@/i18n/provider";
import {
  filterIndustryOptions,
  INDUSTRY_GROUP_IDS,
  industryOptions,
  type IndustryGroupId,
} from "@/lib/industry-options";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function IndustryCatalogDialog({
  open,
  onOpenChange,
  selected,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string[];
  onAdd: (label: string) => void;
}) {
  const { locale } = useI18n();
  const { t } = useTranslations("profile.industryPicker");

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<IndustryGroupId>("all");

  const options = useMemo(() => industryOptions(locale), [locale]);
  const filtered = useMemo(
    () => filterIndustryOptions(options, query, group),
    [options, query, group],
  );

  const selectedLower = useMemo(
    () => new Set(selected.map((item) => item.toLowerCase())),
    [selected],
  );

  function pickIndustry(label: string) {
    if (selectedLower.has(label.toLowerCase())) return;
    onAdd(label);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,640px)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b px-5 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={group === "all" ? "secondary" : "outline"}
              className="h-7 text-xs"
              onClick={() => setGroup("all")}
            >
              {t("groups.all")}
            </Button>
            {INDUSTRY_GROUP_IDS.map((groupId) => (
              <Button
                key={groupId}
                type="button"
                size="sm"
                variant={group === groupId ? "secondary" : "outline"}
                className="h-7 text-xs"
                onClick={() => setGroup(groupId)}
              >
                {t(`groups.${groupId}`)}
              </Button>
            ))}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("noResults")}
            </li>
          ) : (
            filtered.map((option) => {
              const picked = selectedLower.has(option.label.toLowerCase());
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={picked}
                    onClick={() => pickIndustry(option.label)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      picked
                        ? "cursor-default text-muted-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <span>{option.label}</span>
                    {picked && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
