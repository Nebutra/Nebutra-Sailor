"use client";

import { useState } from "react";

export function TextDiffRunner({ toolId }: { toolId: string }) {
  const [left, setLeft] = useState("alpha\nbeta\ngamma");
  const [right, setRight] = useState("alpha\nBETA\ngamma");
  const [patch, setPatch] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { left, right, context: 3 } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: { patch?: string; addedLines?: number; removedLines?: number; engine?: string };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      setPatch(body.output?.patch ?? "");
      setMeta(
        `+${body.output?.addedLines ?? 0} / -${body.output?.removedLines ?? 0} · ${body.output?.engine ?? "diff"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          左侧
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            rows={12}
            className="mt-1 w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-3 font-mono text-sm"
          />
        </label>
        <label className="block text-sm">
          右侧
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            rows={12}
            className="mt-1 w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-3 font-mono text-sm"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "对比中…" : "对比（jsdiff）"}
      </button>
      {meta ? <p className="text-sm text-[var(--neutral-11)]">{meta}</p> : null}
      {error ? (
        <pre className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </pre>
      ) : null}
      {patch ? (
        <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3 font-mono text-xs">
          {patch}
        </pre>
      ) : null}
    </div>
  );
}
