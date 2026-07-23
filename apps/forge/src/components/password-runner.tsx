"use client";

import { useState } from "react";

export function PasswordRunner({ toolId }: { toolId: string }) {
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const generate = async () => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { length, uppercase, lowercase, digits, symbols },
      }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { password?: string };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    const next = body.output?.password ?? "";
    setPassword(next);
    if (next) setHistory((h) => [next, ...h].slice(0, 5));
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        长度：{length}
        <input
          data-allow-native
          type="range"
          min={4}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ["大写", uppercase, setUppercase],
            ["小写", lowercase, setLowercase],
            ["数字", digits, setDigits],
            ["符号", symbols, setSymbols],
          ] as const
        ).map(([label, checked, set]) => (
          <label key={label} className="inline-flex items-center gap-2">
            <input
              data-allow-native
              type="checkbox"
              checked={checked}
              onChange={(e) => set(e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void generate()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          生成密码
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(password)}
          className="rounded-lg border border-border px-4 py-2 text-sm"
          disabled={!password}
        >
          复制
        </button>
      </div>
      {error ? <p className="text-sm text-[hsl(var(--destructive))]">{error}</p> : null}
      {password ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-lg tracking-wide">
          {password}
        </pre>
      ) : null}
      <p className="text-xs text-muted-foreground">
        引擎：node:crypto randomInt · 密码学安全随机 · Agent 同 invoke 契约
      </p>
      {history.length > 1 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">最近生成</p>
          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
            {history.slice(1).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
