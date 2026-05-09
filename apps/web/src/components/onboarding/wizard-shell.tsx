"use client";

import { Button } from "@nebutra/ui/components";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CreateWorkspaceStep } from "./create-workspace-step";
import { InviteTeamStep } from "./invite-team-step";
import { ProgressBar, type ProgressBarStep } from "./progress-bar";

export const ONBOARDING_STORAGE_KEY = "nebutra-onboarding-progress";

type StepNumber = 1 | 2 | 3;
const STEP_IDS: readonly StepNumber[] = [1, 2, 3] as const;

interface PersistedState {
  readonly currentStep: StepNumber;
  readonly completedSteps: readonly StepNumber[];
}

function isStepNumber(value: unknown): value is StepNumber {
  return value === 1 || value === 2 || value === 3;
}

function readPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<PersistedState>;
    if (!isStepNumber(candidate.currentStep)) return null;
    if (!Array.isArray(candidate.completedSteps)) return null;
    const completedSteps = candidate.completedSteps.filter(isStepNumber);
    return { currentStep: candidate.currentStep, completedSteps };
  } catch {
    return null;
  }
}

function writePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (quota / privacy mode) — silently degrade.
  }
}

function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function WizardShell() {
  const router = useRouter();
  const t = useTranslations("onboarding");

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [completedSteps, setCompletedSteps] = useState<ReadonlySet<StepNumber>>(
    () => new Set<StepNumber>(),
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage AFTER mount to avoid SSR/CSR mismatch.
  useEffect(() => {
    const persisted = readPersistedState();
    if (persisted) {
      setCurrentStep(persisted.currentStep);
      setCompletedSteps(new Set(persisted.completedSteps));
    }
    setHydrated(true);
  }, []);

  // Persist whenever step or completion changes (after first hydrate).
  useEffect(() => {
    if (!hydrated) return;
    writePersistedState({
      currentStep,
      completedSteps: Array.from(completedSteps),
    });
  }, [hydrated, currentStep, completedSteps]);

  const finishOnboarding = useCallback(
    (target: "/" | "/choose-plan") => {
      clearPersistedState();
      router.push(target);
    },
    [router],
  );

  const handleStepComplete = useCallback(
    (stepId: StepNumber) => {
      const nextCompleted = new Set(completedSteps);
      nextCompleted.add(stepId);
      setCompletedSteps(nextCompleted);

      if (stepId < 3) {
        const next = (stepId + 1) as StepNumber;
        setCurrentStep(next);
        return;
      }

      // All three steps complete — go home.
      finishOnboarding("/");
    },
    [completedSteps, finishOnboarding],
  );

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as StepNumber) : prev));
    }
  }, [currentStep]);

  const progressSteps: ProgressBarStep[] = useMemo(
    () => [
      { id: 1, label: t("steps.workspace") },
      { id: 2, label: t("steps.invite") },
      { id: 3, label: t("steps.plan") },
    ],
    [t],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-[var(--neutral-11)]">{t("subtitle")}</p>
        </header>

        <div className="mb-8">
          <ProgressBar
            steps={progressSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        <div className="rounded-[var(--radius-2xl)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-8 shadow-sm">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--neutral-11)] transition-colors hover:text-[var(--neutral-12)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("progress.back")}
            </button>
          )}

          {currentStep === 1 && <CreateWorkspaceStep onComplete={() => handleStepComplete(1)} />}
          {currentStep === 2 && <InviteTeamStep onComplete={() => handleStepComplete(2)} />}
          {currentStep === 3 && (
            <ChoosePlanStep
              onChoose={() => {
                // Marking step 3 complete here is unnecessary because we are
                // navigating away — clear state and route to /choose-plan.
                finishOnboarding("/choose-plan");
              }}
              onSkip={() => finishOnboarding("/")}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-[var(--neutral-11)]">
          {t("progress.stepCounter", {
            current: String(currentStep),
            total: String(STEP_IDS.length),
          })}
        </p>
      </div>
    </div>
  );
}

interface ChoosePlanStepProps {
  readonly onChoose: () => void;
  readonly onSkip: () => void;
}

function ChoosePlanStep({ onChoose, onSkip }: ChoosePlanStepProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--neutral-12)]">
          {t("plan.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">{t("plan.description")}</p>
      </div>

      <Button onClick={onChoose} className="w-full">
        {t("plan.choose")}
      </Button>

      <Button
        htmlType="button"
        variant="text"
        onClick={onSkip}
        className="w-full text-[var(--neutral-11)]"
      >
        {t("plan.skip")}
      </Button>
    </div>
  );
}
