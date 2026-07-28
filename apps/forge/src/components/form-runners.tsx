"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
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

export function BmiRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("65");
  const [bmi, setBmi] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const categoryLabel = (c: string) => {
    if (c === "underweight") return t("bmi.underweight");
    if (c === "normal") return t("bmi.normal");
    if (c === "overweight") return t("bmi.overweight");
    if (c === "obese") return t("bmi.obese");
    return c;
  };

  const run = async () => {
    setLoading(true);
    setError("");
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(w) || w <= 0) {
      setError(t("bmi.invalid"));
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
          label={t("bmi.height")}
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
          label={t("bmi.weight")}
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
        {loading ? t("bmi.computing") : t("bmi.compute")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {bmi != null ? (
        <RunnerPanel>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{bmi}</p>
          <p className="mt-1 text-sm text-[var(--neutral-11)]">{categoryLabel(category)}</p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("bmi.note")}</RunnerNote>
    </div>
  );
}

export function PercentageRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
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
      setError(t("percentage.invalid"));
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
        label={t("percentage.mode")}
        id="pct-mode"
        value={mode}
        onChange={(v) => setMode(v as "percent_of" | "is_what_percent")}
      >
        <option value="percent_of">{t("percentage.percentOf")}</option>
        <option value="is_what_percent">{t("percentage.isWhat")}</option>
      </RunnerSelect>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={mode === "percent_of" ? t("percentage.percentA") : t("percentage.valueA")}
          id="pct-a"
          type="number"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="font-mono tabular-nums"
        />
        <Input
          label={t("percentage.baseB")}
          id="pct-b"
          type="number"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("percentage.computing") : t("percentage.compute")}
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
      <RunnerNote>{t("percentage.note")}</RunnerNote>
    </div>
  );
}

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function DataSizeRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
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
      setError(t("dataSize.invalid"));
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
        label={t("dataSize.value")}
        id="data-size-value"
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-mono tabular-nums"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerSelect
          label={t("common.from")}
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
          label={t("common.to")}
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
        {loading ? t("dataSize.converting") : t("dataSize.convert")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {result != null ? (
        <RunnerPanel>
          <p className="font-mono text-xl tabular-nums break-all">
            {result} {to}
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-10)]">
            {t("dataSize.binary", { value, from })}
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("dataSize.note")}</RunnerNote>
    </div>
  );
}

export function RmbUppercaseRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [amount, setAmount] = useState("1234.56");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      setError(t("rmb.invalid"));
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
        label={t("rmb.amount")}
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
          {loading ? t("rmb.converting") : t("rmb.convert")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(result)}
          disabled={!result}
        >
          {t("common.copy")}
        </Button>
      </div>
      <RunnerError>{error}</RunnerError>
      {result ? (
        <RunnerPanel>
          <p className="text-lg leading-relaxed tracking-wide">{result}</p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("rmb.note")}</RunnerNote>
    </div>
  );
}

export function DateDiffRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
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
          label={t("dateDiff.from")}
          id="date-diff-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          label={t("dateDiff.to")}
          id="date-diff-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button type="button" variant="ink" onClick={() => void run()} disabled={loading}>
        {loading ? t("dateDiff.computing") : t("dateDiff.compute")}
      </Button>
      <RunnerError>{error}</RunnerError>
      {days != null ? (
        <RunnerPanel>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {days}
            <span className="ml-2 text-base font-normal text-[var(--neutral-11)]">
              {t("dateDiff.days")}
            </span>
          </p>
          <p className="mt-1 text-xs text-[var(--neutral-10)]">
            {from} → {to}
          </p>
        </RunnerPanel>
      ) : null}
      <RunnerNote>{t("dateDiff.note")}</RunnerNote>
    </div>
  );
}
