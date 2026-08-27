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
  /** Override the inter-poll delay for testing. */
  wait?: (ms: number) => Promise<void>;
}

/**
 * The export runs as a queued job, so the first status read is normally still
 * `pending`. Reading once and calling it done — which is what this card used to
 * do — leaves the user looking at a success message with no file behind it.
 */
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 45;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

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
  wait = sleep,
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

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
          await wait(POLL_INTERVAL_MS);
        }

        const status = await fetchExport(start.exportId);

        if (status.status === "failed") {
          setPhase("error");
          setErrorMessage(t("error"));
          return;
        }
        if (status.status !== "ready") {
          continue;
        }

        const href =
          status.inline && status.data !== undefined
            ? buildDownloadHref(status.data)
            : (status.downloadUrl ?? null);

        // A "ready" export with nothing to download is a failure wearing a
        // success label — the build finished but the artifact never landed.
        if (!href) {
          setPhase("error");
          setErrorMessage(t("error"));
          return;
        }

        setDownloadHref(href);
        setPhase("ready");
        return;
      }

      // Ninety seconds of pending. Reuses the generic failure copy rather than
      // adding a `timeout` key, which would need a real translation in all 35
      // catalogs for a state the user reaches only when the queue is stuck —
      // and "try again" is the right advice either way.
      setPhase("error");
      setErrorMessage(t("error"));
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : t("error"));
    }
  }

  return (
    <section
      aria-labelledby="data-export-heading"
      className="rounded-[var(--radius-lg)] border border-border bg-background p-6"
    >
      <h2 id="data-export-heading" className="text-base font-semibold text-foreground">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t("compliance")}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={phase === "pending"}
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[hsl(var(--foreground))] px-4 py-2 text-sm font-medium text-[hsl(var(--background))] hover:bg-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "pending" ? t("pending") : t("export")}
        </button>

        {phase === "ready" && downloadHref ? (
          <a
            href={downloadHref}
            download="nebutra-account-export.json"
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
