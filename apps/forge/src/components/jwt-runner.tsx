"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

const SAMPLE =
  "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik5lYnV0cmEiLCJpYXQiOjE1MTYyMzkwMjJ9.";

export function JwtRunner({ toolId }: { toolId: string }) {
  const [token, setToken] = useState(SAMPLE);
  const [header, setHeader] = useState("");
  const [payload, setPayload] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const decode = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { token: token.trim() } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: {
        header?: Record<string, unknown>;
        payload?: Record<string, unknown>;
        note?: string;
        engine?: string;
      };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "decode failed");
      setHeader("");
      setPayload("");
      return;
    }
    setHeader(JSON.stringify(body.output?.header ?? {}, null, 2));
    setPayload(JSON.stringify(body.output?.payload ?? {}, null, 2));
    setNote(`${body.output?.engine ?? "jose"} · 仅解码，不验证签名`);
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="JWT"
        id="jwt-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={5}
        className="font-mono text-xs"
        placeholder="粘贴 JWT"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void decode()}>
          解析 JWT
        </Button>
        <Button type="button" variant="outline" onClick={() => setToken(SAMPLE)}>
          填入示例
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      <RunnerNote>{note}</RunnerNote>
      {(header || payload) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--neutral-10)]">Header</p>
            <RunnerOutput className="text-xs">{header}</RunnerOutput>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--neutral-10)]">Payload</p>
            <RunnerOutput className="text-xs">{payload}</RunnerOutput>
          </div>
        </div>
      )}
      <RunnerNote>引擎：jose · 不验签。生产验签请在服务端用密钥走 jwtVerify。</RunnerNote>
    </div>
  );
}
