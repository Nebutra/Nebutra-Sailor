"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { invokeForge, useDebouncedCallback } from "@/components/result-panels";
import {
  RunnerError,
  RunnerNote,
  RunnerOutput,
  RunnerPanel,
  RunnerSelect,
} from "@/components/runner-ui";

export function TimestampRunner({ toolId }: { toolId: string }) {
  const t = useTranslations("runners");
  const [now, setNow] = useState(() => Date.now());
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"to_date" | "to_unix">("to_date");
  const [unit, setUnit] = useState<"seconds" | "milliseconds">("seconds");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const run = async (body: Record<string, unknown>) => {
    setError("");
    const data = await invokeForge(toolId, body);
    if (!data.ok) {
      setError(data.message);
      return;
    }
    setOutput(JSON.stringify(data.output, null, 2));
  };

  const liveConvert = useDebouncedCallback((m: typeof mode, v: string, u: typeof unit) => {
    if (!v.trim()) {
      setOutput("");
      setError("");
      return;
    }
    void run({ mode: m, value: v, unit: u });
  }, 280);

  useEffect(() => {
    liveConvert(mode, value, unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, value, unit]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <RunnerPanel title={t("timestamp.nowSec")}>
          <p className="font-mono text-xl tabular-nums">{Math.floor(now / 1000)}</p>
        </RunnerPanel>
        <RunnerPanel title={t("timestamp.nowMs")}>
          <p className="font-mono text-sm tabular-nums">{now}</p>
          <p className="mt-1 font-mono text-xs text-[var(--neutral-10)]">
            {new Date(now).toISOString()}
          </p>
        </RunnerPanel>
      </div>

      <Button type="button" variant="ink" onClick={() => void run({ mode: "now" })}>
        {t("timestamp.serverNow")}
      </Button>

      <div className="grid gap-3 sm:grid-cols-3">
        <RunnerSelect
          label={t("common.mode")}
          id="ts-mode"
          value={mode}
          onChange={(v) => setMode(v as typeof mode)}
        >
          <option value="to_date">{t("timestamp.toDate")}</option>
          <option value="to_unix">{t("timestamp.toUnix")}</option>
        </RunnerSelect>
        <RunnerSelect
          label={t("common.unit")}
          id="ts-unit"
          value={unit}
          onChange={(v) => setUnit(v as typeof unit)}
        >
          <option value="seconds">{t("timestamp.seconds")}</option>
          <option value="milliseconds">{t("timestamp.milliseconds")}</option>
        </RunnerSelect>
        <Input
          label={t("timestamp.value")}
          id="timestamp-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "to_date" ? "1710000000" : "2024-01-01T00:00:00Z"}
          className="font-mono"
        />
      </div>
      <p className="text-xs text-[var(--neutral-10)]">{t("common.liveHint")}</p>
      <Button type="button" variant="outline" onClick={() => void run({ mode, value, unit })}>
        {t("timestamp.convert")}
      </Button>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput>{output}</RunnerOutput>
      <RunnerNote>{t("timestamp.note")}</RunnerNote>
    </div>
  );
}
