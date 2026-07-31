"use client";

/**
 * PDF compress runner — upload → invoke host qpdf/gs → download result.
 */
import { ArrowDown, Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

async function invoke(
  toolId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; message: string }> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, output: body.output ?? {} };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function PdfCompressRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [fileName, setFileName] = useState("");
  const [base64, setBase64] = useState("");
  const [quality, setQuality] = useState("ebook");
  const [engine, setEngine] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [outBase64, setOutBase64] = useState("");
  const [copied, setCopied] = useState(false);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setMeta(null);
    setOutBase64("");
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    setBase64(btoa(binary));
  };

  const run = async () => {
    if (!base64) {
      setError(t("pdfCompress.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invoke(toolId, { fileBase64: base64, quality, engine });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const o = r.output;
    setMeta({
      engine: o.engine,
      quality: o.quality,
      bytesIn: o.bytesIn,
      bytesOut: o.bytesOut,
      saved: o.saved,
      savedPercent: o.savedPercent,
      pageCount: o.pageCount,
      note: o.note,
    });
    setOutBase64(typeof o.base64 === "string" ? o.base64 : "");
  };

  const download = () => {
    if (!outBase64) return;
    const a = document.createElement("a");
    // Critical: data URL, not a corrupted placeholder string.
    a.href = `data:application/pdf;base64,${outBase64}`;
    const base = fileName.replace(/\.pdf$/i, "") || "document";
    a.download = `${base}.compressed.pdf`;
    a.click();
  };

  const inputBytes = base64 ? Math.ceil((base64.length * 3) / 4) : 0;
  const savedPct =
    meta && Number(meta.bytesIn) > 0
      ? Math.round((Number(meta.saved ?? 0) / Number(meta.bytesIn)) * 1000) / 10
      : null;

  return (
    <div className="space-y-4">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone wraps native file input */}
      <div
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--neutral-6)] bg-[var(--neutral-1)] p-6 text-sm text-[var(--neutral-10)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0] ?? null;
          if (f && (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))) {
            void onFile(f);
          } else if (f) {
            setError(t("pdfCompress.needPdf"));
          }
        }}
      >
        <input
          data-allow-native
          type="file"
          accept="application/pdf,.pdf"
          className="mb-2 block w-full max-w-md text-sm"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <p>{fileName ? `${fileName} · ~${formatBytes(inputBytes)}` : t("pdfCompress.drop")}</p>
      </div>
      <RunnerNote>{t("pdfCompress.privacy")}</RunnerNote>

      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect
          id="pdf-quality"
          label={t("pdfCompress.quality")}
          value={quality}
          onChange={setQuality}
        >
          <option value="structural">{t("pdfCompress.qStructural")}</option>
          <option value="screen">{t("pdfCompress.qScreen")}</option>
          <option value="ebook">{t("pdfCompress.qEbook")}</option>
          <option value="printer">{t("pdfCompress.qPrinter")}</option>
        </RunnerSelect>
        <RunnerSelect
          id="pdf-engine"
          label={t("pdfCompress.engine")}
          value={engine}
          onChange={setEngine}
        >
          <option value="auto">{t("pdfCompress.eAuto")}</option>
          <option value="ghostscript">Ghostscript</option>
          <option value="qpdf">qpdf</option>
          <option value="pdf-lib">pdf-lib (fallback)</option>
        </RunnerSelect>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ink"
          onClick={() => void run()}
          disabled={loading || !base64}
        >
          {loading ? t("common.running") : t("common.run")}
        </Button>
        {outBase64 ? (
          <Button type="button" variant="ghost" onClick={download}>
            <ArrowDown className="h-4 w-4" />
            {t("pdfCompress.download")}
          </Button>
        ) : null}
        {meta ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        ) : null}
      </div>

      <RunnerError>{error}</RunnerError>

      {meta ? (
        <div className="grid gap-2 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-2)]/40 p-4 text-sm sm:grid-cols-2">
          <p>
            <span className="text-[var(--neutral-10)]">{t("pdfCompress.engine")}: </span>
            <span className="font-mono text-[var(--neutral-12)]">{String(meta.engine)}</span>
          </p>
          <p>
            <span className="text-[var(--neutral-10)]">{t("pdfCompress.quality")}: </span>
            <span className="font-mono text-[var(--neutral-12)]">{String(meta.quality)}</span>
          </p>
          <p>
            <span className="text-[var(--neutral-10)]">{t("pdfCompress.in")}: </span>
            <span className="tabular-nums text-[var(--neutral-12)]">
              {formatBytes(Number(meta.bytesIn ?? 0))}
            </span>
          </p>
          <p>
            <span className="text-[var(--neutral-10)]">{t("pdfCompress.out")}: </span>
            <span className="tabular-nums text-[var(--neutral-12)]">
              {formatBytes(Number(meta.bytesOut ?? 0))}
            </span>
          </p>
          <p className="sm:col-span-2">
            <span className="text-[var(--neutral-10)]">{t("pdfCompress.saved")}: </span>
            <span className="font-semibold tabular-nums text-[var(--status-success)]">
              {formatBytes(Number(meta.saved ?? 0))} ({String(meta.savedPercent ?? savedPct ?? 0)}%)
            </span>
          </p>
          {Number(meta.bytesIn) > 0 ? (
            <div className="sm:col-span-2">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--neutral-4)]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (Number(meta.bytesOut) / Number(meta.bytesIn)) * 100),
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--neutral-10)]">{t("pdfCompress.barHint")}</p>
            </div>
          ) : null}
          {meta.note ? (
            <p className="sm:col-span-2 text-xs leading-relaxed text-[var(--neutral-11)]">
              {String(meta.note)}
            </p>
          ) : null}
        </div>
      ) : null}

      <RunnerNote>{t("pdfCompress.note")}</RunnerNote>
    </div>
  );
}
