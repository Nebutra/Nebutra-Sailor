"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";
import {
  RunnerError,
  RunnerNote,
  RunnerOutput,
  RunnerPanel,
  RunnerSelect,
} from "@/components/runner-ui";

export function TimestampRunner({ toolId }: { toolId: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"to_date" | "to_unix">("to_date");
  const [unit, setUnit] = useState<"seconds" | "milliseconds">("seconds");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const run = async (body: Record<string, unknown>) => {
    setError("");
    const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: body }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      output?: unknown;
      message?: string;
    };
    if (!res.ok || data.ok === false) {
      setError(data.message ?? "error");
      return;
    }
    setOutput(JSON.stringify(data.output, null, 2));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerPanel title="当前秒">
          <p className="font-mono text-xl tabular-nums">{Math.floor(now / 1000)}</p>
        </RunnerPanel>
        <RunnerPanel title="当前毫秒 / ISO">
          <p className="font-mono text-sm tabular-nums">{now}</p>
          <p className="mt-1 font-mono text-xs text-[var(--neutral-10)]">
            {new Date(now).toISOString()}
          </p>
        </RunnerPanel>
      </div>

      <Button type="button" variant="ink" onClick={() => void run({ mode: "now" })}>
        服务端 now
      </Button>

      <div className="grid gap-3 sm:grid-cols-3">
        <RunnerSelect
          label="模式"
          id="ts-mode"
          value={mode}
          onChange={(v) => setMode(v as typeof mode)}
        >
          <option value="to_date">时间戳 → 日期</option>
          <option value="to_unix">日期 → 时间戳</option>
        </RunnerSelect>
        <RunnerSelect
          label="单位"
          id="ts-unit"
          value={unit}
          onChange={(v) => setUnit(v as typeof unit)}
        >
          <option value="seconds">秒</option>
          <option value="milliseconds">毫秒</option>
        </RunnerSelect>
        <Input
          label="值"
          id="timestamp-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "to_date" ? "1710000000" : "2024-01-01T00:00:00Z"}
          className="font-mono"
        />
      </div>
      <Button type="button" variant="outline" onClick={() => void run({ mode, value, unit })}>
        转换
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput>{output}</RunnerOutput>
      <RunnerNote>与 API 同一路径</RunnerNote>
    </div>
  );
}
