"use client";

import { Card } from "@nebutra/ui/layout";
import { Button, Input, Textarea } from "@nebutra/ui/primitives";
import { useEffect, useMemo, useState } from "react";

export function PlaygroundClient({ models }: { models: readonly string[] }) {
  const options = useMemo(() => (models.length > 0 ? models : ["gpt-4o-mini"]), [models]);
  const [model, setModel] = useState(options[0] ?? "gpt-4o-mini");
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

  return (
    <Card className="space-y-4 border-border/80 p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="text-xs font-medium text-muted-foreground">模型</span>
          <select
            data-allow-native
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 font-mono text-sm"
          >
            {options.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1.5">
          <Input
            label="API Key（可选）"
            id="router-api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
            placeholder="sk-sailor-…（转发真实网关时需要）"
          />
        </div>
      </div>
      <Textarea
        label="Prompt"
        id="router-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        className="min-h-[140px]"
      />
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "请求中…" : "发送"}
      </Button>
      {mode ? (
        <p className="text-xs text-muted-foreground">
          mode: <code className="font-mono">{mode}</code>
          {mode === "demo" ? " · 未配置上游时本地模拟" : null}
        </p>
      ) : null}
      {out ? (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-[var(--radius-lg)] border border-border bg-muted/40 p-4 text-sm leading-relaxed">
          {out}
        </pre>
      ) : null}
    </Card>
  );
}
