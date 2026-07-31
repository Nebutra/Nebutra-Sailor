"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

const SAMPLE = `{
  "name": "Nebutra Forge",
  "features": ["format", "minify", "validate"],
  "ok": true
}`;

const LIVE_VALIDATE_MAX = 200_000;

function positionFromOffset(text: string, offset: number) {
  let line = 1;
  let column = 1;
  const max = Math.min(offset, text.length);
  for (let i = 0; i < max; i++) {
    if (text[i] === "\n") {
      line += 1;
      column = 1;
    } else column += 1;
  }
  return { line, column };
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortJsonKeys(obj[key]);
    }
    return out;
  }
  return value;
}

export function JsonFormatRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(SAMPLE);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const charCount = text.length;
  const lineCount = useMemo(() => (text ? text.split(/\r?\n/).length : 0), [text]);

  // Live validate (debounced) — competitors all show validity without a second click.
  useEffect(() => {
    if (!text.trim()) {
      setValid(null);
      setError("");
      return;
    }
    if (text.length > LIVE_VALIDATE_MAX) {
      // Large input: skip live parse to avoid UI jank; user presses Format.
      return;
    }
    const id = window.setTimeout(() => {
      try {
        JSON.parse(text);
        setValid(true);
        setError("");
      } catch (err) {
        setValid(false);
        const message = err instanceof Error ? err.message : String(err);
        const match = message.match(/position\s+(\d+)/i);
        if (match?.[1]) {
          const { line, column } = positionFromOffset(text, Number(match[1]));
          setError(
            `${message} (${t("jsonFormat.line")} ${line}, ${t("jsonFormat.column")} ${column})`,
          );
        } else setError(message);
      }
    }, 280);
    return () => window.clearTimeout(id);
  }, [t, text]);

  const localFormat = useCallback(
    (mode: "format" | "minify") => {
      setError("");
      setStatus("");
      try {
        let parsed: unknown = JSON.parse(text);
        if (sortKeys) parsed = sortJsonKeys(parsed);
        const next =
          mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
        setText(next);
        setValid(true);
        setStatus(mode === "minify" ? t("jsonFormat.minified") : t("jsonFormat.formatted"));
      } catch (err) {
        setValid(false);
        const message = err instanceof Error ? err.message : String(err);
        const match = message.match(/position\s+(\d+)/i);
        if (match?.[1]) {
          const { line, column } = positionFromOffset(text, Number(match[1]));
          setError(
            `${message} (${t("jsonFormat.line")} ${line}, ${t("jsonFormat.column")} ${column})`,
          );
        } else setError(message);
      }
    },
    [indent, sortKeys, t, text],
  );

  const serverVerify = async (mode: "format" | "minify" | "validate") => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text, mode, indent, sortKeys } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: { result?: string; engine?: string; charsIn?: number; charsOut?: number };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setValid(false);
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      if (body.output?.result && mode !== "validate") setText(body.output.result);
      else if (body.output?.result && mode === "validate") {
        // keep editor content; only mark valid
      }
      setValid(true);
      setStatus(
        t("jsonFormat.serverOk", {
          engine: body.output?.engine ?? "JSON.parse",
          mode,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          label={t("jsonFormat.indent")}
          id="json-indent"
          value={String(indent)}
          onChange={(v) => setIndent(Number(v))}
          className="w-24"
        >
          {[0, 2, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </RunnerSelect>
        <label className="flex h-9 items-center gap-2 text-sm text-[var(--neutral-11)]">
          <input
            data-allow-native
            type="checkbox"
            checked={sortKeys}
            onChange={(e) => setSortKeys(e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          {t("jsonFormat.sortKeys")}
        </label>
        <Button
          type="button"
          variant="ink"
          onClick={() => localFormat("format")}
          title="⌘/Ctrl + Enter"
        >
          {t("jsonFormat.format")}
        </Button>
        <Button type="button" variant="outline" onClick={() => localFormat("minify")}>
          {t("jsonFormat.minify")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void serverVerify("format")}
        >
          {loading ? t("common.running") : t("jsonFormat.serverVerify")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setText("");
            setError("");
            setStatus("");
            setValid(null);
          }}
        >
          {t("jsonFormat.clear")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText(SAMPLE)}>
          {t("jsonFormat.sample")}
        </Button>
        {valid !== null ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              valid
                ? "bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-[var(--status-success)]"
                : "bg-[color-mix(in_srgb,var(--status-danger)_15%,transparent)] text-[var(--status-danger)]"
            }`}
          >
            {valid ? t("jsonFormat.valid") : t("jsonFormat.invalid")}
          </span>
        ) : null}
      </div>

      <Textarea
        label="JSON"
        id="json-format-input"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            localFormat("format");
          }
        }}
        rows={16}
        spellCheck={false}
        className="min-h-[320px] font-mono text-sm"
        placeholder={t("jsonFormat.placeholder")}
      />

      <p className="text-xs tabular-nums text-[var(--neutral-10)]">
        {t("jsonFormat.stats", { chars: charCount, lines: lineCount })}
        {text.length > LIVE_VALIDATE_MAX ? ` · ${t("jsonFormat.liveOff")}` : ""}
      </p>

      <RunnerError>{error}</RunnerError>
      {status ? <RunnerNote>{status}</RunnerNote> : null}
      <RunnerNote>{t("jsonFormat.note")}</RunnerNote>
    </div>
  );
}
