"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerPanel } from "@/components/runner-ui";

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
      body: JSON.stringify({
        input: { value: v, fromBase: from, toBase: to },
      }),
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
          <Button
            key={p.label}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setFromBase(p.from);
              setToBase(p.to);
              void convert({ fromBase: p.from, toBase: p.to });
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <Input
        label="数值"
        id="number-base-value"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          void convert({ value: e.target.value });
        }}
        className="font-mono"
        placeholder="数值"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="从进制"
          id="number-base-from"
          type="number"
          min={2}
          max={36}
          value={fromBase}
          onChange={(e) => {
            const n = Number(e.target.value);
            setFromBase(n);
            void convert({ fromBase: n });
          }}
          className="font-mono"
        />
        <Input
          label="到进制"
          id="number-base-to"
          type="number"
          min={2}
          max={36}
          value={toBase}
          onChange={(e) => {
            const n = Number(e.target.value);
            setToBase(n);
            void convert({ toBase: n });
          }}
          className="font-mono"
        />
      </div>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <RunnerPanel>
          <p className="font-mono text-xl break-all">{result}</p>
          <p className="mt-1 text-xs text-[var(--neutral-10)]">十进制：{decimal}</p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>
        引擎：ECMAScript parseInt / Number.toString · 2–36 进制 · 与 API 同一路径
      </RunnerNote>
    </div>
  );
}
