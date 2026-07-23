"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerPanel, RunnerSelect } from "@/components/runner-ui";

async function invokeTool(
  toolId: string,
  input: Record<string, unknown>,
): Promise<{ ok: true; output: Record<string, unknown> } | { ok: false; message: string }> {
  const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const body = (await res.json()) as {
    ok?: boolean;
    output?: Record<string, unknown>;
    message?: string;
    error?: string;
  };
  if (!res.ok || body.ok === false) {
    return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, output: body.output ?? {} };
}

const CATEGORY_ZH: Record<string, string> = {
  underweight: "偏瘦",
  normal: "正常",
  overweight: "超重",
  obese: "肥胖",
};

export function BmiRunner({ toolId }: { toolId: string }) {
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("65");
  const [bmi, setBmi] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(w) || w <= 0) {
      setError("请输入有效的身高（cm）与体重（kg）");
      setLoading(false);
      return;
    }
    const r = await invokeTool(toolId, { heightCm: h, weightKg: w });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setBmi(typeof r.output.bmi === "number" ? r.output.bmi : null);
    setCategory(typeof r.output.category === "string" ? r.output.category : "");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="身高 (cm)"
          id="bmi-height"
          type="number"
          min={50}
          max={250}
          step="0.1"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          className="font-mono tabular-nums"
        />
        <Input
          label="体重 (kg)"
          id="bmi-weight"
          type="number"
          min={10}
          max={500}
          step="0.1"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "计算中…" : "计算 BMI"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {bmi != null ? (
        <RunnerPanel>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{bmi}</p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">
            {CATEGORY_ZH[category] ?? category}
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>WHO BMI · 与 API 同一路径 · 仅供参考，非医疗诊断</RunnerNote>
    </div>
  );
}

export function PercentageRunner({ toolId }: { toolId: string }) {
  const [mode, setMode] = useState<"percent_of" | "is_what_percent">("percent_of");
  const [a, setA] = useState("20");
  const [b, setB] = useState("150");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) {
      setError("请输入有效数字");
      setLoading(false);
      return;
    }
    const r = await invokeTool(toolId, { mode, a: na, b: nb });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "number" ? r.output.result : null);
  };

  return (
    <div className="space-y-4">
      <RunnerSelect
        label="计算方式"
        id="pct-mode"
        value={mode}
        onChange={(v) => setMode(v as "percent_of" | "is_what_percent")}
      >
        <option value="percent_of">a% 的 b 是多少</option>
        <option value="is_what_percent">a 是 b 的百分之几</option>
      </RunnerSelect>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={mode === "percent_of" ? "百分比 a" : "数值 a"}
          id="pct-a"
          type="number"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="font-mono tabular-nums"
        />
        <Input
          label={mode === "percent_of" ? "基数 b" : "基数 b"}
          id="pct-b"
          type="number"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "计算中…" : "计算"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result != null ? (
        <RunnerPanel>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {Number.isInteger(result) ? result : Math.round(result * 10000) / 10000}
            {mode === "is_what_percent" ? "%" : ""}
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>与 API 同一路径</RunnerNote>
    </div>
  );
}

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function DataSizeRunner({ toolId }: { toolId: string }) {
  const [value, setValue] = useState("1024");
  const [from, setFrom] = useState<(typeof SIZE_UNITS)[number]>("MB");
  const [to, setTo] = useState<(typeof SIZE_UNITS)[number]>("GB");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const n = Number(value);
    if (!Number.isFinite(n)) {
      setError("请输入有效数值");
      setLoading(false);
      return;
    }
    const r = await invokeTool(toolId, { value: n, from, to });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "number" ? r.output.result : null);
  };

  return (
    <div className="space-y-4">
      <Input
        label="数值"
        id="data-size-value"
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-mono tabular-nums"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect
          label="从"
          id="data-size-from"
          value={from}
          onChange={(v) => setFrom(v as (typeof SIZE_UNITS)[number])}
        >
          {SIZE_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </RunnerSelect>
        <RunnerSelect
          label="到"
          id="data-size-to"
          value={to}
          onChange={(v) => setTo(v as (typeof SIZE_UNITS)[number])}
        >
          {SIZE_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </RunnerSelect>
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "换算中…" : "换算"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result != null ? (
        <RunnerPanel>
          <p className="font-mono text-xl tabular-nums break-all">
            {result} {to}
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-10)]">
            {value} {from} → 1024 进制
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>二进制单位（1 KB = 1024 B）· 与 API 同一路径</RunnerNote>
    </div>
  );
}

export function RmbUppercaseRunner({ toolId }: { toolId: string }) {
  const [amount, setAmount] = useState("1234.56");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      setError("请输入非负金额");
      setLoading(false);
      return;
    }
    const r = await invokeTool(toolId, { amount: n });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setResult(typeof r.output.result === "string" ? r.output.result : "");
  };

  return (
    <div className="space-y-4">
      <Input
        label="金额（元）"
        id="rmb-amount"
        type="number"
        min={0}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="font-mono tabular-nums"
        placeholder="1234.56"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
          {loading ? "转换中…" : "转大写"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(result)}
          disabled={!result}
        >
          复制
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <RunnerPanel>
          <p className="text-lg leading-relaxed tracking-wide">{result}</p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>中文发票金额大写 · 与 API 同一路径</RunnerNote>
    </div>
  );
}

export function DateDiffRunner({ toolId }: { toolId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [days, setDays] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const r = await invokeTool(toolId, { from, to });
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setDays(typeof r.output.days === "number" ? r.output.days : null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="起始日期"
          id="date-diff-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          label="结束日期"
          id="date-diff-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? "计算中…" : "计算间隔"}
      </Button>
      <RunnerError>{error}</RunnerError>
      {days != null ? (
        <RunnerPanel>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {days}
            <span className="ml-2 text-base font-normal text-[var(--neutral-11)]">天</span>
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-10)]">
            {from} → {to}
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>ECMAScript Date · 与 API 同一路径</RunnerNote>
    </div>
  );
}
