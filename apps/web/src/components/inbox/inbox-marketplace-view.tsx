"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { InboxItem } from "@/lib/match-service";
import { useI18n, useTranslations } from "@/i18n/provider";
import { InboxToolbar } from "@/components/inbox/inbox-toolbar";
import {
  InboxEmptyState,
} from "@/components/inbox/inbox-job-card";
import {
  InboxJobGridCard,
  InboxJobGridSkeleton,
} from "@/components/inbox/inbox-job-grid-card";
import { PageEmpty } from "@/components/ui/page-empty";
import { Filter } from "lucide-react";
import {
  filterInboxItems,
  useInboxFilters,
} from "@/components/inbox/use-inbox-filters";
import { inboxCityFilterOptions } from "@/lib/inbox-city-filter";
import { EngineActivityPanel } from "@/components/engine/engine-activity-panel";
import { FetchErrorsBanner } from "@/components/inbox/fetch-errors-banner";
import type { MatchRunInboxPayload } from "@/lib/match-run-client";
import { getMatchRunState } from "@/lib/match-run-client";
import { useMatchRun } from "@/components/match/match-run-provider";
import {
  InboxPagination,
  INBOX_PAGE_SIZE,
  paginateItems,
  totalPagesForCount,
} from "@/components/inbox/inbox-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface InboxProfileSummary {
  city: string;
  cities: string[];
  districts: string[];
  roles: string[];
  industries: string[];
  remoteOnly: boolean;
}

export interface InboxMarketplaceViewProps {
  discoveryReady?: boolean;
  initialItems: InboxItem[];
  initialExcludedItems?: InboxItem[];
  profileSummary: InboxProfileSummary;
  ranAt: string | null;
  opportunityCount: number;
  matchedCount: number;
  excludedCount?: number;
  fetchErrors: string[];
  sourceDiscoveryErrors?: string[];
  streamCount?: number;
  usedFixtureFallback?: boolean;
  needsRediscover?: boolean;
  cnCaptureFirst?: boolean;
  cnRemoteFirst?: boolean;
  cnNetworkContext?: boolean;
  remoteFirst?: boolean;
}

export function InboxMarketplaceView({
  discoveryReady = true,
  initialItems,
  initialExcludedItems = [],
  profileSummary,
  ranAt,
  opportunityCount,
  matchedCount,
  excludedCount = 0,
  fetchErrors,
  sourceDiscoveryErrors = [],
  streamCount = 0,
  usedFixtureFallback = false,
  needsRediscover = false,
  cnCaptureFirst = false,
  cnRemoteFirst = false,
  cnNetworkContext = false,
  remoteFirst = false,
}: InboxMarketplaceViewProps) {
  const { dateLocale, locale } = useI18n();
  const { t } = useTranslations("inbox");
  const { t: tMarket } = useTranslations("inbox.marketplace");

  const [items, setItems] = useState(initialItems);
  const [excludedItems, setExcludedItems] = useState(initialExcludedItems);
  const [showExcluded, setShowExcluded] = useState(false);
  const [meta, setMeta] = useState({
    ranAt,
    opportunityCount,
    matchedCount,
    excludedCount,
    fetchErrors,
    sourceDiscoveryErrors,
    streamCount,
    usedFixtureFallback,
    cnCaptureFirst,
    cnRemoteFirst,
    cnNetworkContext,
    remoteFirst,
  });
  const matchRun = useMatchRun();
  const [refreshing, setRefreshing] = useState(matchRun.isRunning);
  const [refreshPhase, setRefreshPhase] = useState(matchRun.phase);
  const [refreshPhaseDetail, setRefreshPhaseDetail] = useState(matchRun.phaseDetail);
  const [captureUrl, setCaptureUrl] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const searchParams = useSearchParams();
  const discoverStarted = useRef(false);
  const appliedResultAt = useRef<string | null>(null);

  useEffect(() => {
    setRefreshing(matchRun.isRunning);
    setRefreshPhase(matchRun.phase);
    setRefreshPhaseDetail(matchRun.phaseDetail);
  }, [matchRun.isRunning, matchRun.phase, matchRun.phaseDetail]);

  const {
    filters,
    setFilters,
    filteredItems,
    availablePresetIds,
    searchFacets,
    searchFacetIds,
    togglePreset,
    resetFilters,
    setRoleFamily,
  } = useInboxFilters(
    items,
    profileSummary.industries,
    profileSummary.cities,
    profileSummary.districts,
    profileSummary.roles,
    profileSummary.remoteOnly,
  );

  const cityFilterOptions = useMemo(
    () => inboxCityFilterOptions(profileSummary.cities, profileSummary.districts, locale),
    [profileSummary.cities, profileSummary.districts, locale],
  );

  const filteredExcluded = useMemo(
    () =>
      filterInboxItems(
        excludedItems,
        filters,
        availablePresetIds,
        searchFacetIds,
        profileSummary.cities,
        profileSummary.districts,
      ),
    [
      excludedItems,
      filters,
      availablePresetIds,
      searchFacetIds,
      profileSummary.cities,
      profileSummary.districts,
    ],
  );
  const filterHiddenCount = items.length - filteredItems.length;
  const totalPages = totalPagesForCount(filteredItems.length);
  const paginatedItems = useMemo(
    () => paginateItems(filteredItems, page),
    [filteredItems, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filters, filteredItems.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function applyInboxPayload(payload: MatchRunInboxPayload) {
    setItems(payload.items);
    setExcludedItems(payload.excludedItems ?? []);
    setMeta({
      ranAt: payload.ranAt,
      opportunityCount: payload.opportunityCount,
      matchedCount: payload.matchedCount,
      excludedCount: payload.excludedCount ?? payload.excludedItems?.length ?? 0,
      fetchErrors: payload.fetchErrors,
      sourceDiscoveryErrors: payload.sourceDiscoveryErrors ?? [],
      streamCount: payload.streamCount ?? 0,
      usedFixtureFallback: payload.usedFixtureFallback ?? false,
      cnCaptureFirst: payload.cnCaptureFirst ?? cnCaptureFirst,
      cnRemoteFirst: payload.cnRemoteFirst ?? cnRemoteFirst,
      cnNetworkContext: payload.cnNetworkContext ?? cnNetworkContext,
      remoteFirst: payload.remoteFirst ?? remoteFirst,
    });
  }

  useEffect(() => {
    if (matchRun.status !== "completed" || !matchRun.result || !matchRun.completedAt) return;
    if (appliedResultAt.current === matchRun.completedAt) return;
    appliedResultAt.current = matchRun.completedAt;
    applyInboxPayload(matchRun.result);
  }, [matchRun.status, matchRun.result, matchRun.completedAt, cnCaptureFirst, cnRemoteFirst, cnNetworkContext, remoteFirst]);

  async function refresh() {
    if (matchRun.isRunning) return;

    setError(null);

    try {
      const payload = await matchRun.start();
      appliedResultAt.current = getMatchRunState().completedAt ?? new Date().toISOString();
      applyInboxPayload(payload);
    } catch (refreshError) {
      if (refreshError instanceof DOMException && refreshError.name === "AbortError") {
        setError(t("refreshCancelled"));
        return;
      }
      if (matchRun.error) {
        setError(matchRun.error);
        return;
      }
      setError(refreshError instanceof Error ? refreshError.message : t("errors.refreshFailed"));
    }
  }

  function cancelRefresh() {
    matchRun.cancel();
  }

  useEffect(() => {
    if (discoverStarted.current) return;
    if (searchParams.get("discover") !== "1" || !discoveryReady) return;

    discoverStarted.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("discover");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    void refresh();
  }, [discoveryReady, searchParams]);

  async function captureListing(event: React.FormEvent) {
    event.preventDefault();
    if (!captureUrl.trim()) return;

    setCapturing(true);
    setError(null);

    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: captureUrl.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? t("errors.captureFailed"));
      }
      applyInboxPayload(payload);
      setCaptureUrl("");
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : t("errors.captureFailed"));
    } finally {
      setCapturing(false);
    }
  }

  const remoteOnly = profileSummary.remoteOnly;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{t("localeNote")}</p>
        {refreshing ? (
          <Button className="shrink-0" variant="outline" onClick={cancelRefresh}>
            {t("cancelRefresh")}
          </Button>
        ) : (
          <Button className="shrink-0" onClick={refresh} disabled={!discoveryReady || matchRun.isRunning}>
            {matchRun.isRunning ? t("refreshing") : t("refresh")}
          </Button>
        )}
      </div>

      {needsRediscover && discoveryReady && meta.streamCount === 0 && items.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("needsRediscoverTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("needsRediscoverDescription")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/sources" />}
            >
              {t("needsRediscoverCta")}
            </Button>
          </CardContent>
        </Card>
      )}

      {!discoveryReady && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900 dark:text-amber-200">{t("discoverySetupRequired")}</p>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/settings?section=background" />}
            >
              {t("discoverySetupCta")}
            </Button>
          </CardContent>
        </Card>
      )}

      {refreshing && discoveryReady && (
        <EngineActivityPanel
          phase={refreshPhase}
          detail={refreshPhaseDetail}
          namespace="engine.match"
        />
      )}

      <InboxToolbar
        filters={filters}
        presetIds={availablePresetIds}
        searchFacets={searchFacets}
        showRoleFamilies={Boolean(remoteFirst || cnRemoteFirst || profileSummary.remoteOnly)}
        onQueryChange={(query) => setFilters((prev) => ({ ...prev, query }))}
        onTogglePreset={togglePreset}
        onRoleFamilyChange={setRoleFamily}
        onPosterTypeChange={(posterType) => setFilters((prev) => ({ ...prev, posterType }))}
        onWorkModeChange={(workMode) => setFilters((prev) => ({ ...prev, workMode }))}
        cityOptions={cityFilterOptions}
        onCityChange={(city) => setFilters((prev) => ({ ...prev, city }))}
        onMinScoreChange={(minScore) => setFilters((prev) => ({ ...prev, minScore }))}
        onSortChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
        onResetFilters={resetFilters}
        captureUrl={captureUrl}
        onCaptureUrlChange={setCaptureUrl}
        onCaptureSubmit={captureListing}
        capturing={capturing}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-medium">
          {tMarket("resultCount", { count: filteredItems.length })}
          {filteredItems.length > INBOX_PAGE_SIZE && (
            <span className="ml-1 font-normal text-muted-foreground">
              {tMarket("pageSizeNote", { size: INBOX_PAGE_SIZE })}
            </span>
          )}
          {filterHiddenCount > 0 && (
            <span className="ml-1 font-normal text-muted-foreground">
              {tMarket("hiddenByFilters", { count: filterHiddenCount })}
            </span>
          )}
          {meta.ranAt && (
            <span className="ml-2 font-normal text-muted-foreground">
              ·{" "}
              {new Date(meta.ranAt).toLocaleString(dateLocale)}
            </span>
          )}
        </p>
        {excludedItems.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowExcluded((open) => !open)}
          >
            {showExcluded
              ? t("excluded.collapseFiltered", { count: excludedItems.length })
              : t("excluded.expandFiltered", { count: excludedItems.length })}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {meta.usedFixtureFallback && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">{t("fixtureFallback")}</CardContent>
        </Card>
      )}

      {meta.sourceDiscoveryErrors.length > 0 && (
        <Card>
          <CardContent className="text-sm">
            <p className="font-medium">{t("discoveryErrorsTitle")}</p>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {meta.sourceDiscoveryErrors.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(meta.remoteFirst || meta.cnRemoteFirst) && items.length === 0 && discoveryReady && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm text-muted-foreground">
            {t("empty.remoteHint")}
          </CardContent>
        </Card>
      )}

      {meta.cnCaptureFirst && items.length === 0 && discoveryReady && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 text-sm text-muted-foreground">
            {t("empty.cnCaptureHint")}
          </CardContent>
        </Card>
      )}

      <FetchErrorsBanner errors={meta.fetchErrors} />

      {meta.cnNetworkContext && meta.fetchErrors.length > 0 && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-3 text-sm text-muted-foreground">
            {t("networkContext.cnRemoteHint")}
          </CardContent>
        </Card>
      )}

      {refreshing ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <InboxJobGridSkeleton key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        discoveryReady ? (
          <InboxEmptyState
            cnCaptureFirst={meta.cnCaptureFirst}
            cnRemoteFirst={meta.cnRemoteFirst}
            remoteFirst={meta.remoteFirst}
          />
        ) : (
          <PageEmpty
            icon={Filter}
            title={t("discoverySetupTitle")}
            description={t("discoverySetupRequired")}
          />
        )
      ) : filteredItems.length === 0 ? (
        <PageEmpty
          icon={Filter}
          title={tMarket("noFilterResults")}
          description={t("empty.description")}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedItems.map((item) => (
              <InboxJobGridCard key={item.opportunity.id} item={item} remoteOnly={remoteOnly} />
            ))}
          </div>
          <InboxPagination
            page={page}
            totalItems={filteredItems.length}
            onPageChange={setPage}
          />
        </>
      )}

      {showExcluded && filteredExcluded.length > 0 && (
        <div className="space-y-4 border-t pt-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t("excluded.label", { count: filteredExcluded.length })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredExcluded.map((item) => (
              <InboxJobGridCard key={item.opportunity.id} item={item} muted remoteOnly={remoteOnly} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use InboxMarketplaceView */
export const InboxView = InboxMarketplaceView;
