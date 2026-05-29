"use client";

import { ArrowRight, Check, Clock, RefreshCounterClockwise } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * SagaGlyph
 *
 * Mini saga transaction flow for the @nebutra/saga sub-package. A horizontal
 * row of 4 step pills connected by ArrowRight separators — first two
 * committed, third in-flight (pulsing amber), fourth queued (dashed/dim).
 * Below: dashed rollback path showing compensation. Top-right: timeout badge.
 */

type StepState = "done" | "active" | "queued";

type SagaStep = {
  index: number;
  label: string;
  state: StepState;
};

const COPY = {
  en: {
    timeout: "saga · 5s timeout",
    compensate: "compensate · rollback steps 1-2",
    steps: ["reserve", "charge", "fulfill", "notify"] as const,
  },
  zh: {
    timeout: "saga · 5s 超时",
    compensate: "补偿 · 回滚步骤 1-2",
    steps: ["预留", "扣款", "履约", "通知"] as const,
  },
} as const;

const STEP_STATES: ReadonlyArray<StepState> = ["done", "done", "active", "queued"];

export function SagaGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];
  const steps: ReadonlyArray<SagaStep> = copy.steps.map((label, i) => ({
    index: i + 1,
    label,
    state: STEP_STATES[i] ?? "queued",
  }));

  return (
    <div
      aria-hidden
      className="relative flex w-full flex-col justify-center gap-3 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-3"
      style={{ height: 160 }}
    >
      {/* Top-right timeout badge */}
      <div className="absolute right-2 top-2">
        <Badge variant="gray-subtle" size="sm" icon={<Clock />} className="font-mono">
          {copy.timeout}
        </Badge>
      </div>

      {/* Step pills row */}
      <div className="mt-5 flex items-center justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1">
            <StepPill step={step} />
            {i < steps.length - 1 ? (
              <ArrowRight className="h-3 w-3 shrink-0 text-[var(--neutral-9)]" />
            ) : null}
          </div>
        ))}
      </div>

      {/* Rollback path */}
      <div className="flex items-center gap-1.5 border-t border-dashed border-[var(--neutral-7)] pt-2">
        <RefreshCounterClockwise className="h-3 w-3 text-[color:var(--status-danger)]" />
        <span className="font-mono text-[10px] text-[var(--neutral-10)]">{copy.compensate}</span>
      </div>
    </div>
  );
}

function StepPill({ step }: { step: SagaStep }) {
  if (step.state === "done") {
    return (
      <Badge variant="green-subtle" size="sm" icon={<Check />} className="font-mono">
        {step.index}. {step.label}
      </Badge>
    );
  }
  if (step.state === "active") {
    return (
      <Badge variant="amber-subtle" size="sm" dot className="font-mono animate-pulse">
        {step.index}. {step.label}
      </Badge>
    );
  }
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-dashed border-[var(--neutral-7)] px-1.5 font-mono text-[11px] text-[var(--neutral-10)]">
      {step.index}. {step.label}
    </span>
  );
}
