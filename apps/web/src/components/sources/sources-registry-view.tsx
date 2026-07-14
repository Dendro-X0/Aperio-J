"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileUp, MoreHorizontal, Plus, Radio, Trash2 } from "lucide-react";
import { useI18n, useTranslations } from "@/i18n/provider";
import { profileLocationLabelFromCityField } from "@/lib/profile-location-display";
import { classifySourceNetworkReach } from "@aperio-j/discovery/network-region";
import { StreamHealthBadge } from "@/components/sources/stream-health-badge";
import { SessionAuthFields, type SessionAuthMode } from "@/components/sources/session-auth-fields";
import { SourcesTableSkeleton } from "@/components/sources/sources-table-skeleton";
import type { SourcesRegistryProps, StreamRow } from "@/components/sources/types";
import { EngineActivityPanel } from "@/components/engine/engine-activity-panel";
import type { SourceDiscoveryPhase } from "@/lib/engine-phases";
import { readEngineStream } from "@/lib/engine-phases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { PageEmpty } from "@/components/ui/page-empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cityIdentityKey, displayCityLabel, resolveMetro } from "@aperio-j/core";

type CategoryFilter = "all" | "remote" | "onsite";

function formatSourceSeedUrl(seedUrl: string): string {
  if (!seedUrl.startsWith("connector://")) return seedUrl;
  try {
    const parsed = new URL(seedUrl.replace(/^connector:\/\//, "https://"));
    const search = parsed.searchParams.get("search");
    return search ? `${parsed.hostname} · ${search}` : parsed.hostname;
  } catch {
    return seedUrl;
  }
}

function intakeBadgeVariant(intakeType: StreamRow["intakeType"]) {
  if (intakeType === "api") return "default" as const;
  if (intakeType === "custom") return "default" as const;
  return "outline" as const;
}

function defaultCategoryFilter(
  remotePreference: SourcesRegistryProps["profileSummary"]["remotePreference"],
): CategoryFilter {
  if (remotePreference === "remote-only") return "remote";
  if (remotePreference === "onsite-only") return "onsite";
  return "all";
}

export function SourcesRegistryView({
  initialStreams,
  lastDiscoveryAt,
  lastDiscoveryStats,
  profileSummary,
}: SourcesRegistryProps) {
  const { dateLocale, listSeparator, locale } = useI18n();
  const { t } = useTranslations("sources");
  const { t: tCommon } = useTranslations("common");
  const { t: tEnums } = useTranslations("enums");
  const { t: tActions } = useTranslations("sources.actions");
  const { t: tSession } = useTranslations("sources.sessionAuth");
  const { t: tProfile } = useTranslations("profile");

  const [streams, setStreams] = useState(initialStreams);
  const [discovering, setDiscovering] = useState(false);
  const [discoverPhase, setDiscoverPhase] = useState<SourceDiscoveryPhase>("preparing");
  const [discoverPhaseDetail, setDiscoverPhaseDetail] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [opmlDialogOpen, setOpmlDialogOpen] = useState(false);
  const [opmlText, setOpmlText] = useState("");
  const [importingOpml, setImportingOpml] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customAuthMode, setCustomAuthMode] = useState<"none" | "cookie" | "bearer">("none");
  const [customAuthSecret, setCustomAuthSecret] = useState("");
  const [sessionAuthOpen, setSessionAuthOpen] = useState(false);
  const [sessionInfoOpen, setSessionInfoOpen] = useState(false);
  const [editStream, setEditStream] = useState<StreamRow | null>(null);
  const [editAuthMode, setEditAuthMode] = useState<SessionAuthMode>("none");
  const [editAuthSecret, setEditAuthSecret] = useState("");
  const [savingAuth, setSavingAuth] = useState(false);
  const [revalidatingId, setRevalidatingId] = useState<string | null>(null);
  const [enablingAll, setEnablingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryNote, setDiscoveryNote] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() =>
    defaultCategoryFilter(profileSummary.remotePreference),
  );
  const discoverAbortRef = useRef<AbortController | null>(null);

  const profileLine = `${profileLocationLabelFromCityField(profileSummary.city, locale)}${tCommon("separator")}${tCommon("intent")} ${profileSummary.roles.join(listSeparator)}`;
  const enabledCount = streams.filter((row) => row.enabled).length;
  const healthyCount = streams.filter((row) => row.health === "healthy").length;
  const remoteCount = streams.filter((row) => row.workCategory === "remote").length;
  const onsiteCount = streams.filter((row) => row.workCategory === "onsite").length;

  const [techDetailsOpen, setTechDetailsOpen] = useState(false);

  const resolvedCities = useMemo(() => {
    const cities = profileSummary.cities ?? profileSummary.city.split(" · ").filter(Boolean);
    return cities.map((city) => {
      const trimmed = city.trim();
      const metro = trimmed ? resolveMetro(trimmed) : undefined;
      return {
        raw: trimmed,
        identity: trimmed ? cityIdentityKey(trimmed) : "",
        label: trimmed ? displayCityLabel(trimmed, locale) : "",
        metro,
      };
    });
  }, [locale, profileSummary.city, profileSummary.cities]);

  const resolvedDistricts = useMemo(
    () => (profileSummary.districts ?? []).map((district) => district.trim()).filter(Boolean),
    [profileSummary.districts],
  );

  const connectorDetails = useMemo(() => {
    const connectorRows = streams.filter((row) => row.kind === "connector" || row.connectorId);

    function parseConnectorSeed(seedUrl: string): Record<string, string> {
      if (!seedUrl.startsWith("connector://")) return {};
      const queryPart = seedUrl.split("?", 2)[1] ?? "";
      const params = new URLSearchParams(queryPart);
      const out: Record<string, string> = {};
      for (const [key, value] of params.entries()) out[key] = value;
      return out;
    }

    return connectorRows.map((row) => ({
      connectorId:
        row.connectorId ??
        row.seedUrl.replace(/^connector:\/\//, "").split("?", 1)[0] ??
        "",
      seedUrl: row.seedUrl,
      params: parseConnectorSeed(row.seedUrl),
    }));
  }, [streams]);

  const filteredStreams = useMemo(() => {
    if (categoryFilter === "all") return streams;
    return streams.filter((row) => row.workCategory === categoryFilter);
  }, [streams, categoryFilter]);

  const filteredEnabledCount = filteredStreams.filter((row) => row.enabled).length;
  const enableAllTargets = useMemo(
    () => filteredStreams.filter((row) => !row.ephemeral && !row.enabled),
    [filteredStreams],
  );

  const lastDiscoveryLabel = lastDiscoveryAt
    ? new Date(lastDiscoveryAt).toLocaleString(dateLocale)
    : t("stats.lastDiscoveryEmpty");

  const sessionAuthLabels = useMemo(
    () => ({
      modeLabel: tSession("modeLabel"),
      modeNone: tSession("modeNone"),
      modeCookie: tSession("modeCookie"),
      modeBearer: tSession("modeBearer"),
      secretLabel: tSession("secretLabel"),
      secretPlaceholderCookie: tSession("secretPlaceholderCookie"),
      secretPlaceholderBearer: tSession("secretPlaceholderBearer"),
      secretKeepHint: tSession("secretKeepHint"),
    }),
    [tSession],
  );

  function replaceStreamRow(next: StreamRow) {
    setStreams((prev) => prev.map((row) => (row.id === next.id ? next : row)));
  }

  async function patchStream(
    stream: StreamRow,
    body: Record<string, unknown>,
  ): Promise<StreamRow | null> {
    const response = await fetch(`/api/sources/${stream.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { stream?: StreamRow; error?: string };
    if (!response.ok) {
      if (payload.stream) replaceStreamRow(payload.stream);
      setError(payload.error ?? t("errors.updateFailed"));
      return null;
    }
    if (payload.stream) replaceStreamRow(payload.stream);
    return payload.stream ?? null;
  }

  async function toggleEnabled(stream: StreamRow, next: boolean) {
    if (stream.ephemeral) return;
    setError(null);

    const response = await fetch(`/api/sources/${stream.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? t("errors.updateFailed"));
      return;
    }

    setStreams((prev) =>
      prev.map((row) => (row.id === stream.id ? { ...row, enabled: next } : row)),
    );
  }

  async function enableAllFiltered() {
    if (enableAllTargets.length === 0) return;

    setEnablingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/sources/enable-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: enableAllTargets.map((row) => row.id) }),
      });
      const payload = (await response.json()) as {
        count?: number;
        streams?: StreamRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? t("errors.updateFailed"));
      }

      if (payload.streams) {
        setStreams(payload.streams);
      } else {
        const enabledIds = new Set(enableAllTargets.map((row) => row.id));
        setStreams((prev) =>
          prev.map((row) => (enabledIds.has(row.id) ? { ...row, enabled: true } : row)),
        );
      }

      setDiscoveryNote(
        t("enableAll.success", { count: payload.count ?? enableAllTargets.length }),
      );
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : t("errors.updateFailed"));
    } finally {
      setEnablingAll(false);
    }
  }

  async function importOpmlSources() {
    if (!opmlText.trim()) {
      setError(t("errors.opmlRequired"));
      return;
    }

    setImportingOpml(true);
    setError(null);

    try {
      const response = await fetch("/api/sources/opml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opml: opmlText }),
      });
      const payload = (await response.json()) as {
        imported?: number;
        skipped?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? t("errors.importOpmlFailed"));
      }

      const refresh = await fetch("/api/sources");
      if (refresh.ok) {
        const body = (await refresh.json()) as { streams?: StreamRow[] };
        if (body.streams) setStreams(body.streams);
      }

      setOpmlText("");
      setOpmlDialogOpen(false);
      setDiscoveryNote(
        t("importOpml.successNote", {
          imported: payload.imported ?? 0,
          skipped: payload.skipped ?? 0,
        }),
      );
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : t("errors.importOpmlFailed"));
    } finally {
      setImportingOpml(false);
    }
  }

  async function clearFetchCache() {
    setClearingCache(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/cache", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? t("errors.clearCacheFailed"));
      }
      setDiscoveryNote(t("clearCache.successNote"));
    } catch (cacheError) {
      setError(cacheError instanceof Error ? cacheError.message : t("errors.clearCacheFailed"));
    } finally {
      setClearingCache(false);
    }
  }

  async function addCustomSource() {
    if (!customUrl.trim()) {
      setError(t("errors.urlRequired"));
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: customUrl.trim(),
          label: customLabel.trim() || undefined,
          authMode: customAuthMode,
          authSecret: customAuthMode === "none" ? undefined : customAuthSecret.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? t("errors.addFailed"));
      }

      const payload = (await response.json()) as { stream: StreamRow };
      setStreams((prev) => {
        const without = prev.filter((row) => row.id !== payload.stream.id);
        return [payload.stream, ...without];
      });
      setCustomUrl("");
      setCustomLabel("");
      setCustomAuthMode("none");
      setCustomAuthSecret("");
      setSessionAuthOpen(false);
      setAddDialogOpen(false);
      setDiscoveryNote(t("addCustom.successNote"));
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t("errors.addFailed"));
    } finally {
      setAdding(false);
    }
  }

  async function removeCustomSource(stream: StreamRow) {
    if (stream.origin !== "user") return;

    setError(null);
    const response = await fetch(`/api/sources/${stream.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? t("errors.deleteFailed"));
      return;
    }

    setStreams((prev) => prev.filter((row) => row.id !== stream.id));
  }

  async function clearSessionAuth(stream: StreamRow) {
    setError(null);
    const updated = await patchStream(stream, { authMode: "none", authSecret: null });
    if (updated) setDiscoveryNote(null);
  }

  function openEditSessionAuth(stream: StreamRow) {
    setEditStream(stream);
    setEditAuthMode(stream.authMode);
    setEditAuthSecret("");
    setError(null);
  }

  async function saveEditSessionAuth() {
    if (!editStream) return;
    setSavingAuth(true);
    setError(null);

    const body: { authMode: SessionAuthMode; authSecret?: string | null } = {
      authMode: editAuthMode,
    };
    if (editAuthMode === "none") {
      body.authSecret = null;
    } else if (editAuthSecret.trim()) {
      body.authSecret = editAuthSecret.trim();
    }

    const updated = await patchStream(editStream, { ...body, revalidate: true });
    setSavingAuth(false);
    if (updated) {
      setEditStream(null);
      setDiscoveryNote(tSession("revalidateSuccess"));
    }
  }

  async function revalidateStream(stream: StreamRow) {
    setRevalidatingId(stream.id);
    setError(null);

    const response = await fetch(`/api/sources/${stream.id}/revalidate`, { method: "POST" });
    const payload = (await response.json()) as { stream?: StreamRow; error?: string };

    if (!response.ok) {
      if (payload.stream) replaceStreamRow(payload.stream);
      setError(payload.error ?? t("errors.updateFailed"));
    } else if (payload.stream) {
      replaceStreamRow(payload.stream);
      setDiscoveryNote(tSession("revalidateSuccess"));
    }

    setRevalidatingId(null);
  }

  async function rediscover() {
    discoverAbortRef.current?.abort();
    const controller = new AbortController();
    discoverAbortRef.current = controller;

    setDiscovering(true);
    setDiscoverPhase("preparing");
    setDiscoverPhaseDetail(undefined);
    setError(null);
    setDiscoveryNote(null);

    try {
      const manifest = await readEngineStream<{
        enabled: unknown[];
        errors: string[];
        ranAt: string;
      }>(
        await fetch("/api/sources/discover?stream=1", {
          method: "POST",
          signal: controller.signal,
        }),
        (phase, detail) => {
          setDiscoverPhase(phase as SourceDiscoveryPhase);
          setDiscoverPhaseDetail(detail);
        },
        { signal: controller.signal },
      );

      const listResponse = await fetch("/api/sources");
      if (listResponse.ok) {
        const payload = (await listResponse.json()) as { streams: StreamRow[] };
        setStreams(payload.streams);
      }

      setDiscoveryNote(
        t("discoveryNote", {
          count: manifest.enabled.length,
          skipped: manifest.errors.length
            ? t("discoverySkipped", { count: manifest.errors.length })
            : "",
        }),
      );
    } catch (discoverError) {
      if (discoverError instanceof DOMException && discoverError.name === "AbortError") {
        setDiscoveryNote(t("discoveryCancelled"));
        return;
      }
      setError(discoverError instanceof Error ? discoverError.message : t("errors.discoverFailed"));
    } finally {
      if (discoverAbortRef.current === controller) {
        discoverAbortRef.current = null;
      }
      setDiscovering(false);
    }
  }

  function cancelDiscovery() {
    discoverAbortRef.current?.abort();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { profileSummary: profileLine })}
          </p>
          {lastDiscoveryStats && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("lastDiscoverySummary", {
                found: lastDiscoveryStats.found,
                enabled: lastDiscoveryStats.enabled,
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("addCustom.open")}
          </Button>
          <Button variant="outline" onClick={() => setOpmlDialogOpen(true)}>
            <FileUp className="h-4 w-4" />
            {t("importOpml.open")}
          </Button>
          <Button
            variant="outline"
            onClick={clearFetchCache}
            disabled={clearingCache}
          >
            <Trash2 className="h-4 w-4" />
            {clearingCache ? t("clearCache.clearing") : t("clearCache.open")}
          </Button>
          {discovering ? (
            <Button variant="outline" onClick={cancelDiscovery}>
              {t("cancelDiscovery")}
            </Button>
          ) : (
            <Button onClick={rediscover}>{t("rediscover")}</Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.enabled")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{enabledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.healthy")}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{healthyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>{t("stats.lastDiscovery")}</CardDescription>
            <CardTitle className="text-base font-medium leading-snug">{lastDiscoveryLabel}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {discoveryNote && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="text-sm text-foreground">{discoveryNote}</CardContent>
        </Card>
      )}

      <Collapsible open={sessionInfoOpen} onOpenChange={setSessionInfoOpen}>
        <Card className="border-dashed py-0">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
            {tSession("title")}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${sessionInfoOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-1 border-t pt-0 pb-4 text-sm text-muted-foreground">
              <p>{tSession("description")}</p>
              <p>{tSession("warning")}</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={techDetailsOpen} onOpenChange={setTechDetailsOpen}>
        <Card className="border-dashed py-0">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
            {t("technical.title")}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${techDetailsOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 border-t pt-3 pb-4 text-sm text-muted-foreground">
              <p>{t("technical.description")}</p>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  {t("technical.cities")}
                </p>
                {resolvedCities.length === 0 ? (
                  <p className="text-sm">{t("technical.none")}</p>
                ) : (
                  <ul className="space-y-1">
                    {resolvedCities.map((city) => (
                      <li key={city.identity || city.raw} className="text-sm">
                        <span className="font-medium text-foreground">
                          {city.label || city.raw}
                        </span>
                        {city.metro ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({city.metro.id} · {city.metro.countryCode.toUpperCase()} ·{" "}
                            {city.metro.slug})
                          </span>
                        ) : (
                          <span className="ml-2 text-xs text-muted-foreground">(unmapped)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  {t("technical.districts")}
                </p>
                {resolvedDistricts.length === 0 ? (
                  <p className="text-sm">{t("technical.none")}</p>
                ) : (
                  <ul className="space-y-1">
                    {resolvedDistricts.map((district) => (
                      <li key={district} className="text-sm">
                        <span className="font-medium text-foreground">{district}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  {t("technical.connectors")}
                </p>
                {connectorDetails.length === 0 ? (
                  <p className="text-sm">{t("technical.none")}</p>
                ) : (
                  <ul className="space-y-1">
                    {connectorDetails.map((row) => (
                      <li key={row.seedUrl} className="text-sm">
                        <span className="font-medium text-foreground">
                          {row.connectorId || t("technical.none")}
                        </span>
                        {row.params.city || row.params.country ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {row.params.city ? `city=${row.params.city}` : ""}
                            {row.params.country
                              ? `${row.params.city ? ", " : ""}country=${row.params.country}`
                              : ""}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {discovering && (
        <EngineActivityPanel
          phase={discoverPhase}
          detail={discoverPhaseDetail}
          namespace="engine.discover"
        />
      )}

      {streams.length > 0 && !discovering && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("category.label")}</p>
            <p className="text-xs text-muted-foreground">{t("category.onsiteHint")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "all" as const, label: t("category.all"), count: streams.length },
                { id: "remote" as const, label: t("category.remote"), count: remoteCount },
                { id: "onsite" as const, label: t("category.onsite"), count: onsiteCount },
              ] as const
            ).map((option) => (
              <Toggle
                key={option.id}
                pressed={categoryFilter === option.id}
                onPressedChange={(pressed) => {
                  if (pressed) setCategoryFilter(option.id);
                }}
                variant="outline"
                className="data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                {option.label}
                <span className="ml-1.5 tabular-nums text-muted-foreground">({option.count})</span>
              </Toggle>
            ))}
          </div>
        </div>
      )}

      {discovering ? (
        <Card className="py-0" aria-busy="true" aria-live="polite">
          <SourcesTableSkeleton rows={Math.max(streams.length, 4)} />
        </Card>
      ) : streams.length === 0 ? (
        <PageEmpty
          icon={Radio}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/settings" />}>
              {t("empty.cta")}
            </Button>
          }
        />
      ) : filteredStreams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("category.emptyFiltered")}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
            <span>
              {categoryFilter === "all"
                ? t("stats.enabled")
                : categoryFilter === "remote"
                  ? t("category.remote")
                  : t("category.onsite")}
            </span>
            <div className="flex items-center gap-2">
              {enableAllTargets.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={enablingAll}
                  onClick={enableAllFiltered}
                >
                  {enablingAll ? t("enableAll.busy") : t("enableAll.button")}
                </Button>
              )}
              <span className="tabular-nums">
                {filteredEnabledCount}/{filteredStreams.length} {t("table.enabled").toLowerCase()}
              </span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead className="hidden md:table-cell" title={t("table.kindHint")}>
                  {t("table.kind")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">{t("table.category")}</TableHead>
                <TableHead title={t("table.healthHint")}>{t("table.health")}</TableHead>
                <TableHead className="hidden sm:table-cell" title={t("table.confidenceHint")}>
                  {t("table.confidence")}
                </TableHead>
                <TableHead>{t("table.enabled")}</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">{t("table.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStreams.map((stream) => (
                <TableRow key={stream.id} className={!stream.enabled ? "opacity-60" : undefined}>
                  <TableCell className="max-w-[14rem] whitespace-normal sm:max-w-xs">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{stream.label}</span>
                        {stream.hasSessionAuth && (
                          <Badge variant="outline" className="text-[0.65rem]">
                            {tSession("badge")}
                          </Badge>
                        )}
                        {stream.ephemeral && (
                          <Badge variant="secondary" className="text-[0.65rem]">
                            {t("intake.alwaysOn")}
                          </Badge>
                        )}
                        {(() => {
                          const reach = classifySourceNetworkReach(stream.seedUrl);
                          if (reach === "global") return null;
                          return (
                            <Badge variant="outline" className="text-[0.65rem] text-muted-foreground">
                              {reach === "cn" ? t("table.networkReachCn") : t("table.networkReachIntl")}
                            </Badge>
                          );
                        })()}
                      </div>
                      {stream.seedUrl.startsWith("connector://") ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatSourceSeedUrl(stream.seedUrl)}
                        </span>
                      ) : (
                        <a
                          href={stream.seedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-primary hover:underline"
                        >
                          {stream.seedUrl}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={intakeBadgeVariant(stream.intakeType)}>
                      {tEnums(`sourceIntake.${stream.intakeType}` as "sourceIntake.api")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="space-y-1">
                      <Badge
                        variant={stream.workCategory === "remote" ? "secondary" : "outline"}
                        className="text-[0.65rem]"
                      >
                        {tEnums(
                          `streamWorkCategory.${stream.workCategory}` as "streamWorkCategory.remote",
                        )}
                      </Badge>
                      {stream.workCategory === "onsite" && stream.regionHint && (
                        <p className="text-xs text-muted-foreground">{stream.regionHint}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StreamHealthBadge health={stream.health} />
                      {stream.enabled &&
                        (stream.health === "dead" || stream.health === "stale") && (
                          <Badge variant="outline" className="text-[0.65rem] text-muted-foreground">
                            {t("table.suggestDisable")}
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">
                    {Math.round(stream.confidence * 100)}%
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={stream.enabled}
                      disabled={stream.ephemeral}
                      onCheckedChange={(checked) => toggleEnabled(stream, Boolean(checked))}
                      aria-label={t("stream.enabled")}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label={tActions("more")} />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!stream.seedUrl.startsWith("connector://") && (
                          <DropdownMenuItem
                            render={
                              <a href={stream.seedUrl} target="_blank" rel="noreferrer" />
                            }
                          >
                            {tActions("openUrl")}
                          </DropdownMenuItem>
                        )}
                        {stream.origin === "user" && (
                          <>
                            <DropdownMenuItem onClick={() => openEditSessionAuth(stream)}>
                              {tSession("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={revalidatingId === stream.id}
                              onClick={() => revalidateStream(stream)}
                            >
                              {revalidatingId === stream.id
                                ? tSession("revalidating")
                                : tSession("revalidate")}
                            </DropdownMenuItem>
                            {stream.hasSessionAuth && (
                              <DropdownMenuItem onClick={() => clearSessionAuth(stream)}>
                                {tSession("clear")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => removeCustomSource(stream)}
                            >
                              {tActions("remove")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addCustom.title")}</DialogTitle>
            <DialogDescription>{t("addCustom.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customUrl">{t("addCustom.urlLabel")}</Label>
              <Input
                id="customUrl"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={t("addCustom.urlPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customLabel">{t("addCustom.labelLabel")}</Label>
              <Input
                id="customLabel"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={t("addCustom.labelPlaceholder")}
              />
            </div>
            <Collapsible open={sessionAuthOpen} onOpenChange={setSessionAuthOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50">
                {tSession("title")}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${sessionAuthOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">{tSession("warning")}</p>
                <SessionAuthFields
                  authMode={customAuthMode}
                  authSecret={customAuthSecret}
                  onAuthModeChange={setCustomAuthMode}
                  onAuthSecretChange={setCustomAuthSecret}
                  labels={sessionAuthLabels}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {tProfile("cancel")}
            </Button>
            <Button onClick={addCustomSource} disabled={adding || !customUrl.trim()}>
              {adding ? t("addCustom.submitting") : t("addCustom.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={opmlDialogOpen} onOpenChange={setOpmlDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("importOpml.title")}</DialogTitle>
            <DialogDescription>{t("importOpml.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="opmlText">{t("importOpml.opmlLabel")}</Label>
            <Textarea
              id="opmlText"
              value={opmlText}
              onChange={(e) => setOpmlText(e.target.value)}
              placeholder={t("importOpml.opmlPlaceholder")}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpmlDialogOpen(false)}>
              {tProfile("cancel")}
            </Button>
            <Button onClick={importOpmlSources} disabled={importingOpml || !opmlText.trim()}>
              {importingOpml ? t("importOpml.submitting") : t("importOpml.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditStream(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tSession("editTitle")}</DialogTitle>
            <DialogDescription>
              {editStream
                ? tSession("editDescription", { label: editStream.label })
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{tSession("warning")}</p>
            <SessionAuthFields
              authMode={editAuthMode}
              authSecret={editAuthSecret}
              onAuthModeChange={setEditAuthMode}
              onAuthSecretChange={setEditAuthSecret}
              labels={sessionAuthLabels}
              secretOptional
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStream(null)}>
              {tProfile("cancel")}
            </Button>
            <Button onClick={saveEditSessionAuth} disabled={savingAuth}>
              {savingAuth ? tSession("saving") : tSession("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** @deprecated Use SourcesRegistryView */
export const SourcesView = SourcesRegistryView;

export type { StreamRow, SourcesProfileSummary, LastDiscoveryStats } from "@/components/sources/types";
