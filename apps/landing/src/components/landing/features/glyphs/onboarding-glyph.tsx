"use client";

import { ArrowRight, Check, Sparkles, UserPlus } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type StepState = "done" | "active" | "pending";

const STEP_STATES: readonly StepState[] = ["done", "done", "active", "pending"];

type OnboardingCopy = {
  steps: Record<string, string>;
  footnote: string;
  count: string;
};

function StepNode({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Check className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="relative flex h-7 w-7 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" aria-hidden />
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-primary/30">
          <UserPlus className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border bg-background text-muted-foreground">
      <span className="font-medium text-[10px] tabular-nums">{index + 1}</span>
    </div>
  );
}

function Connector({ filled }: { filled: boolean }) {
  return (
    <div
      className={
        filled
          ? "h-px flex-1 bg-primary/70"
          : "h-px flex-1 bg-gradient-to-r from-border to-border/40"
      }
      aria-hidden
    />
  );
}

export function OnboardingGlyph({ copy }: SubpackageGlyphProps) {
  const t = copy as OnboardingCopy;
  const steps = STEP_STATES.map((state, i) => ({ state, label: t.steps[String(i)] }));

  return (
    <div
      className="flex w-full flex-col justify-between gap-3 rounded-[var(--radius-md)] bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-1 items-center gap-1.5 last:flex-none">
            <StepNode index={i} state={step.state} />
            {i < steps.length - 1 ? <Connector filled={steps[i + 1]?.state !== "pending"} /> : null}
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-1 px-0.5 text-[10px] text-muted-foreground">
        {steps.map((step, i) => (
          <span
            key={i}
            className={
              step.state === "pending" ? "truncate" : "truncate text-foreground/80 font-medium"
            }
          >
            {step.label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px] tabular-nums">
          {t.count} <ArrowRight className="ml-1 h-3 w-3" /> 75%
        </Badge>
        <div className="flex-1">
          <Progress value={75} size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>{t.footnote}</span>
      </div>
    </div>
  );
}
