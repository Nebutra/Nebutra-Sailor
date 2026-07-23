"use client";

import { useCallback, useState } from "react";

export function ToolRunner({
  toolId,
  slug,
  defaultJson,
}: {
  toolId: string;
  slug: string;
  defaultJson: string;
}) {
  const [input, setInput] = useState(defaultJson);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    setOutput("");
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(input) as unknown;
      } catch {
        // Convenience: bare string tools accept raw text as { text }
        parsed = { text: input };
      }

      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsed }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: unknown;
        message?: string;
        error?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? body.error ?? `HTTP ${res.status}`);
        return;
      }
      setOutput(JSON.stringify(body.output ?? body, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [input, toolId]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`input-${slug}`} className="mb-1 block text-sm font-medium">
          输入（JSON 或纯文本）
        </label>
        <textarea
          id={`input-${slug}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-3 font-mono text-sm outline-none focus:border-[hsl(var(--ring))]"
          spellCheck={false}
        />
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "运行中…" : "运行"}
      </button>
      {error ? (
        <pre className="overflow-x-auto rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </pre>
      ) : null}
      {output ? (
        <div>
          <p className="mb-1 text-sm font-medium">输出</p>
          <pre className="overflow-x-auto rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-2)] p-3 font-mono text-sm">
            {output}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
