"use client";

import { Check, LoaderCircle as Loader2 } from "@nebutra/icons";
import { createContext, use, useCallback, useMemo, useState } from "react";

import { cn } from "../utils/cn";
import { Button } from "./button";

// ============================================
// Types
// ============================================

/**
 * Visual status of one step. The provider derives `completed`, `current` and `pending` from the
 * current index, and `error` from `Step.error`, which wins over the other three.
 */
export type StepStatus = "pending" | "current" | "completed" | "error";

/** One entry in a stepper's ordered list of steps. */
export interface Step {
  /** Stable identifier, used as the React key. */
  id: string;
  /** Step label shown beside the indicator. */
  title: string;
  /** Secondary line shown under the title. */
  description?: string;
  /** Appends an "(Optional)" marker to the title. It does not make the step skippable. */
  optional?: boolean;
  /**
   * Marks the step as failed: the indicator turns destructive and the step reports
   * `data-status="error"`, whether it is behind, at or ahead of the current step.
   * @default false
   */
  error?: boolean;
}

/** The value `StepperProvider` shares with `Stepper`, `StepperContent` and `StepperNavigation`. */
export interface StepperContextValue {
  /** The ordered steps. */
  steps: Step[];
  /** Zero-based index of the current step. */
  currentStep: number;
  /** Jumps to a step index; indexes outside the step list are ignored. */
  goToStep: (step: number) => void;
  /** Moves one step forward; does nothing on the last step. */
  nextStep: () => void;
  /** Moves one step back; does nothing on the first step. */
  prevStep: () => void;
  /** True while the current step is the first one. */
  isFirstStep: boolean;
  /** True while the current step is the last one. */
  isLastStep: boolean;
  /**
   * Status for a step index: `error` when the step sets `error`, otherwise completed before the
   * current step, current at it and pending after.
   */
  getStepStatus: (index: number) => StepStatus;
}

// ============================================
// Context
// ============================================

const StepperContext = createContext<StepperContextValue | null>(null);

const STEPPER_FALLBACK: StepperContextValue = {
  steps: [],
  currentStep: 0,
  goToStep: () => {},
  nextStep: () => {},
  prevStep: () => {},
  isFirstStep: true,
  isLastStep: true,
  getStepStatus: () => "pending" as StepStatus,
};

/**
 * Reads the nearest `StepperProvider`. Outside one it returns an inert fallback with no steps, so
 * `Stepper` renders an empty wrapper instead of throwing.
 */
export function useStepperContext() {
  const context = use(StepperContext);
  if (!context) {
    return STEPPER_FALLBACK;
  }
  return context;
}

// ============================================
// StepperProvider
// ============================================

export interface StepperProviderProps {
  /** Ordered steps shared with every stepper part below the provider. */
  steps: Step[];
  /**
   * Zero-based index of the step shown first. Later changes do not move the stepper.
   * @default 0
   */
  initialStep?: number;
  /** Stepper parts (`Stepper`, `StepperContent`, `StepperNavigation`) and any surrounding content. */
  children: React.ReactNode;
  /** Called with the new step index after `goToStep`, `nextStep` or `prevStep` changes it. */
  onStepChange?: (step: number) => void;
}

/**
 * Owns the current step and shares it, with navigation helpers, to the stepper parts rendered
 * inside it. It renders no element of its own.
 */
export function StepperProvider({
  steps,
  initialStep = 0,
  children,
  onStepChange,
}: StepperProviderProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
        onStepChange?.(step);
      }
    },
    [steps.length, onStepChange],
  );

  const nextStep = useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const getStepStatus = useCallback(
    (index: number): StepStatus => {
      if (steps[index]?.error) return "error";
      if (index < currentStep) return "completed";
      if (index === currentStep) return "current";
      return "pending";
    },
    [currentStep, steps],
  );

  const value = useMemo(
    () => ({
      steps,
      currentStep,
      goToStep,
      nextStep,
      prevStep,
      isFirstStep: currentStep === 0,
      isLastStep: currentStep === steps.length - 1,
      getStepStatus,
    }),
    [steps, currentStep, goToStep, nextStep, prevStep, getStepStatus],
  );

  return <StepperContext.Provider value={value}>{children}</StepperContext.Provider>;
}

// ============================================
// Stepper Component
// ============================================

export interface StepperProps {
  /**
   * Lay the steps out in a row with the label under each indicator, or in a column with the label
   * beside it.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Indicator, label and connector size.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * Make each indicator a button that jumps to its step, including steps ahead of the current one.
   * When false the indicators are disabled buttons.
   * @default false
   */
  clickable?: boolean;
  /**
   * Draw a connector between consecutive steps; it fills once the step before it is completed.
   * @default true
   */
  showConnector?: boolean;
  /** Classes applied to the outer wrapper. */
  className?: string;
}

/**
 * Step indicator driven by the nearest `StepperProvider`: numbered circles with titles, a check
 * for completed steps and a ring on the current one. Renders an ordered list with one item per
 * step; the current item carries `aria-current="step"` and every item a `data-status`. Renders an
 * empty list outside a provider.
 */
export function Stepper({
  orientation = "horizontal",
  size = "md",
  clickable = false,
  showConnector = true,
  className,
}: StepperProps) {
  const { steps, currentStep, goToStep, getStepStatus } = useStepperContext();

  const sizeConfig = {
    sm: { icon: "h-6 w-6", text: "text-xs", connector: "h-0.5 w-8" },
    md: { icon: "h-8 w-8", text: "text-sm", connector: "h-0.5 w-12" },
    lg: { icon: "h-10 w-10", text: "text-base", connector: "h-1 w-16" },
  };

  const config = sizeConfig[size];

  return (
    <ol
      className={cn(
        "m-0 flex list-none p-0",
        orientation === "horizontal" ? "flex-row items-start" : "flex-col items-start",
        className,
      )}
    >
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            data-status={status}
            aria-current={index === currentStep ? "step" : undefined}
            className={cn(
              "flex",
              orientation === "horizontal" ? "flex-col items-center" : "flex-row items-start",
            )}
          >
            <div
              className={cn(
                "flex",
                orientation === "horizontal" ? "flex-row items-center" : "flex-col items-center",
              )}
            >
              {/* Step icon */}
              <button
                type="button"
                onClick={() => clickable && goToStep(index)}
                disabled={!clickable}
                className={cn(
                  "relative flex items-center justify-center rounded-full border transition-[background-color,border-color,box-shadow,color,opacity,transform,scale] duration-micro ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:transform-none",
                  config.icon,
                  status === "completed" && "border-primary bg-primary text-primary-foreground",
                  status === "current" &&
                    "border-primary bg-background text-primary ring-4 ring-primary/15",
                  status === "pending" && "border-neutral-6 bg-background text-muted-foreground",
                  status === "error" &&
                    "border-destructive bg-destructive text-destructive-foreground",
                  clickable && "cursor-pointer hover:ring-4 hover:ring-accent",
                )}
              >
                {status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className={cn("font-medium", config.text)}>{index + 1}</span>
                )}
              </button>

              {/* Connector */}
              {showConnector && !isLast && (
                <div
                  className={cn(
                    "transition-colors duration-micro ease-out",
                    orientation === "horizontal" ? cn(config.connector, "mx-2") : "my-2 h-8 w-0.5",
                    index < currentStep ? "bg-primary" : "bg-neutral-4",
                  )}
                />
              )}
            </div>

            {/* Step text */}
            <div className={cn("mt-2", orientation === "vertical" && "ms-3 mt-0")}>
              <p
                className={cn(
                  "font-medium",
                  config.text,
                  status === "completed" && "text-primary",
                  status === "current" && "text-foreground",
                  status === "pending" && "text-muted-foreground",
                  status === "error" && "text-destructive-strong",
                )}
              >
                {step.title}
                {step.optional && (
                  <span className="ms-1 text-xs text-muted-foreground">(Optional)</span>
                )}
              </p>
              {step.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ============================================
// StepperContent 内容容器
// ============================================

export interface StepperContentProps {
  /** Zero-based index of the step this content belongs to; it renders only while that step is current. */
  step: number;
  /** Content shown while the step is current. */
  children: React.ReactNode;
  /** Classes applied to the content wrapper. */
  className?: string;
}

/**
 * Panel for one step. Renders its children only while `step` is the current step, and nothing
 * otherwise.
 */
export function StepperContent({ step, children, className }: StepperContentProps) {
  const { currentStep } = useStepperContext();

  if (step !== currentStep) {
    return null;
  }

  return <div className={cn("animate-in fade-in-50", className)}>{children}</div>;
}

// ============================================
// StepperNavigation 导航按钮
// ============================================

export interface StepperNavigationProps {
  /**
   * Label of the back button.
   * @default "Previous"
   */
  prevLabel?: string;
  /**
   * Label of the forward button on every step except the last.
   * @default "Next"
   */
  nextLabel?: string;
  /**
   * Label of the forward button on the last step.
   * @default "Finish"
   */
  finishLabel?: string;
  /** Called when the forward button is pressed on the last step. */
  onFinish?: () => void;
  /**
   * Show a spinner in the forward button and disable both buttons while work is pending.
   * @default false
   */
  loading?: boolean;
  /**
   * Disable the forward button, for example until the current step validates. The back button is
   * unaffected.
   * @default false
   */
  disableNext?: boolean;
  /** Classes applied to the button row. */
  className?: string;
}

/**
 * Back and forward buttons for the nearest `StepperProvider`. Back is disabled on the first step;
 * the forward button becomes the finish action on the last step.
 */
export function StepperNavigation({
  prevLabel,
  nextLabel,
  finishLabel,
  onFinish,
  loading = false,
  disableNext = false,
  className,
}: StepperNavigationProps) {
  const { prevStep, nextStep, isFirstStep, isLastStep } = useStepperContext();

  return (
    <div className={cn("flex items-center justify-between pt-4", className)}>
      <Button type="button" variant="outline" onClick={prevStep} disabled={isFirstStep || loading}>
        {prevLabel || "Previous"}
      </Button>

      {isLastStep ? (
        <Button
          type="button"
          onClick={onFinish}
          disabled={loading || disableNext}
          className="bg-primary hover:bg-primary/90"
        >
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin motion-reduce:animate-pulse" />}
          {finishLabel || "Finish"}
        </Button>
      ) : (
        <Button type="button" onClick={nextStep} disabled={loading || disableNext}>
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin motion-reduce:animate-pulse" />}
          {nextLabel || "Next"}
        </Button>
      )}
    </div>
  );
}

// ============================================
// 简化版 useStepper Hook
// ============================================

export interface UseStepperOptions {
  /** Ordered steps to manage. */
  steps: Step[];
  /**
   * Zero-based index of the step shown first.
   * @default 0
   */
  initialStep?: number;
  /** Called when `nextStep` is invoked on the last step. */
  onComplete?: () => void;
}

/**
 * Standalone step state for flows that do not use `StepperProvider`. Returns the current index and
 * data, navigation helpers, `reset`, and `progress` as a percentage.
 */
export function useStepper({ steps, initialStep = 0, onComplete }: UseStepperOptions) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
      }
    },
    [steps.length],
  );

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  }, [currentStep, steps.length, onComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    setCurrentStep(0);
  }, []);

  return {
    steps,
    currentStep,
    currentStepData: steps[currentStep],
    goToStep,
    nextStep,
    prevStep,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    progress: steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0,
  };
}

// ============================================
// ProgressStepper 进度条风格
// ============================================

export interface ProgressStepperProps {
  /** Zero-based index of the current step; the bar is filled through this step. */
  currentStep: number;
  /** Total number of steps. The fill is 0% when this is zero or less, and never exceeds 100%. */
  totalSteps: number;
  /** Labels spread across the row under the bar; steps up to the current one are highlighted. */
  labels?: string[];
  /** Classes applied to the outer wrapper. */
  className?: string;
}

/**
 * Progress-bar step indicator that takes its position as props and needs no provider. Prints the
 * position as "步骤 N / M" (Chinese for "Step N of M"); that text is not configurable.
 */
export function ProgressStepper({
  currentStep,
  totalSteps,
  labels,
  className,
}: ProgressStepperProps) {
  const progress =
    totalSteps > 0 ? Math.min(100, Math.max(0, ((currentStep + 1) / totalSteps) * 100)) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* 进度条 */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-4">
        <div
          className="h-full rounded-full bg-primary transition-[width,background-color] duration-flow ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {labels.map((label, index) => (
            <span
              key={index}
              className={cn(
                "font-medium",
                index <= currentStep ? "text-primary/90" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Step count */}
      <p className="text-center text-sm text-muted-foreground">
        步骤 {totalSteps > 0 ? currentStep + 1 : 0} / {Math.max(0, totalSteps)}
      </p>
    </div>
  );
}
