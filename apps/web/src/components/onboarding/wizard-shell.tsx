"use client";

import { safeGetJson, safeRemoveItem, safeSetJson } from "@nebutra/browser-utils";
import { ArrowLeft } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { AUTH_FORM_COLUMN_CLASS, AUTH_PRIMARY_CTA_CLASS } from "@nebutra/ui/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand/brand-assets";
import { LocaleSwitcher } from "@/components/navigation/locale-switcher";

import { CreateWorkspaceStep } from "./create-workspace-step";
import { InviteTeamStep } from "./invite-team-step";
import { ProgressBar, type ProgressBarStep } from "./progress-bar";

export const ONBOARDING_STORAGE_KEY = "nebutra-onboarding-progress";

type StepNumber = 1 | 2 | 3;

interface PersistedState {
  readonly currentStep: StepNumber;
  readonly completedSteps: readonly StepNumber[];
}

function isStepNumber(value: unknown): value is StepNumber {
  return value === 1 || value === 2 || value === 3;
}

function readPersistedState(): PersistedState | null {
  const candidate = safeGetJson<Partial<PersistedState>>(ONBOARDING_STORAGE_KEY);
  if (!candidate || typeof candidate !== "object") return null;
  if (!isStepNumber(candidate.currentStep)) return null;
  if (!Array.isArray(candidate.completedSteps)) return null;
  const completedSteps = candidate.completedSteps.filter(isStepNumber);
  return { currentStep: candidate.currentStep, completedSteps };
}

function writePersistedState(state: PersistedState): void {
  safeSetJson(ONBOARDING_STORAGE_KEY, state);
}

function clearPersistedState(): void {
  safeRemoveItem(ONBOARDING_STORAGE_KEY);
}

export function WizardShell() {
  const router = useRouter();
  const t = useTranslations("onboarding");

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [completedSteps, setCompletedSteps] = useState<ReadonlySet<StepNumber>>(
    () => new Set<StepNumber>(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = readPersistedState();
    if (persisted) {
      setCurrentStep(persisted.currentStep);
      setCompletedSteps(new Set(persisted.completedSteps));
    }
    setHydrated(true);
  }, []);

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
    <div className="relative min-h-svh bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,color-mix(in_srgb,hsl(var(--muted))_80%,transparent),transparent)]"
      />
      <div className="absolute right-5 top-6 z-20 sm:right-8">
        <LocaleSwitcher />
      </div>

      <main
        id="main-content"
        className="relative flex min-h-svh flex-col items-center justify-center px-5 py-20"
      >
        <div className={AUTH_FORM_COLUMN_CLASS}>
          <BrandLogo variant="mark" className="mb-8 h-7" />

          <ProgressBar
            className="mb-8"
            steps={progressSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            ariaLabel={t("progress.ariaLabel")}
          />

          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {t("progress.back")}
            </button>
          )}

          {currentStep === 1 && <CreateWorkspaceStep onComplete={() => handleStepComplete(1)} />}
          {currentStep === 2 && <InviteTeamStep onComplete={() => handleStepComplete(2)} />}
          {currentStep === 3 && (
            <ChoosePlanStep
              onChoose={() => {
                finishOnboarding("/choose-plan");
              }}
              onSkip={() => finishOnboarding("/")}
            />
          )}
        </div>
      </main>
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
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("plan.title")}</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("plan.description")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" variant="ink" onClick={onChoose} className={AUTH_PRIMARY_CTA_CLASS}>
          {t("plan.choose")}
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="h-11 w-full">
          {t("plan.skip")}
        </Button>
      </div>
    </div>
  );
}
