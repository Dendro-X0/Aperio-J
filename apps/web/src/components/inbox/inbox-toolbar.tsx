"use client";

import { ChevronDown, Filter, Search } from "lucide-react";
import type { InboxFilters, InboxSearchFacet, PosterFilter } from "@/components/inbox/use-inbox-filters";
import { countActiveFilters } from "@/components/inbox/use-inbox-filters";
import type { InboxWorkModeFilter } from "@/lib/inbox-work-mode";
import type { InboxCityFilter } from "@/lib/inbox-city-filter";
import {
  INBOX_PRESET_OTHER,
  inboxFilterPresetLabel,
} from "@/lib/inbox-filter-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useI18n, useTranslations } from "@/i18n/provider";

interface InboxToolbarProps {
  filters: InboxFilters;
  presetIds: string[];
  searchFacets: InboxSearchFacet[];
  onQueryChange: (query: string) => void;
  onTogglePreset: (presetId: string) => void;
  onPosterTypeChange: (posterType: PosterFilter) => void;
  onWorkModeChange: (workMode: InboxWorkModeFilter) => void;
  cityOptions?: Array<{ value: string; label: string }>;
  onCityChange?: (city: InboxCityFilter) => void;
  onMinScoreChange: (minScore: number) => void;
  onSortChange: (sort: InboxFilters["sort"]) => void;
  onResetFilters: () => void;
  captureUrl: string;
  onCaptureUrlChange: (url: string) => void;
  onCaptureSubmit: (event: React.FormEvent) => void;
  capturing: boolean;
}

export function InboxToolbar({
  filters,
  presetIds,
  searchFacets,
  onQueryChange,
  onTogglePreset,
  onPosterTypeChange,
  onWorkModeChange,
  cityOptions = [],
  onCityChange,
  onMinScoreChange,
  onSortChange,
  onResetFilters,
  captureUrl,
  onCaptureUrlChange,
  onCaptureSubmit,
  capturing,
}: InboxToolbarProps) {
  const { locale } = useI18n();
  const { t } = useTranslations("inbox");
  const { t: tMarket } = useTranslations("inbox.marketplace");
  const { t: tEnums } = useTranslations("enums");

  const posterOptions: { value: PosterFilter; label: string }[] = [
    { value: "all", label: tMarket("posterAll") },
    { value: "direct", label: tEnums("posterType.direct") },
    { value: "agency", label: tEnums("posterType.agency") },
    { value: "unknown", label: tEnums("posterType.unknown") },
  ];

  const workModeOptions: { value: InboxWorkModeFilter; label: string }[] = [
    { value: "all", label: tMarket("workModeAll") },
    { value: "remote", label: tMarket("workModeRemote") },
    { value: "onsite", label: tMarket("workModeOnsite") },
  ];

  const activeFilterCount = countActiveFilters(filters);
  const searching = Boolean(filters.query.trim());
  const facetChips = searching ? searchFacets : [];
  const presetChips = searching ? [] : presetIds;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={tMarket("searchPlaceholder")}
            className="pl-9"
            aria-label={tMarket("searchPlaceholder")}
          />
        </div>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" className="shrink-0" />}>
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0
              ? tMarket("filterActive", { count: activeFilterCount })
              : tMarket("filter")}
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>{tMarket("filterTitle")}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <div className="space-y-2">
                <Label>{tMarket("workMode")}</Label>
                <div className="flex flex-wrap gap-2">
                  {workModeOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={filters.workMode === option.value ? "default" : "outline"}
                      onClick={() => onWorkModeChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tMarket("posterType")}</Label>
                <div className="flex flex-wrap gap-2">
                  {posterOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={filters.posterType === option.value ? "default" : "outline"}
                      onClick={() => onPosterTypeChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{tMarket("minScore")}</Label>
                  <span className="text-sm font-medium tabular-nums">{filters.minScore}</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[filters.minScore]}
                  onValueChange={(values) => {
                    const next = Array.isArray(values) ? values[0] : values;
                    onMinScoreChange(typeof next === "number" ? next : 0);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inbox-sort">{tMarket("sort")}</Label>
                <select
                  id="inbox-sort"
                  value={filters.sort}
                  onChange={(event) =>
                    onSortChange(event.target.value as InboxFilters["sort"])
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="score">{tMarket("sortScore")}</option>
                  <option value="recent">{tMarket("sortRecent")}</option>
                </select>
              </div>

              <Button type="button" variant="ghost" className="w-full" onClick={onResetFilters}>
                {tMarket("resetFilters")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="space-y-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {workModeOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filters.workMode === option.value ? "default" : "outline"}
              className="shrink-0"
              onClick={() =>
                onWorkModeChange(
                  filters.workMode === option.value && option.value !== "all"
                    ? "all"
                    : option.value,
                )
              }
            >
              {option.label}
            </Button>
          ))}
        </div>

        {cityOptions.length > 1 && onCityChange && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Button
              type="button"
              size="sm"
              variant={filters.city === "all" ? "default" : "outline"}
              className="shrink-0"
              onClick={() => onCityChange("all")}
            >
              {tMarket("cityFilterAll")}
            </Button>
            {cityOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filters.city === option.value ? "default" : "outline"}
                className="shrink-0"
                onClick={() =>
                  onCityChange(
                    filters.city === option.value ? "all" : option.value,
                  )
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {searching && facetChips.length > 0 && (
          <p className="text-xs text-muted-foreground">{tMarket("searchFacetsLabel")}</p>
        )}

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {searching
            ? facetChips.map((facet) => {
                const selected = filters.presets.includes(facet.id);
                const label = inboxFilterPresetLabel(facet.id, locale) ?? facet.id;
                return (
                  <Toggle
                    key={facet.id}
                    pressed={selected}
                    onPressedChange={() => onTogglePreset(facet.id)}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "shrink-0 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
                    )}
                  >
                    {label}
                    <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
                      {facet.count}
                    </span>
                  </Toggle>
                );
              })
            : presetChips.map((presetId) => {
                const selected = filters.presets.includes(presetId);
                const label =
                  presetId === INBOX_PRESET_OTHER
                    ? t("categories.other")
                    : inboxFilterPresetLabel(presetId, locale) ?? presetId;
                return (
                  <Toggle
                    key={presetId}
                    pressed={selected}
                    onPressedChange={() => onTogglePreset(presetId)}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "shrink-0 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
                    )}
                  >
                    {label}
                  </Toggle>
                );
              })}
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="group w-full justify-between px-0 hover:bg-transparent"
            />
          }
        >
          <span className="text-sm font-medium">{t("capture.title")}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3 data-open:animate-in data-closed:animate-out">
          <p className="text-sm text-muted-foreground">{t("capture.description")}</p>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onCaptureSubmit}>
            <Input
              placeholder={t("capture.urlPlaceholder")}
              value={captureUrl}
              onChange={(event) => onCaptureUrlChange(event.target.value)}
              aria-label={t("capture.urlLabel")}
              className="flex-1"
            />
            <Button type="submit" disabled={capturing || !captureUrl.trim()}>
              {capturing ? t("capture.submitting") : t("capture.submit")}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
