"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";
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
      <div className="flex flex-wrap items-end gap-2">
        <RunnerSelect
          label="缩进"
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
          格式化
        </Button>
        <Button type="button" variant="outline" onClick={() => localFormat("minify")}>
          压缩
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void serverVerify("format")}
        >
          服务端校验
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(text)}
        >
          复制
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setText("");
            setError("");
            setStatus("");
          }}
        >
          清空
        </Button>
      </div>

      <Textarea
        label="JSON"
        id="json-format-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        spellCheck={false}
        className="min-h-[320px] font-mono text-sm"
        placeholder="粘贴 JSON…"
      />

      <RunnerError>{error}</RunnerError>
      <RunnerNote>{status}</RunnerNote>
      <RunnerNote>引擎：ECMAScript JSON.parse / stringify · 本地即时 · 与 API 同一路径</RunnerNote>
    </div>
  );
}
