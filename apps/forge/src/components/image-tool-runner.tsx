"use client";

import { useCallback, useState } from "react";

/** Image tools: drag-drop upload, sharp server transform, before/after preview. */
export function ImageToolRunner({ toolId }: { toolId: string }) {
  const [fileName, setFileName] = useState("");
  const [base64, setBase64] = useState("");
  const [format, setFormat] = useState<"webp" | "jpeg" | "png">("webp");
  const [quality, setQuality] = useState(80);
  const [width, setWidth] = useState("");
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
      setError("请先选择图片");
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
          width: out.width,
          height: out.height,
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

  return (
    <div className="space-y-4">
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
            ? `已选：${fileName}（${(inputBytes / 1024).toFixed(1)} KB）`
            : "拖拽图片到此处，或点击选择"}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label>
          格式
          <select
            data-allow-native
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="ml-2 rounded border border-border bg-background px-2 py-1"
          >
            <option value="webp">webp</option>
            <option value="jpeg">jpeg</option>
            <option value="png">png</option>
          </select>
        </label>
        <label>
          质量 {quality}
          <input
            data-allow-native
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="ml-2 align-middle"
          />
        </label>
        <label>
          最大宽
          <input
            data-allow-native
            type="number"
            placeholder="可选"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="ml-2 w-24 rounded border border-border bg-background px-2 py-1"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void run()}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "处理中…" : "运行（sharp）"}
        </button>
        <button
          type="button"
          disabled={!previewOut}
          onClick={download}
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
        >
          下载结果
        </button>
      </div>

      {error ? (
        <pre className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </pre>
      ) : null}

      {resultMeta ? (
        <p className="text-sm text-muted-foreground">
          输出 {(resultMeta.bytes / 1024).toFixed(1)} KB
          {resultMeta.width && resultMeta.height
            ? ` · ${resultMeta.width}×${resultMeta.height}`
            : null}
          {ratio !== null ? ` · 约为原图 ${ratio}%` : null}
          {" · "}
          {resultMeta.contentType}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {previewIn ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">原图</p>
            {/* biome-ignore lint/performance/noImgElement: data-url preview */}
            <img
              src={previewIn}
              alt="input preview"
              className="max-h-72 w-full rounded-lg border border-border object-contain"
            />
          </div>
        ) : null}
        {previewOut ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">结果</p>
            {/* biome-ignore lint/performance/noImgElement: data-url preview */}
            <img
              src={previewOut}
              alt="output preview"
              className="max-h-72 w-full rounded-lg border border-border object-contain"
            />
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        引擎：sharp（libvips）· 服务端处理 · Agent 同 invoke 契约（imageBase64）
      </p>
    </div>
  );
}
