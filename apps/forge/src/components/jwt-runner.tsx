"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";

import { useState } from "react";

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
    setNote(`${body.output?.engine ?? "jose"} · ${body.output?.note ?? "decode only"}`);
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs"
        placeholder="paste JWT"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void decode()}>
          解析 JWT
        </Button>
        <Button type="button" variant="outline" onClick={() => setToken(SAMPLE)}>
          填入示例
        </Button>
      </div>
      {error ? <p className="text-sm text-[hsl(var(--destructive))]">{error}</p> : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {(header || payload) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Header</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs">
              {header}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Payload</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs">
              {payload}
            </pre>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        引擎：jose decodeProtectedHeader + decodeJwt · <strong>不验签</strong>·
        验签请在服务端用密钥走 jwtVerify
      </p>
    </div>
  );
}
