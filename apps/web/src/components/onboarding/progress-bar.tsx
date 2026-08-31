"use client";

import { Check } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";

export interface ProgressBarStep {
  readonly id: number;
  readonly label: string;
}

export interface ProgressBarProps {
  readonly steps: readonly ProgressBarStep[];
  readonly currentStep: number;
  readonly completedSteps: ReadonlySet<number>;
  readonly className?: string;
  readonly ariaLabel?: string;
}

type StepState = "complete" | "current" | "upcoming";

function getStepState(
  step: ProgressBarStep,
  currentStep: number,
  completedSteps: ReadonlySet<number>,
): StepState {
  if (completedSteps.has(step.id)) return "complete";
  if (step.id === currentStep) return "current";
  return "upcoming";
}

const DOT_BASE = "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold";

const DOT_BY_STATE: Record<StepState, string> = {
  complete: "bg-primary text-primary-foreground",
  current: "bg-primary text-primary-foreground",
  upcoming: "bg-muted text-muted-foreground",
};

const LABEL_BY_STATE: Record<StepState, string> = {
  complete: "text-foreground",
  current: "text-foreground font-medium",
  upcoming: "text-muted-foreground",
};

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  className,
  ariaLabel = "Onboarding progress",
}: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentStep}
      aria-label={ariaLabel}
      className={cn("flex items-start", className)}
    >
      {steps.map((step, index) => {
        const state = getStepState(step, currentStep, completedSteps);
        const isLast = index === steps.length - 1;
        const connectorActive = step.id < currentStep || completedSteps.has(step.id);

        return (
          <div key={step.id} className={cn("flex items-start", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                data-testid={`onboarding-step-circle-${step.id}`}
                data-state={state}
                className={cn(DOT_BASE, DOT_BY_STATE[state])}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "complete" ? <Check className="size-3" aria-hidden="true" /> : step.id}
              </div>
              <span
                className={cn(
                  "max-w-[4.75rem] text-center text-[11px] leading-tight",
                  LABEL_BY_STATE[state],
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                data-testid={`onboarding-step-connector-${step.id}`}
                aria-hidden="true"
                className={cn(
                  "mt-2.5 h-px flex-1",
                  connectorActive ? "bg-primary/50" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
