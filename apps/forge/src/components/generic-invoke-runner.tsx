"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput, RunnerSelect } from "@/components/runner-ui";

export type FieldDef =
  | {
      key: string;
      label: string;
      kind: "text" | "textarea" | "number" | "password";
      defaultValue?: string;
      placeholder?: string;
      rows?: number;
    }
  | {
      key: string;
      label: string;
      kind: "select";
      options: readonly { value: string; label: string }[];
      defaultValue?: string;
    }
  | {
      key: string;
      label: string;
      kind: "boolean";
      defaultValue?: boolean;
    }
  | {
      key: string;
      label: string;
      kind: "file-base64";
      accept?: string;
    };

export interface GenericInvokeRunnerProps {
  toolId: string;
  fields: readonly FieldDef[];
  note?: string;
  /** Map server output to display string */
  formatOutput?: (output: Record<string, unknown>) => string;
}

async function invokeTool(
  toolId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; message: string }> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, output: body.output ?? {} };
}

function defaultFormat(output: Record<string, unknown>): string {
  if (typeof output.result === "string") return output.result;
  if (typeof output.html === "string") return output.html;
  if (typeof output.data === "string") return output.data;
  if (typeof output.digest === "string") return output.digest;
  if (typeof output.hex === "string") return output.hex;
  if (Array.isArray(output.ids)) return (output.ids as string[]).join("\n");
  if (Array.isArray(output.matches)) {
    return (output.matches as Array<{ match: string }>)
      .map((m, i) => `${i + 1}. ${m.match}`)
      .join("\n");
  }
  return JSON.stringify(output, null, 2);
}

/**
 * Configurable multi-field invoke runner for catalog density tools.
 */
export function GenericInvokeRunner({
  toolId,
  fields,
  note,
  formatOutput = defaultFormat,
}: GenericInvokeRunnerProps) {
  const t = useTranslations("runners.common");
  const resolvedNote = note ?? t("sameAsApi");
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    for (const f of fields) {
      if (f.kind === "boolean") init[f.key] = f.defaultValue ?? false;
      else if (f.kind === "file-base64") init[f.key] = "";
      else if (f.kind === "select") init[f.key] = f.defaultValue ?? f.options[0]?.value ?? "";
      else init[f.key] = f.defaultValue ?? "";
    }
    return init;
  });
  const [result, setResult] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const setField = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const onFile = async (key: string, file: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${b64}`;
    setField(key, dataUrl);
  };

  const run = async () => {
    setLoading(true);
    setError("");
    setPreviewUrl("");
    const input: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.key];
      if (f.kind === "number") {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          setError(t("mustBeNumber", { label: f.label }));
          setLoading(false);
          return;
        }
        input[f.key] = n;
      } else if (f.kind === "boolean") {
        input[f.key] = Boolean(raw);
      } else {
        input[f.key] = raw;
      }
    }
    const r = await invokeTool(toolId, input);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    const out = r.output;
    if (typeof out.base64 === "string" && typeof out.contentType === "string") {
      setPreviewUrl(`data:${out.contentType};base64,${out.base64}`);
    } else if (typeof out.data === "string" && String(out.data).startsWith("data:")) {
      setPreviewUrl(String(out.data));
    } else if (typeof out.data === "string" && out.format === "svg") {
      setPreviewUrl(`data:image/svg+xml;utf8,${encodeURIComponent(String(out.data))}`);
    }
    setResult(formatOutput(out));
  };

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        if (f.kind === "select") {
          return (
            <RunnerSelect
              key={f.key}
              id={`field-${f.key}`}
              label={f.label}
              value={String(values[f.key] ?? "")}
              onChange={(v) => setField(f.key, v)}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </RunnerSelect>
          );
        }
        if (f.kind === "boolean") {
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                data-allow-native
                type="checkbox"
                checked={Boolean(values[f.key])}
                onChange={(e) => setField(f.key, e.target.checked)}
              />
              {f.label}
            </label>
          );
        }
        if (f.kind === "file-base64") {
          return (
            <div key={f.key} className="space-y-1">
              <p className="text-sm font-medium text-[var(--neutral-12)]">{f.label}</p>
              <input
                data-allow-native
                type="file"
                accept={f.accept ?? "*/*"}
                className="block w-full text-sm"
                onChange={(e) => void onFile(f.key, e.target.files?.[0] ?? null)}
              />
              {values[f.key] ? (
                <p className="text-xs text-[var(--neutral-11)]">{t("base64Loaded")}</p>
              ) : null}
            </div>
          );
        }
        if (f.kind === "textarea") {
          return (
            <Textarea
              key={f.key}
              label={f.label}
              id={`field-${f.key}`}
              value={String(values[f.key] ?? "")}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={f.rows ?? 8}
              className="font-mono text-sm"
            />
          );
        }
        return (
          <Input
            key={f.key}
            label={f.label}
            id={`field-${f.key}`}
            type={f.kind === "password" ? "password" : f.kind === "number" ? "number" : "text"}
            value={String(values[f.key] ?? "")}
            onChange={(e) => setField(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="font-mono tabular-nums"
          />
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? t("running") : t("run")}
        </Button>
        {result ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(result);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("copied") : t("copy")}
          </Button>
        ) : null}
      </div>
      <RunnerError>{error}</RunnerError>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={t("outputPreview")}
          className="max-h-64 rounded border border-[var(--neutral-6)]"
        />
      ) : null}
      {result ? <RunnerOutput>{result}</RunnerOutput> : null}
      <RunnerNote>{resolvedNote}</RunnerNote>
    </div>
  );
}
