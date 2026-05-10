"use client";

import { Check, Loader2 } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "../utils/cn";
import { Button } from "./button";

// ============================================
// Types
// ============================================

export type StepStatus = "pending" | "current" | "completed" | "error";

export interface Step {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

export interface StepperContextValue {
  steps: Step[];
  currentStep: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
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

export function useStepperContext() {
  const context = useContext(StepperContext);
  if (!context) {
    return STEPPER_FALLBACK;
  }
  return context;
}

// ============================================
// StepperProvider
// ============================================

export interface StepperProviderProps {
  steps: Step[];
  initialStep?: number;
  children: React.ReactNode;
  onStepChange?: (step: number) => void;
}

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
      if (index < currentStep) return "completed";
      if (index === currentStep) return "current";
      return "pending";
    },
    [currentStep],
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
  /** orientation */
  orientation?: "horizontal" | "vertical";
  /** 大小 */
  size?: "sm" | "md" | "lg";
  /** 是否可点击切换 */
  clickable?: boolean;
  /** 是否显示Connector */
  showConnector?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * 步骤指示器组件 (Stripe 风格)
 *
 * 功能：
 * - 水平/垂直布局
 * - 多种尺寸
 * - 可点击切换
 * - 完成状态动画
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
    <div
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row items-start" : "flex-col items-start",
        className,
      )}
    >
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
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
                  "relative flex items-center justify-center rounded-full border-2 transition-all",
                  config.icon,
                  status === "completed" && "border-primary bg-primary text-white",
                  status === "current" && "border-primary bg-white text-primary dark:bg-slate-900",
                  status === "pending" &&
                    "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900",
                  status === "error" && "border-red-500 bg-red-500 text-white",
                  clickable && "cursor-pointer hover:scale-105",
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
                    "transition-colors",
                    orientation === "horizontal" ? cn(config.connector, "mx-2") : "my-2 h-8 w-0.5",
                    index < currentStep ? "bg-primary" : "bg-slate-200 dark:bg-slate-700",
                  )}
                />
              )}
            </div>

            {/* Step text */}
            <div className={cn("mt-2", orientation === "vertical" && "ml-3 mt-0")}>
              <p
                className={cn(
                  "font-medium",
                  config.text,
                  status === "completed" && "text-primary",
                  status === "current" && "text-slate-900 dark:text-slate-100",
                  status === "pending" && "text-slate-400 dark:text-slate-500",
                )}
              >
                {step.title}
                {step.optional && (
                  <span className="ml-1 text-xs text-muted-foreground">(Optional)</span>
                )}
              </p>
              {step.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// StepperContent 内容容器
// ============================================

export interface StepperContentProps {
  /** 步骤索引 */
  step: number;
  /** 子内容 */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * Step content container
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
  /** 上一步按钮文本 */
  prevLabel?: string;
  /** 下一步按钮文本 */
  nextLabel?: string;
  /** 完成按钮文本 */
  finishLabel?: string;
  /** 完成回调 */
  onFinish?: () => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用下一步 */
  disableNext?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * 步骤导航按钮
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
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {finishLabel || "Finish"}
        </Button>
      ) : (
        <Button type="button" onClick={nextStep} disabled={loading || disableNext}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
  steps: Step[];
  initialStep?: number;
  onComplete?: () => void;
}

/**
 * Step management hook
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
    progress: ((currentStep + 1) / steps.length) * 100,
  };
}

// ============================================
// ProgressStepper 进度条风格
// ============================================

export interface ProgressStepperProps {
  /** 当前步骤 */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 步骤Labels */
  labels?: string[];
  /** Custom className */
  className?: string;
}

/**
 * 进度条风格步骤指示器
 */
export function ProgressStepper({
  currentStep,
  totalSteps,
  labels,
  className,
}: ProgressStepperProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      {/* 进度条 */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {labels.map((label, index) => (
            <span key={index} className={cn(index <= currentStep && "text-primary/90 font-medium")}>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Step count */}
      <p className="text-center text-sm text-muted-foreground">
        步骤 {currentStep + 1} / {totalSteps}
      </p>
    </div>
  );
}
