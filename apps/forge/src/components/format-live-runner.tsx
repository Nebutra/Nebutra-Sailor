"use client";

/**
 * Live format / minify journey — shared by CSS/HTML/YAML/TOML/SQL/JS/XML/JSON minify.
 * Input debounce → invoke → before/after dual pane + download as file.
 */
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  CodeDualPane,
  downloadText,
  invokeForge,
  useDebouncedCallback,
} from "@/components/result-panels";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

export interface FormatLiveExtraField {
  key: string;
  label: string;
  kind: "number" | "select" | "text";
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export function FormatLiveRunner({
  toolId,
  sample,
  downloadName,
  note,
  inputKey = "text",
  resultKey = "result",
  extraFields = [],
  liveMaxChars = 120_000,
}: {
  toolId: string;
  sample: string;
  downloadName: string;
  note?: string;
  inputKey?: string;
  resultKey?: string;
  extraFields?: readonly FormatLiveExtraField[];
  liveMaxChars?: number;
}) {
  const t = useTranslations("runners.common");
  const [text, setText] = useState(sample);
  const [extras, setExtras] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of extraFields) init[f.key] = f.defaultValue;
    return init;
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const run = async (source: string, force = false) => {
    if (!source.trim()) {
      setOutput("");
      setError("");
      return;
    }
    if (!force && source.length > liveMaxChars) {
      setError(`Input > ${liveMaxChars} chars — press Run`);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError("");
    const input: Record<string, unknown> = { [inputKey]: source };
    for (const f of extraFields) {
      const raw = extras[f.key] ?? f.defaultValue;
      input[f.key] = f.kind === "number" ? Number(raw) : raw;
    }
    const r = await invokeForge(toolId, input, ac.signal);
    if (ac.signal.aborted) return;
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const out = r.output;
    const val =
      typeof out[resultKey] === "string"
        ? String(out[resultKey])
        : typeof out.result === "string"
          ? String(out.result)
          : typeof out.formatted === "string"
            ? String(out.formatted)
            : typeof out.minified === "string"
              ? String(out.minified)
              : JSON.stringify(out, null, 2);
    setOutput(val);
  };

  const debounced = useDebouncedCallback((value: string) => {
    if (live) void run(value);
  }, 380);

  useEffect(() => {
    if (live && text.trim()) debounced(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when live toggles on
  }, [live, extras]);

  return (
    <div className="space-y-4">
      {extraFields.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {extraFields.map((f) =>
            f.kind === "select" && f.options ? (
              <RunnerSelect
                key={f.key}
                id={`fmt-${f.key}`}
                label={f.label}
                value={extras[f.key] ?? f.defaultValue}
                onChange={(v) => setExtras((prev) => ({ ...prev, [f.key]: v }))}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </RunnerSelect>
            ) : (
              <Input
                key={f.key}
                id={`fmt-${f.key}`}
                label={f.label}
                type={f.kind === "number" ? "number" : "text"}
                value={extras[f.key] ?? f.defaultValue}
                onChange={(e) => setExtras((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="font-mono"
              />
            ),
          )}
        </div>
      ) : null}

      <Textarea
        label={t("input")}
        id="fmt-input"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (live) debounced(v);
        }}
        rows={12}
        className="font-mono text-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ink" disabled={loading} onClick={() => void run(text, true)}>
          {loading ? t("running") : t("run")}
        </Button>
        <Button
          type="button"
          variant={live ? "outline" : "ghost"}
          size="sm"
          onClick={() => setLive((v) => !v)}
        >
          {live ? t("liveHint") : "Live off"}
        </Button>
        {output ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadText(output, downloadName)}
          >
            {t("download")}
          </Button>
        ) : null}
      </div>

      <RunnerError>{error}</RunnerError>
      <CodeDualPane
        input={text}
        output={output}
        inputLabel={t("before")}
        outputLabel={t("after")}
        downloadName={downloadName}
      />
      {note ? <RunnerNote>{note}</RunnerNote> : <RunnerNote>{t("sameAsApi")}</RunnerNote>}
    </div>
  );
}
