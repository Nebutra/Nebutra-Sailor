"use client";

import { useCallback, useState } from "react";

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
  const [text, setText] = useState(SAMPLE);
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const localFormat = useCallback(
    (mode: "format" | "minify") => {
      setError("");
      setStatus("");
      try {
        const parsed: unknown = JSON.parse(text);
        const next =
          mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
        setText(next);
        setStatus(mode === "minify" ? "已压缩" : "已格式化");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const match = message.match(/position\s+(\d+)/i);
        if (match?.[1]) {
          const { line, column } = positionFromOffset(text, Number(match[1]));
          setError(`${message} (line ${line}, column ${column})`);
        } else setError(message);
      }
    },
    [indent, text],
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
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      if (body.output?.result) setText(body.output.result);
      setStatus(`服务端 ${mode} · ${body.output?.engine ?? "JSON.parse"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          缩进
          <select
            data-allow-native
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            {[0, 2, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => localFormat("format")}
          className="forge-btn forge-btn-primary"
        >
          格式化
        </button>
        <button
          type="button"
          onClick={() => localFormat("minify")}
          className="forge-btn forge-btn-secondary"
        >
          压缩
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void serverVerify("format")}
          className="forge-btn forge-btn-secondary"
        >
          服务端校验
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(text)}
          className="forge-btn forge-btn-ghost"
        >
          复制
        </button>
        <button
          type="button"
          onClick={() => {
            setText("");
            setError("");
            setStatus("");
          }}
          className="forge-btn forge-btn-ghost"
        >
          清空
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        spellCheck={false}
        className="forge-input forge-input-mono min-h-[320px] resize-y"
        placeholder="粘贴 JSON…"
      />

      {error ? (
        <pre className="overflow-x-auto rounded-xl border border-[color-mix(in_srgb,hsl(var(--destructive))_35%,transparent)] bg-[color-mix(in_srgb,hsl(var(--destructive))_8%,transparent)] p-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </pre>
      ) : null}
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      <p className="text-xs text-muted-foreground">
        引擎：ECMAScript JSON.parse / stringify · 本地即时 · Agent 同路径
      </p>
    </div>
  );
}
