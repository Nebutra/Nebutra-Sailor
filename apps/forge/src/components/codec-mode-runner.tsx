"use client";

import { brand } from "@nebutra/brand/metadata";
import { Check, Copy } from "@nebutra/icons";
import { Button, Tabs, TabsList, TabsTrigger, Textarea } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

type CodecKind = "url" | "html" | "hex";

function runLocal(kind: CodecKind, text: string, mode: "encode" | "decode"): string {
  if (kind === "url") {
    return mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text);
  }
  if (kind === "html") {
    if (mode === "encode") {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
    return text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }
  // hex — browser TextEncoder / Uint8Array
  if (mode === "encode") {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  const clean = text.replace(/\s/g, "");
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("不是合法的十六进制字符串");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

const SAMPLES: Record<CodecKind, string> = {
  url: `https://${brand.domains.landing}/path?q=你好`,
  html: `<p class="x">Hello & "${brand.name}"</p>`,
  hex: "Hello ${brand.name} 你好",
};

const NOTES: Record<CodecKind, string> = {
  url: "encodeURIComponent / decodeURIComponent · 与 API 同一路径",
  html: "HTML 实体映射 · 与 API 同一路径",
  hex: "UTF-8 ↔ hex · 与 API 同一路径",
};

/**
 * Encode/decode workspace for url / html-entities / hex.
 * Replaces incorrect Base64Runner reuse for url & html.
 */
export function CodecModeRunner({ toolId, kind }: { toolId: string; kind: CodecKind }) {
  const [text, setText] = useState(SAMPLES[kind]);
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const local = () => {
    setError("");
    try {
      setResult(runLocal(kind, text, mode));
      setNote("本地运行");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const server = async () => {
    setError("");
    // hex API returns { encode, decode } without mode — adapt
    const input = kind === "hex" ? { text: mode === "encode" ? text : text } : { text, mode };

    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: {
        result?: string;
        encode?: string;
        decode?: string | null;
      };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    if (kind === "hex") {
      if (mode === "encode") {
        setResult(body.output?.encode ?? "");
      } else {
        const d = body.output?.decode;
        if (d == null) {
          setError("服务端无法将输入解码为 UTF-8（需合法 hex）");
          return;
        }
        setResult(d);
      }
    } else {
      setResult(body.output?.result ?? "");
    }
    setNote("服务端 · 与 API 同一路径");
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
        <RunnerNote>{mode === "encode" ? "文本 → 编码" : "编码 → 文本"}</RunnerNote>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          label="输入"
          id={`${kind}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="min-h-[220px] font-mono text-sm"
          spellCheck={false}
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
        <Button type="button" variant="ink" onClick={local}>
          本地运行
        </Button>
        <Button type="button" variant="outline" onClick={() => void server()}>
          服务端校验
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{note || NOTES[kind]}</RunnerNote>
    </div>
  );
}
