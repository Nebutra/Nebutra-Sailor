"use client";

import { brand } from "@nebutra/brand/metadata";
import { Check, Copy } from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput, RunnerSelect } from "@/components/runner-ui";

export type ModeOption = { value: string; label: string };

export type TextTransformRunnerProps = {
  toolId: string;
  /** Placeholder / default input */
  sample?: string;
  modes?: readonly ModeOption[];
  defaultMode?: string;
  /** Field name for mode in invoke payload (default "mode") */
  modeField?: string;
  /** Extra string fields (e.g. interface name for json-to-ts) */
  extraFields?: readonly {
    key: string;
    label: string;
    defaultValue: string;
    placeholder?: string;
  }[];
  /** Map API output → display string */
  pickOutput: (output: Record<string, unknown>) => string;
  note?: string;
  rows?: number;
  /** Optional local transform for instant run without round-trip */
  localRun?: (text: string, mode: string | undefined, extras: Record<string, string>) => string;
};

/**
 * Shared text-in → text-out runner for pure catalog tools
 * (sort lines, case convert, camel/snake, extractors, …).
 * P1 baseline: dual-pane, live local when available, i18n labels, honest empty.
 */
export function TextTransformRunner({
  toolId,
  sample = `Hello ${brand.name} 你好世界`,
  modes,
  defaultMode,
  modeField = "mode",
  extraFields,
  pickOutput,
  note,
  rows = 10,
  localRun,
}: TextTransformRunnerProps) {
  const t = useTranslations("runners");
  const [text, setText] = useState(sample);
  const [mode, setMode] = useState(defaultMode ?? modes?.[0]?.value ?? "");
  const [extras, setExtras] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of extraFields ?? []) init[f.key] = f.defaultValue;
    return init;
  });
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /* P1 baseline: live local */
  useEffect(() => {
    if (!localRun) return;
    const handle = window.setTimeout(() => {
      try {
        setError("");
        setResult(localRun(text, modes?.length ? mode : undefined, extras));
        setStatus(t("textTransform.statusLocalLive"));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 160);
    return () => window.clearTimeout(handle);
  }, [text, mode, extras, localRun, modes, t]);

  const buildInput = useCallback(() => {
    const input: Record<string, unknown> = { text };
    if (modes?.length) input[modeField] = mode;
    for (const f of extraFields ?? []) {
      input[f.key] = extras[f.key] ?? f.defaultValue;
    }
    return input;
  }, [text, mode, modes, modeField, extraFields, extras]);

  const runLocal = () => {
    if (!localRun) return;
    setError("");
    try {
      setResult(localRun(text, modes?.length ? mode : undefined, extras));
      setStatus(t("textTransform.statusLocal"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runServer = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildInput() }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: Record<string, unknown>;
        message?: string;
        error?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(pickOutput(body.output ?? {}));
      setStatus(t("textTransform.statusServer"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const footerNote = note ?? t("textTransform.noteDefault");

  return (
    <div className="space-y-5">
      {(modes?.length || (extraFields && extraFields.length > 0)) && (
        <div className="flex flex-wrap items-end gap-3">
          {modes?.length ? (
            <RunnerSelect
              label={t("textTransform.mode")}
              id={`${toolId}-mode`}
              value={mode}
              onChange={setMode}
            >
              {modes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </RunnerSelect>
          ) : null}
          {extraFields?.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              id={`${toolId}-${f.key}`}
              value={extras[f.key] ?? f.defaultValue}
              onChange={(e) => setExtras((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-40 font-mono"
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          label={t("textTransform.input")}
          id={`${toolId}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={rows}
          className="min-h-[220px] font-mono text-sm"
          spellCheck={false}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-11)]">
              {t("textTransform.output")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copy()}
              disabled={!result}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> {t("common.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> {t("common.copy")}
                </>
              )}
            </Button>
          </div>
          <RunnerOutput className="min-h-[220px] whitespace-pre-wrap break-all">
            {result || (
              <span className="text-[var(--neutral-9)]">{t("textTransform.emptyResult")}</span>
            )}
          </RunnerOutput>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {localRun ? (
          <Button type="button" variant="ink" onClick={runLocal}>
            {t("textTransform.runLocal")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={localRun ? "outline" : "ink"}
          onClick={() => void runServer()}
          disabled={loading}
        >
          {loading
            ? t("common.running")
            : localRun
              ? t("textTransform.runServer")
              : t("common.run")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setText("");
            setResult("");
            setError("");
            setStatus("");
          }}
        >
          {t("common.clear")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{status || footerNote}</RunnerNote>
    </div>
  );
}

/** Pick common output shapes from pure tools. */
export function pickResult(output: Record<string, unknown>): string {
  if (typeof output.result === "string") return output.result;
  if (Array.isArray(output.urls)) return (output.urls as string[]).join("\n");
  if (Array.isArray(output.emails)) return (output.emails as string[]).join("\n");
  if (typeof output.encode === "string") {
    const lines = [`encode: ${output.encode}`];
    if (output.decode != null) lines.push(`decode: ${String(output.decode)}`);
    return lines.join("\n");
  }
  return JSON.stringify(output, null, 2);
}
