"use client";

import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

const SAMPLE = `# Nebutra Forge

**Markdown → PDF** (Playwright print)

- Mixed **bold**
- Code: \`const x = 1\`

| Col | Val |
| --- | --- |
| A | 1 |
`;

export function MdToPdfRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone wraps native file input */}
      <div
        className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4 text-sm text-[var(--neutral-11)]"
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
        <p className="mt-2">{t("mdToPdf.drop")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("mdToPdf.title")}
          id="md-pdf-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <RunnerSelect
          label={t("mdToPdf.engine")}
          id="md-pdf-engine"
          value={engine}
          onChange={(v) => setEngine(v as typeof engine)}
        >
          <option value="auto">{t("mdToPdf.eAuto")}</option>
          <option value="playwright">{t("mdToPdf.ePlaywright")}</option>
          <option value="simple">{t("mdToPdf.eSimple")}</option>
        </RunnerSelect>
      </div>

      <Textarea
        label="Markdown"
        id="md-pdf-body"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={14}
        className="font-mono text-sm"
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
          {loading ? t("mdToPdf.generating") : t("mdToPdf.generate")}
        </Button>
        {downloadUrl ? (
          <Button asChild variant="outline">
            <a href={downloadUrl} download={`${title || "document"}.pdf`}>
              {t("mdToPdf.download")}
            </a>
          </Button>
        ) : null}
      </div>

      <RunnerNote>{t("mdToPdf.note")}</RunnerNote>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{meta}</RunnerNote>
    </div>
  );
}
