"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

interface ExportResponse {
  exportId: string;
  status: "pending" | "ready" | "failed";
  estimatedReadyAt?: string;
  inline?: boolean;
}

interface ExportStatusResponse {
  exportId: string;
  status: "pending" | "ready" | "failed";
  inline?: boolean;
  data?: unknown;
  downloadUrl?: string;
  sizeBytes?: number;
}

interface DataExportCardProps {
  /** Override the API for testing. */
  startExport?: () => Promise<ExportResponse>;
  /** Override the status fetch for testing. */
  fetchExport?: (id: string) => Promise<ExportStatusResponse>;
}

async function defaultStartExport(): Promise<ExportResponse> {
  const response = await fetch("/api/account/export", { method: "POST" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to start export.");
  }
  return (await response.json()) as ExportResponse;
}

async function defaultFetchExport(id: string): Promise<ExportStatusResponse> {
  const response = await fetch(`/api/account/export?id=${encodeURIComponent(id)}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to fetch export.");
  }
  return (await response.json()) as ExportStatusResponse;
}

function buildDownloadHref(payload: unknown): string {
  const json = JSON.stringify(payload, null, 2);
  return `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
}

export function DataExportCard({
  startExport = defaultStartExport,
  fetchExport = defaultFetchExport,
}: DataExportCardProps = {}) {
  const t = useTranslations("account.export");
  const [phase, setPhase] = useState<"idle" | "pending" | "ready" | "error">("idle");
  const [downloadHref, setDownloadHref] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setPhase("pending");
    setErrorMessage(null);
    setDownloadHref(null);
    try {
      const start = await startExport();
      const status = await fetchExport(start.exportId);
      if (status.status === "failed") {
        setPhase("error");
        setErrorMessage(t("error"));
        return;
      }
      if (status.inline && status.data !== undefined) {
        setDownloadHref(buildDownloadHref(status.data));
      } else if (status.downloadUrl) {
        setDownloadHref(status.downloadUrl);
      }
      setPhase("ready");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : t("error"));
    }
  }

  return (
    <section
      aria-labelledby="data-export-heading"
      className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6"
    >
      <h2 id="data-export-heading" className="text-base font-semibold text-[var(--neutral-12)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("description")}</p>
      <p className="mt-2 text-xs text-[var(--neutral-11)]">{t("compliance")}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={phase === "pending"}
          className="inline-flex items-center justify-center rounded-md bg-[var(--neutral-12)] px-4 py-2 text-sm font-medium text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "pending" ? t("pending") : t("export")}
        </button>

        {phase === "ready" && downloadHref ? (
          <a
            href={downloadHref}
            download="nebutra-account-export.json"
            className="inline-flex items-center justify-center rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-2)]"
          >
            {t("download")}
          </a>
        ) : null}
      </div>

      {phase === "ready" ? (
        <p className="mt-3 text-sm text-[color:var(--status-success)]" role="status">
          {t("ready")}
        </p>
      ) : null}
      {phase === "error" && errorMessage ? (
        <p className="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
