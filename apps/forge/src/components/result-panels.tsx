"use client";

/**
 * Shared result / asset journeys for Forge runners.
 * Hard-correct product bar: binary outputs must be previewable + downloadable
 * without inventing a one-off UI per tool.
 */

import { ArrowDown, ArrowUpRight, Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { base64ToBytes } from "@/components/result-panels-utils";
import { RunnerNote } from "@/components/runner-ui";

export { base64ToBytes, formatBytes } from "@/components/result-panels-utils";

/* ── binary helpers ─────────────────────────────────────────────────────── */

export function base64ToBlobUrl(base64: string, contentType: string): string {
  const bytes = base64ToBytes(base64);
  // Copy into a plain ArrayBuffer-backed view so BlobPart typing is clean.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return URL.createObjectURL(new Blob([copy.buffer], { type: contentType }));
}

export function downloadBase64(base64: string, filename: string, contentType: string): void {
  const url = base64ToBlobUrl(base64, contentType);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Defer revoke so the browser can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function downloadText(
  text: string,
  filename: string,
  contentType = "text/plain;charset=utf-8",
): void {
  const url = URL.createObjectURL(new Blob([text], { type: contentType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function fileToDataUrl(file: File): Promise<string> {
  const b64 = await fileToBase64(file);
  return `data:${file.type || "application/octet-stream"};base64,${b64}`;
}

/* ── hook: blob URL from base64 with revoke ─────────────────────────────── */

export function useBase64ObjectUrl(base64: string | null | undefined, contentType: string): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!base64) {
      setUrl("");
      return;
    }
    const next = base64ToBlobUrl(base64, contentType);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [base64, contentType]);
  return url;
}

/* ── PDF result panel ───────────────────────────────────────────────────── */

export function PdfResultPanel({
  base64,
  filename = "document.pdf",
  meta,
  className,
}: {
  base64: string;
  filename?: string;
  meta?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("runners.common");
  const url = useBase64ObjectUrl(base64, "application/pdf");
  if (!base64 || !url) return null;

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={url} download={filename}>
            <ArrowDown className="h-4 w-4" />
            {t("downloadPdf")}
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight className="h-4 w-4" />
            {t("openTab")}
          </a>
        </Button>
      </div>
      {meta ? <div className="text-xs text-[var(--neutral-10)]">{meta}</div> : null}
      <p className="text-sm font-medium text-[var(--neutral-12)]">{t("pdfPreview")}</p>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)]">
        <iframe
          title={t("pdfPreviewTitle")}
          src={url}
          className="h-[min(70vh,720px)] w-full bg-[var(--neutral-1)]"
        />
      </div>
      <RunnerNote>{t("pdfPreviewHint")}</RunnerNote>
    </div>
  );
}

/* ── Image result panel ─────────────────────────────────────────────────── */

export function ImageResultPanel({
  src,
  alt = "preview",
  filename = "image.png",
  meta,
  className,
}: {
  src: string;
  alt?: string;
  filename?: string;
  meta?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("runners.common");
  if (!src) return null;
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={src} download={filename}>
            <ArrowDown className="h-4 w-4" />
            {t("download")}
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight className="h-4 w-4" />
            {t("openTab")}
          </a>
        </Button>
      </div>
      {meta}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-80 max-w-full rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] object-contain"
      />
    </div>
  );
}

/* ── Meta metric cards ──────────────────────────────────────────────────── */

export function MetaCards({ items }: { items: readonly { label: string; value: ReactNode }[] }) {
  if (!items.length) return null;
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-2"
        >
          <dt className="text-xs text-[var(--neutral-10)]">{item.label}</dt>
          <dd className="mt-0.5 font-mono text-sm text-[var(--neutral-12)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── File drop zone ─────────────────────────────────────────────────────── */

export function FileDropZone({
  accept,
  multiple,
  label,
  hint,
  onFiles,
  fileLabel,
}: {
  accept?: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  onFiles: (files: File[]) => void;
  fileLabel?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-drop surface around a real label+input
    <div
      className="flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--neutral-6)] bg-[var(--neutral-1)] p-6 text-sm text-[var(--neutral-10)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const list = Array.from(e.dataTransfer.files ?? []);
        if (list.length) onFiles(multiple ? list : list.slice(0, 1));
      }}
    >
      <label
        htmlFor={inputId}
        className="flex w-full cursor-pointer flex-col items-center text-center"
      >
        <input
          ref={inputRef}
          id={inputId}
          data-allow-native
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) onFiles(list);
          }}
        />
        <span className="font-medium text-[var(--neutral-12)]">{label}</span>
        {fileLabel ? (
          <span className="mt-1 font-mono text-xs text-[var(--neutral-11)]">{fileLabel}</span>
        ) : null}
        {hint ? <span className="mt-2 text-xs">{hint}</span> : null}
      </label>
    </div>
  );
}

/* ── Code dual pane (format before/after) ───────────────────────────────── */

export function CodeDualPane({
  input,
  output,
  inputLabel,
  outputLabel,
  onCopy,
  onDownload,
  downloadName,
}: {
  input: string;
  output: string;
  inputLabel?: string;
  outputLabel?: string;
  onCopy?: () => void;
  onDownload?: () => void;
  downloadName?: string;
}) {
  const t = useTranslations("runners.common");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
    onCopy?.();
  }, [output, onCopy]);

  return (
    <div className="space-y-2">
      {output ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          {onDownload || downloadName ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onDownload) onDownload();
                else if (downloadName) downloadText(output, downloadName);
              }}
            >
              <ArrowDown className="h-4 w-4" />
              {t("download")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--neutral-10)]">{inputLabel ?? t("input")}</p>
          <pre className="max-h-80 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {input || "—"}
          </pre>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--neutral-10)]">
            {outputLabel ?? t("output")}
          </p>
          <pre className="max-h-80 overflow-auto rounded-[var(--radius-lg)] bg-[var(--neutral-2)] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {output || "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ── Copy + download text actions ───────────────────────────────────────── */

export function TextResultActions({
  text,
  downloadName,
  contentType,
}: {
  text: string;
  downloadName?: string;
  contentType?: string;
}) {
  const t = useTranslations("runners.common");
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("copied") : t("copy")}
      </Button>
      {downloadName ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => downloadText(text, downloadName, contentType)}
        >
          <ArrowDown className="h-4 w-4" />
          {t("download")}
        </Button>
      ) : null}
    </div>
  );
}

/* ── live debounce invoke ───────────────────────────────────────────────── */

export function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), ms);
    }) as T,
    [ms],
  );
}

export async function invokeForge(
  toolId: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; message: string }> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
    ...(signal ? { signal } : {}),
  });
  let body: {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
  };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { ok: false, message: `HTTP ${res.status}` };
  }
  if (!res.ok || body.ok === false) {
    return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, output: body.output ?? {} };
}
