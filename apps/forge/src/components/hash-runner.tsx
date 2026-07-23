"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";
import { useMemo, useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

async function digestHex(algorithm: "SHA-1" | "SHA-256" | "MD5", text: string): Promise<string> {
  if (algorithm === "MD5") {
    throw new Error("MD5 仅支持服务端路径（Web Crypto 无 MD5）");
  }
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function HashRunner({
  toolId,
  algorithm,
}: {
  toolId: string;
  algorithm: "md5" | "sha1" | "sha256";
}) {
  const [text, setText] = useState("Hello Nebutra");
  const [hex, setHex] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const webAlgo = useMemo(() => {
    if (algorithm === "sha1") return "SHA-1" as const;
    if (algorithm === "sha256") return "SHA-256" as const;
    return null;
  }, [algorithm]);

  const runLocal = async () => {
    setError("");
    try {
      if (!webAlgo) {
        setError("MD5 请点「服务端运行」（兼容校验用途，勿作密码存储）");
        return;
      }
      setHex(await digestHex(webAlgo, text));
      setNote(`本地 Web Crypto · ${webAlgo}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runServer = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { text } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { hex?: string };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    setHex(body.output?.hex ?? "");
    setNote("服务端 node:crypto · 与 API 同一路径");
  };

  return (
    <div className="space-y-4">
      <RunnerNote>
        算法：{algorithm.toUpperCase()}
        {algorithm === "md5" ? " · 仅校验/兼容，勿作密码存储" : null}
      </RunnerNote>
      <Textarea
        label="输入"
        id={`hash-${algorithm}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void runLocal()}>
          本地运行
        </Button>
        <Button type="button" variant="outline" onClick={() => void runServer()}>
          服务端运行
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(hex)}
          disabled={!hex}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="break-all">{hex}</RunnerOutput>
      <RunnerNote>{note}</RunnerNote>
    </div>
  );
}
