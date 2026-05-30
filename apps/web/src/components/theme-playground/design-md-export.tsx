"use client";

import { Check, Copy, Download, Warning } from "@nebutra/icons";
import { Button, Spinner } from "@nebutra/ui/primitives";
import { useState, useTransition } from "react";
import { exportThemeAction } from "./actions";

export interface DesignMdExportProps {
  themeId: string;
  themeName: string;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DesignMdExport({ themeId, themeName }: DesignMdExportProps) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const res = await exportThemeAction(themeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      downloadText(`${themeId}.DESIGN.md`, res.export.designMd, "text/markdown");
      downloadText(`${themeId}.preview.html`, res.export.previewHtml, "text/html");
    });
  }

  function handleCopy() {
    setError(null);
    startTransition(async () => {
      const res = await exportThemeAction(themeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await navigator.clipboard.writeText(res.export.designMd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-border/80 bg-card/70"
          prefix={isPending ? <Spinner size="xs" /> : <Download />}
          type="button"
          disabled={isPending}
          onClick={handleExport}
          aria-label={`Export ${themeName} as DESIGN.md`}
        >
          {isPending ? "Exporting…" : "Export DESIGN.md"}
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          className="h-8"
          prefix={copied ? <Check /> : <Copy />}
          type="button"
          disabled={isPending}
          onClick={handleCopy}
          aria-label={`Copy ${themeName} DESIGN.md to clipboard`}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {error !== null && (
        <div
          className="flex items-start gap-2 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs"
          role="alert"
        >
          <Warning className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
