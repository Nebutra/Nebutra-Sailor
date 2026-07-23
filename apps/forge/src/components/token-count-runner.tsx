"use client";

import { useState } from "react";

const ENCODINGS = [
  { id: "cl100k_base", label: "cl100k (GPT-4 / 3.5)" },
  { id: "o200k_base", label: "o200k (GPT-4o)" },
  { id: "p50k_base", label: "p50k" },
  { id: "r50k_base", label: "r50k" },
] as const;

export function TokenCountRunner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("Hello Nebutra, count my tokens. 你好，数一下 token。");
  const [encoding, setEncoding] = useState<(typeof ENCODINGS)[number]["id"]>("cl100k_base");
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
          <button
            key={e.id}
            type="button"
            onClick={() => setEncoding(e.id)}
            className={
              encoding === e.id
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "rounded-lg border border-border px-3 py-1.5 text-sm"
            }
          >
            {e.label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full rounded-lg border border-border bg-background p-3 font-mono text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void count()}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "计数中…" : "精确计数"}
        </button>
        <span className="text-sm text-muted-foreground">字符 {text.length}</span>
      </div>
      {error ? <p className="text-sm text-[hsl(var(--destructive))]">{error}</p> : null}
      {tokens !== null ? (
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-3xl font-bold tabular-nums">{tokens}</p>
          <p className="mt-1 text-sm text-muted-foreground">tokens</p>
          {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        引擎：js-tiktoken（OpenAI 兼容编码）· 服务端精确计数 · 可对接 Router 费用估算
      </p>
    </div>
  );
}
