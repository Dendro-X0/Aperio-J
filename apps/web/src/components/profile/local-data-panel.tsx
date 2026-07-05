"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileFieldCard } from "@/components/profile/profile-field-card";

interface LocalDatabaseInfo {
  databaseUrl: string;
  databasePath: string | null;
  databaseSizeBytes: number | null;
  counts: {
    profiles: number;
    streams: number;
    opportunities: number;
    matchRuns: number;
    feedback: number;
  };
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface LocalDataPanelProps {
  resetting: boolean;
  onResetClick: () => void;
}

export function LocalDataPanel({ resetting, onResetClick }: LocalDataPanelProps) {
  const { t } = useTranslations("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<LocalDatabaseInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    setInfoError(null);
    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        throw new Error(t("localData.loadError"));
      }
      setInfo((await response.json()) as LocalDatabaseInfo);
    } catch (error) {
      setInfoError(error instanceof Error ? error.message : t("localData.loadError"));
    }
  }, [t]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  async function exportBackup() {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/data/export");
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? t("localData.exportError"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `aperio-j-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t("localData.exportError"));
    } finally {
      setExporting(false);
    }
  }

  function onImportFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPendingImportFile(file);
    setImportConfirmOpen(true);
  }

  async function confirmImport() {
    if (!pendingImportFile) return;
    setImporting(true);
    setImportError(null);

    try {
      const text = await pendingImportFile.text();
      const bundle = JSON.parse(text) as unknown;
      const response = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? t("localData.importError"));
      }
      setImportConfirmOpen(false);
      setPendingImportFile(null);
      window.location.href = "/settings";
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t("localData.importError"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ProfileFieldCard title={t("localData.storageTitle")} description={t("localData.storageDescription")}>
        {infoError ? (
          <p className="text-sm text-destructive">{infoError}</p>
        ) : info ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{t("localData.pathLabel")}</dt>
              <dd className="mt-0.5 break-all font-mono text-xs">{info.databasePath ?? info.databaseUrl}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("localData.sizeLabel")}</dt>
              <dd className="mt-0.5 font-medium">{formatBytes(info.databaseSizeBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("localData.countsLabel")}</dt>
              <dd className="mt-0.5 space-y-0.5">
                <p>{t("localData.countStreams", { count: info.counts.streams })}</p>
                <p>{t("localData.countOpportunities", { count: info.counts.opportunities })}</p>
                <p>{t("localData.countMatchRuns", { count: info.counts.matchRuns })}</p>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("localData.loading")}</p>
        )}
      </ProfileFieldCard>

      <ProfileFieldCard title={t("localData.backupTitle")} description={t("localData.backupDescription")}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={exporting} onClick={exportBackup}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? t("localData.exporting") : t("localData.exportAction")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? t("localData.importing") : t("localData.importAction")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFileSelected}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("localData.backupNote")}</p>
        {exportError && <p className="text-sm text-destructive">{exportError}</p>}
        {importError && <p className="text-sm text-destructive">{importError}</p>}
      </ProfileFieldCard>

      <ProfileFieldCard title={t("reset.confirmTitle")} description={t("reset.body")}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t("reset.clearsProfile")}</li>
          <li>{t("reset.clearsSources")}</li>
          <li>{t("reset.clearsMatches")}</li>
          <li>{t("localData.clearsCache")}</li>
        </ul>
        <Button type="button" variant="destructive" disabled={resetting} onClick={onResetClick}>
          {resetting ? t("reset.resetting") : t("reset.action")}
        </Button>
      </ProfileFieldCard>

      <Dialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("localData.importConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("localData.importConfirmDescription")}</DialogDescription>
          </DialogHeader>
          {pendingImportFile && (
            <p className="text-sm text-muted-foreground">
              {t("localData.importFile", { name: pendingImportFile.name })}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportConfirmOpen(false)}>
              {t("reset.cancel")}
            </Button>
            <Button type="button" disabled={importing} onClick={confirmImport}>
              {importing ? t("localData.importing") : t("localData.importConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
