"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { RunnerError, RunnerNote, RunnerSelect } from "@/components/runner-ui";

const SAMPLE = `{
  "name": "Nebutra Forge",
  "features": ["format", "minify", "validate"],
  "ok": true
}`;

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

export function JsonFormatRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [text, setText] = useState(SAMPLE);
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const localFormat = useCallback(
    (mode: "format" | "minify") => {
      setError("");
      setStatus("");
      try {
        const parsed: unknown = JSON.parse(text);
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
    [indent, t, text],
  );

  const serverVerify = async (mode: "format" | "minify") => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text, mode, indent } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: { result?: string; engine?: string };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setValid(false);
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      if (body.output?.result) setText(body.output.result);
      setValid(true);
      setStatus(t("jsonFormat.serverOk", { engine: body.output?.engine ?? "JSON.parse", mode }));
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
        <Button type="button" variant="ink" onClick={() => localFormat("format")}>
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
          setValid(null);
        }}
        rows={16}
        spellCheck={false}
        className="min-h-[320px] font-mono text-sm"
        placeholder={t("jsonFormat.placeholder")}
      />

      <RunnerError>{error}</RunnerError>
      {status ? <RunnerNote>{status}</RunnerNote> : null}
      <RunnerNote>{t("jsonFormat.note")}</RunnerNote>
    </div>
  );
}
