"use client";

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

const CIRCLE_BASE =
  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors";

const CIRCLE_BY_STATE: Record<StepState, string> = {
  complete: "bg-[var(--brand-primary)] text-white",
  current:
    "border-2 border-[var(--brand-primary)] bg-[var(--neutral-1)] text-[var(--brand-primary)]",
  upcoming: "border border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-11)]",
};

const LABEL_BY_STATE: Record<StepState, string> = {
  complete: "text-[var(--neutral-12)] font-medium",
  current: "text-[var(--neutral-12)] font-medium",
  upcoming: "text-[var(--neutral-11)]",
};

export function ProgressBar({ steps, currentStep, completedSteps, className }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentStep}
      aria-label="Onboarding progress"
      className={cn("flex items-start justify-center gap-2 sm:gap-4", className)}
    >
      {steps.map((step, index) => {
        const state = getStepState(step, currentStep, completedSteps);
        const isLast = index === steps.length - 1;
        const connectorActive =
          completedSteps.has(step.id) || (step.id < currentStep && completedSteps.has(step.id));

        return (
          <div key={step.id} className="flex flex-1 items-start gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-2">
              <div
                data-testid={`onboarding-step-circle-${step.id}`}
                data-state={state}
                className={cn(CIRCLE_BASE, CIRCLE_BY_STATE[state])}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "complete" ? (
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span className={cn("whitespace-nowrap text-xs", LABEL_BY_STATE[state])}>
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                data-testid={`onboarding-step-connector-${step.id}`}
                aria-hidden="true"
                className={cn(
                  "mt-4 h-px flex-1 transition-colors",
                  connectorActive ? "bg-[var(--brand-primary)]" : "bg-[var(--neutral-7)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
