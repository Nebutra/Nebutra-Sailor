"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";
import { useMemo, useState } from "react";

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
    setNote("服务端 node:crypto（Agent 同契约）");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        算法：{algorithm.toUpperCase()}
        {algorithm === "md5" ? " · 仅校验/兼容，勿用于密码存储" : null}
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono text-sm"
        aria-label="哈希输入"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void runLocal()}>
          本地运行
        </Button>
        <Button type="button" variant="outline" onClick={() => void runServer()}>
          服务端运行
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(hex)}
          disabled={!hex}
        >
          复制
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {hex ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-sm break-all">
          {hex}
        </pre>
      ) : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
