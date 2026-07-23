"use client";

import { useState } from "react";

const PRESETS = [
  { label: "10→16", from: 10, to: 16 },
  { label: "16→10", from: 16, to: 10 },
  { label: "10→2", from: 10, to: 2 },
  { label: "2→10", from: 2, to: 10 },
] as const;

export function NumberBaseRunner({ toolId }: { toolId: string }) {
  const [value, setValue] = useState("255");
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(16);
  const [result, setResult] = useState("ff");
  const [decimal, setDecimal] = useState("255");
  const [error, setError] = useState("");

  const convert = async (next?: { value?: string; fromBase?: number; toBase?: number }) => {
    const v = next?.value ?? value;
    const from = next?.fromBase ?? fromBase;
    const to = next?.toBase ?? toBase;
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { value: v, fromBase: from, toBase: to } }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      output?: { result?: string; decimal?: string };
      message?: string;
    };
    if (!res.ok || body.ok === false) {
      setError(body.message ?? "error");
      return;
    }
    setResult(body.output?.result ?? "");
    setDecimal(body.output?.decimal ?? "");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setFromBase(p.from);
              setToBase(p.to);
              void convert({ fromBase: p.from, toBase: p.to });
            }}
            className="rounded-lg border border-[var(--neutral-7)] px-3 py-1.5 text-sm"
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        data-allow-native
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          void convert({ value: e.target.value });
        }}
        className="w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-3 font-mono text-sm"
        placeholder="数值"
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          从进制
          <input
            data-allow-native
            type="number"
            min={2}
            max={36}
            value={fromBase}
            onChange={(e) => {
              const n = Number(e.target.value);
              setFromBase(n);
              void convert({ fromBase: n });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-2 font-mono"
          />
        </label>
        <label className="text-sm">
          到进制
          <input
            data-allow-native
            type="number"
            min={2}
            max={36}
            value={toBase}
            onChange={(e) => {
              const n = Number(e.target.value);
              setToBase(n);
              void convert({ toBase: n });
            }}
            className="mt-1 w-full rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-2 font-mono"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-[var(--status-danger)]">{error}</p> : null}
      {result ? (
        <div className="space-y-2 rounded-lg border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4">
          <p className="font-mono text-xl break-all">{result}</p>
          <p className="text-xs text-[var(--neutral-10)]">十进制：{decimal}</p>
        </div>
      ) : null}
      <p className="text-xs text-[var(--neutral-10)]">
        引擎：ECMAScript parseInt / Number.toString · 2–36 进制 · Agent 同契约
      </p>
    </div>
  );
}
