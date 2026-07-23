"use client";

import { useState } from "react";

const SAMPLE = `# Nebutra Forge

**Markdown → PDF**（Playwright 打印）

- 中文与 **粗体**
- 代码：\`const x = 1\`

| Col | Val |
| --- | --- |
| A | 1 |
`;

export function MdToPdfRunner({ toolId }: { toolId: string }) {
  const [markdown, setMarkdown] = useState(SAMPLE);
  const [title, setTitle] = useState("document");
  const [engine, setEngine] = useState<"auto" | "playwright" | "simple">("auto");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMarkdown(String(reader.result ?? ""));
    reader.readAsText(file);
    if (file.name.endsWith(".md")) setTitle(file.name.replace(/\.md$/i, ""));
  };

  const run = async () => {
    setLoading(true);
    setError("");
    setDownloadUrl("");
    setMeta("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { markdown, title, engine } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: {
          base64?: string;
          contentType?: string;
          renderEngine?: string;
          sotaNote?: string;
          bytes?: number;
        };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      const out = body.output;
      if (!out?.base64) {
        setError("no pdf payload");
        return;
      }
      const url = `data:${out.contentType ?? "application/pdf"};base64,${out.base64}`;
      setDownloadUrl(url);
      setMeta(`${out.renderEngine} · ${out.bytes ?? "?"} bytes · ${out.sotaNote ?? ""}`.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border-2 border-dashed border-border bg-background p-4 text-sm text-muted-foreground"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          type="file"
          accept=".md,text/markdown,text/plain"
          data-allow-native
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <p className="mt-2">拖拽 .md 文件，或粘贴下方 Markdown</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label>
          标题
          <input
            data-allow-native
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="ml-2 rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label>
          引擎
          <select
            data-allow-native
            value={engine}
            onChange={(e) => setEngine(e.target.value as typeof engine)}
            className="ml-2 rounded border border-border bg-background px-2 py-1"
          >
            <option value="auto">auto（优先 Playwright）</option>
            <option value="playwright">playwright（Chromium 排版打印）</option>
            <option value="simple">simple（无浏览器）</option>
          </select>
        </label>
      </div>

      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={14}
        className="w-full rounded-lg border border-border bg-background p-3 font-mono text-sm"
      />

      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "生成中…" : "生成 PDF"}
      </button>

      <p className="text-xs text-muted-foreground">
        渲染路径：marked → HTML/CSS → Chromium print（Playwright）。中文依赖宿主系统字体（PingFang /
        Noto Sans CJK / 微软雅黑）。无浏览器时 auto 会回退 simple。
      </p>

      {error ? (
        <pre className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </pre>
      ) : null}
      {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
      {downloadUrl ? (
        <a
          href={downloadUrl}
          download={`${title || "document"}.pdf`}
          className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium underline"
        >
          下载 PDF
        </a>
      ) : null}
    </div>
  );
}
