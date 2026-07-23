"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerPanel } from "@/components/runner-ui";

/**
 * Tokenizer presets — labels map encodings to current models.dev families,
 * not retired product lines (no GPT-3.5 / early GPT-4 as primary association).
 * Default = o200k (GPT-5 / o-series / 4o-class tokenizer).
 * @see https://models.dev
 */
const ENCODINGS = [
  {
    id: "o200k_base",
    label: "o200k · GPT-5 / o-series",
    hint: "OpenAI current chat & reasoning tokenizers",
  },
  {
    id: "cl100k_base",
    label: "cl100k · older OpenAI chat",
    hint: "Pre-o200k OpenAI chat tokenizer (historical)",
  },
  {
    id: "p50k_base",
    label: "p50k · Codex / edit",
    hint: "Legacy code / edit models",
  },
  {
    id: "r50k_base",
    label: "r50k · early GPT-3",
    hint: "Early completion models",
  },
] as const;

export function TokenCountRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("Hello Nebutra, count my tokens. 你好，数一下 token。");
  const [encoding, setEncoding] = useState<(typeof ENCODINGS)[number]["id"]>("o200k_base");
  const [tokens, setTokens] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const count = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text, encoding } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: { tokens?: number; encoding?: string; engine?: string };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? "count failed");
        setTokens(null);
        return;
      }
      setTokens(body.output?.tokens ?? null);
      setNote(`${body.output?.engine ?? "js-tiktoken"} · ${body.output?.encoding ?? encoding}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ENCODINGS.map((e) => (
          <Button
            key={e.id}
            type="button"
            size="sm"
            variant={encoding === e.id ? "ink" : "outline"}
            onClick={() => setEncoding(e.id)}
            title={e.hint}
          >
            {e.label}
          </Button>
        ))}
      </div>
      <Textarea
        label="文本"
        id="token-count-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ink" onClick={() => void count()} disabled={loading}>
          {loading ? "计数中…" : "精确计数"}
        </Button>
        <span className="text-sm text-[var(--neutral-11)]">字符 {text.length}</span>
      </div>
      <RunnerError>{error}</RunnerError>
      {tokens !== null ? (
        <RunnerPanel>
          <p className="text-3xl font-bold tabular-nums">{tokens}</p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">tokens</p>
          <RunnerNote>{note}</RunnerNote>
        </RunnerPanel>
      ) : null}
      <RunnerNote>引擎：js-tiktoken · 服务端精确计数 · 可对接 Router 费用估算</RunnerNote>
    </div>
  );
}
