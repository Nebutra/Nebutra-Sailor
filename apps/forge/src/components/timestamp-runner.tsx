"use client";

import { useEffect, useState } from "react";

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
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">当前秒</p>
          <p className="font-mono text-xl tabular-nums">{Math.floor(now / 1000)}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">当前毫秒 / ISO</p>
          <p className="font-mono text-sm tabular-nums">{now}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {new Date(now).toISOString()}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void run({ mode: "now" })}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        服务端 now
      </button>

      <div className="flex flex-wrap gap-3 text-sm">
        <select
          data-allow-native
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="rounded border border-border bg-background px-2 py-1"
        >
          <option value="to_date">时间戳 → 日期</option>
          <option value="to_unix">日期 → 时间戳</option>
        </select>
        <select
          data-allow-native
          value={unit}
          onChange={(e) => setUnit(e.target.value as typeof unit)}
          className="rounded border border-border bg-background px-2 py-1"
        >
          <option value="seconds">秒</option>
          <option value="milliseconds">毫秒</option>
        </select>
        <input
          data-allow-native
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "to_date" ? "1710000000" : "2024-01-01T00:00:00Z"}
          className="min-w-[200px] flex-1 rounded border border-border bg-background px-3 py-1.5 font-mono"
        />
        <button
          type="button"
          onClick={() => void run({ mode, value, unit })}
          className="rounded-lg border border-border px-4 py-1.5"
        >
          转换
        </button>
      </div>
      {error ? (
        <pre className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </pre>
      ) : null}
      {output ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-sm">
          {output}
        </pre>
      ) : null}
    </div>
  );
}
