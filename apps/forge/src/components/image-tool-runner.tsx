"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

/** Image tools: drag-drop upload, sharp server transform, before/after preview. */
export function ImageToolRunner({
  toolId,
  mode = "compress",
}: {
  toolId: string;
  mode?: "compress" | "resize" | "convert";
}) {
  const t = useTranslations("runners");
  const [fileName, setFileName] = useState("");
  const [base64, setBase64] = useState("");
  const [format, setFormat] = useState<"webp" | "jpeg" | "png">(
    mode === "convert" ? "png" : "webp",
  );
  const [quality, setQuality] = useState(mode === "compress" ? 75 : 80);
  const [width, setWidth] = useState(mode === "resize" ? "1280" : "");
  const [height, setHeight] = useState("");
  const [inputBytes, setInputBytes] = useState(0);
  const [resultMeta, setResultMeta] = useState<{
    bytes: number;
    contentType: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [previewIn, setPreviewIn] = useState("");
  const [previewOut, setPreviewOut] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = useCallback((file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setInputBytes(file.size);
    setError("");
    setResultMeta(null);
    setPreviewOut("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setBase64(result);
      setPreviewIn(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const run = async () => {
    if (!base64) {
      setError(t("imageTool.needFile"));
      return;
    }
    setLoading(true);
    setError("");
    setResultMeta(null);
    try {
      const input: Record<string, unknown> = {
        imageBase64: base64,
        format,
        quality,
      };
      if (width) input.width = Number(width);
      if (height) input.height = Number(height);
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: {
          base64?: string;
          contentType?: string;
          bytes?: number;
          width?: number;
          height?: number;
          engine?: string;
        };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      const out = body.output;
      if (out?.base64 && out.contentType) {
        const url = `data:${out.contentType};base64,${out.base64}`;
        setPreviewOut(url);
        setResultMeta({
          bytes: out.bytes ?? 0,
          contentType: out.contentType,
          ...(out.width !== undefined ? { width: out.width } : {}),
          ...(out.height !== undefined ? { height: out.height } : {}),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!previewOut || !resultMeta) return;
    const a = document.createElement("a");
    a.href = previewOut;
    const ext = resultMeta.contentType.split("/")[1] ?? "webp";
    a.download = `forge-${Date.now()}.${ext}`;
    a.click();
  };

  const ratio =
    inputBytes > 0 && resultMeta ? Math.round((resultMeta.bytes / inputBytes) * 100) : null;

  const actionLabel =
    mode === "resize"
      ? t("imageTool.resize")
      : mode === "convert"
        ? t("imageTool.convert")
        : t("imageTool.compress");

  return (
    <div className="space-y-4">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone wraps native file input */}
      <div
        className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background p-6 text-sm text-muted-foreground"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          type="file"
          accept="image/*"
          data-allow-native
          className="mb-2 text-sm"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <p>
          {fileName
            ? t("imageTool.selected", {
                name: fileName,
                kb: (inputBytes / 1024).toFixed(1),
              })
            : t("imageTool.drop")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RunnerSelect
          label={t("imageTool.format")}
          id="image-format"
          value={format}
          onChange={(v) => setFormat(v as typeof format)}
        >
          <option value="webp">webp</option>
          <option value="jpeg">jpeg</option>
          <option value="png">png</option>
        </RunnerSelect>
        <label className="flex flex-col gap-1.5 text-sm text-[var(--neutral-11)]">
          <span className="text-xs font-medium">{t("imageTool.quality", { n: quality })}</span>
          <input
            data-allow-native
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--blue-9)]"
          />
        </label>
        <Input
          label={t("imageTool.maxW")}
          id="image-width"
          type="number"
          placeholder={mode === "resize" ? t("imageTool.resizeEg") : t("imageTool.optional")}
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
        <Input
          label={t("imageTool.maxH")}
          id="image-height"
          type="number"
          placeholder={t("imageTool.optional")}
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? t("imageTool.processing") : actionLabel}
        </Button>
        <Button type="button" variant="outline" disabled={!previewOut} onClick={download}>
          {t("imageTool.download")}
        </Button>
      </div>

      <RunnerError>{error}</RunnerError>

      {resultMeta ? (
        <RunnerNote>
          {t("imageTool.outMeta", {
            kb: (resultMeta.bytes / 1024).toFixed(1),
            dims:
              resultMeta.width && resultMeta.height
                ? t("imageTool.dims", { w: resultMeta.width, h: resultMeta.height })
                : "",
            ratio: ratio !== null ? t("imageTool.ratio", { pct: ratio }) : "",
            type: resultMeta.contentType,
          })}
        </RunnerNote>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {previewIn ? (
          <div>
            <p className="mb-1 text-xs text-[var(--neutral-10)]">{t("imageTool.original")}</p>
            <img
              src={previewIn}
              alt="input preview"
              className="max-h-72 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-6)] object-contain"
            />
          </div>
        ) : null}
        {previewOut ? (
          <div>
            <p className="mb-1 text-xs text-[var(--neutral-10)]">{t("imageTool.result")}</p>
            <img
              src={previewOut}
              alt="output preview"
              className="max-h-72 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-6)] object-contain"
            />
          </div>
        ) : null}
      </div>

      <RunnerNote>{t("imageTool.note")}</RunnerNote>
    </div>
  );
}
