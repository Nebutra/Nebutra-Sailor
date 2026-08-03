"use client";

import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FileDropZone, invokeForge, PdfResultPanel } from "@/components/result-panels";
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
  const [engine, setEngine] = useState<"playwright" | "simple">("playwright");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [outBase64, setOutBase64] = useState("");
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
    setMeta("");
    setOutBase64("");
    try {
      const r = await invokeForge(toolId, { markdown, title, engine });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      const out = r.output;
      const b64 = typeof out.base64 === "string" ? out.base64 : "";
      if (!b64) {
        setError(t("mdToPdf.noPayload"));
        return;
      }
      setOutBase64(b64);
      setMeta(
        `${String(out.renderEngine ?? "?")} · ${String(out.bytes ?? "?")} bytes · ${String(out.sotaNote ?? "")}`.trim(),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropZone
        accept=".md,text/markdown,text/plain"
        label={t("mdToPdf.drop")}
        onFiles={(files) => onFile(files[0] ?? null)}
      />

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

      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? t("mdToPdf.generating") : t("mdToPdf.generate")}
      </Button>

      <RunnerNote>{t("mdToPdf.note")}</RunnerNote>
      <RunnerError>{error}</RunnerError>
      {outBase64 ? (
        <PdfResultPanel
          base64={outBase64}
          filename={`${title || "document"}.pdf`}
          meta={meta || undefined}
        />
      ) : null}
    </div>
  );
}
