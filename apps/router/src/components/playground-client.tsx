"use client";

import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useEffect, useMemo, useState } from "react";

/**
 * 使用界面对话台 — 管理后台不嵌此页主路径。
 * variant=usage: 更高视口占比，像「回家开吃」而不是后台表单。
 */
export function PlaygroundClient({
  models,
  variant = "usage",
}: {
  models: readonly string[];
  variant?: "usage" | "embedded";
}) {
  const options = useMemo(() => (models.length > 0 ? models : [DEFAULT_PUBLIC_MODEL]), [models]);
  const [model, setModel] = useState(options[0] ?? DEFAULT_PUBLIC_MODEL);
  const [prompt, setPrompt] = useState("用一句话介绍 Nebutra Router");
  const [apiKey, setApiKey] = useState("");
  const [out, setOut] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("model");
    if (q && options.includes(q)) setModel(q);
  }, [options]);

  const run = async () => {
    setLoading(true);
    setOut("");
    setMode("");
    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, apiKey }),
      });
      const data = (await res.json()) as {
        content?: string;
        error?: string;
        mode?: string;
      };
      if (data.error) {
        setOut(data.error);
        return;
      }
      setMode(data.mode ?? "ok");
      setOut(data.content ?? "");
    } finally {
      setLoading(false);
    }
  };

  const tall = variant === "usage";

  return (
    <div
      className={
        tall
          ? "grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      }
    >
      <div className="flex min-h-0 flex-col space-y-3 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] p-3 md:p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1 text-[12px]">
            <span className="text-[11px] font-medium text-[var(--neutral-10)]">模型</span>
            <select
              data-allow-native
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-2 font-mono text-[12px]"
            >
              {options.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="API Key（可选）"
            id="router-api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono text-[12px]"
            placeholder="sk-sailor-… 转发真实网关时填写"
          />
        </div>
        <Textarea
          label="消息"
          id="router-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={tall ? 12 : 8}
          className={
            tall
              ? "min-h-[200px] flex-1 font-mono text-[13px]"
              : "min-h-[160px] font-mono text-[12px]"
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ink"
            size="sm"
            className="h-9 px-4"
            disabled={loading}
            onClick={() => void run()}
          >
            {loading ? "请求中…" : "发送"}
          </Button>
          {mode ? (
            <span className="font-mono text-[11px] text-[var(--neutral-10)]">
              mode={mode}
              {mode === "demo" ? " · 本地模拟（未配上游）" : ""}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-[240px] flex-col rounded-[var(--radius-lg)] border border-[var(--neutral-6)] lg:min-h-0">
        <div className="flex items-center justify-between border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/50 px-3 py-2">
          <span className="text-[12px] font-semibold">回复</span>
          <span className="font-mono text-[10px] text-[var(--neutral-10)]">{model}</span>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-[var(--neutral-12)]">
          {out || (
            <span className="text-[var(--neutral-9)]">发送消息后，模型回复会显示在这里。</span>
          )}
        </pre>
      </div>
    </div>
  );
}
