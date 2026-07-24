"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button, Tabs, TabsList, TabsTrigger, Textarea } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function Base64Runner({ toolId }: { toolId: string }) {
  const [text, setText] = useState("Hello Nebutra 你好");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const runLocal = () => {
    setError("");
    try {
      setResult(mode === "encode" ? utf8ToBase64(text) : base64ToUtf8(text));
      setNote("本地 Web API（TextEncoder / atob）");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runServer = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { text, mode } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { result?: string };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    setResult(body.output?.result ?? "");
    setNote("服务端 Buffer · 与 API 同一路径");
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "encode" | "decode")}
          variant="button"
          shape="pill"
        >
          <TabsList>
            <TabsTrigger value="encode">编码</TabsTrigger>
            <TabsTrigger value="decode">解码</TabsTrigger>
          </TabsList>
        </Tabs>
        <RunnerNote>{mode === "encode" ? "文本 → Base64" : "Base64 → 文本"}</RunnerNote>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          label="输入"
          id="base64-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="min-h-[220px] font-mono text-sm"
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
        <Button type="button" variant="ink" onClick={runLocal}>
          本地运行
        </Button>
        <Button type="button" variant="outline" onClick={() => void runServer()}>
          服务端校验
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{note}</RunnerNote>
    </div>
  );
}
