"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useCallback, useState } from "react";
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
 */
export function TextTransformRunner({
  toolId,
  sample = "Hello Nebutra 你好世界",
  modes,
  defaultMode,
  modeField = "mode",
  extraFields,
  pickOutput,
  note = "与 API 同一 invoke 路径",
  rows = 10,
  localRun,
}: TextTransformRunnerProps) {
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
      setStatus("本地运行");
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
      setStatus("服务端 · 与 API 同一路径");
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

  return (
    <div className="space-y-5">
      {(modes?.length || (extraFields && extraFields.length > 0)) && (
        <div className="flex flex-wrap items-end gap-3">
          {modes?.length ? (
            <RunnerSelect label="模式" id={`${toolId}-mode`} value={mode} onChange={setMode}>
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
          label="输入"
          id={`${toolId}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={rows}
          className="min-h-[220px] font-mono text-sm"
          spellCheck={false}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--neutral-11)]">输出</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copy()}
              disabled={!result}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> 已复制
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> 复制
                </>
              )}
            </Button>
          </div>
          <RunnerOutput className="min-h-[220px] whitespace-pre-wrap break-all">
            {result || <span className="text-[var(--neutral-9)]">结果会显示在这里</span>}
          </RunnerOutput>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {localRun ? (
          <Button type="button" variant="ink" onClick={runLocal}>
            本地运行
          </Button>
        ) : null}
        <Button
          type="button"
          variant={localRun ? "outline" : "ink"}
          onClick={() => void runServer()}
          disabled={loading}
        >
          {loading ? "运行中…" : localRun ? "服务端校验" : "运行"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText("")}>
          清空
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{status || note}</RunnerNote>
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
