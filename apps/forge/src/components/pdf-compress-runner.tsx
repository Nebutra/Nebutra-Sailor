"use client";

/**
 * PDF compress runner — upload → invoke host qpdf/gs → preview + download.
 */
import { Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  FileDropZone,
  fileToBase64,
  formatBytes,
  invokeForge,
  MetaCards,
  PdfResultPanel,
} from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

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
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError(t("pdfCompress.needPdf"));
      return;
    }
    setFileName(file.name);
    setError("");
    setMeta(null);
    setOutBase64("");
    setBase64(await fileToBase64(file));
  };

  const run = async () => {
    if (!base64) {
      setError(t("pdfCompress.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    const r = await invokeForge(toolId, { fileBase64: base64, quality, engine });
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

  const inputBytes = base64 ? Math.ceil((base64.length * 3) / 4) : 0;
  const savedPct =
    meta && Number(meta.bytesIn) > 0
      ? Math.round((Number(meta.saved ?? 0) / Number(meta.bytesIn)) * 1000) / 10
      : null;
  const outName = `${(fileName || "document").replace(/\.pdf$/i, "")}.compressed.pdf`;

  return (
    <div className="space-y-4">
      <FileDropZone
        accept="application/pdf,.pdf"
        label={fileName ? `${fileName} · ~${formatBytes(inputBytes)}` : t("pdfCompress.drop")}
        hint={t("common.dragDrop")}
        onFiles={(files) => void onFile(files[0] ?? null)}
      />
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
        <div className="space-y-3">
          <MetaCards
            items={[
              { label: t("pdfCompress.engine"), value: String(meta.engine ?? "—") },
              { label: t("pdfCompress.quality"), value: String(meta.quality ?? "—") },
              { label: t("pdfCompress.in"), value: formatBytes(Number(meta.bytesIn ?? 0)) },
              { label: t("pdfCompress.out"), value: formatBytes(Number(meta.bytesOut ?? 0)) },
              {
                label: t("pdfCompress.saved"),
                value: `${formatBytes(Number(meta.saved ?? 0))} (${String(meta.savedPercent ?? savedPct ?? 0)}%)`,
              },
              {
                label: t("common.metrics"),
                value: meta.pageCount != null ? `${String(meta.pageCount)} pages` : "—",
              },
            ]}
          />
          {Number(meta.bytesIn) > 0 ? (
            <div>
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
            <p className="text-xs leading-relaxed text-[var(--neutral-11)]">{String(meta.note)}</p>
          ) : null}
        </div>
      ) : null}

      {outBase64 ? <PdfResultPanel base64={outBase64} filename={outName} /> : null}

      <RunnerNote>{t("pdfCompress.note")}</RunnerNote>
    </div>
  );
}
