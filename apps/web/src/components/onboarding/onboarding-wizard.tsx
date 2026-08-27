"use client";

import { cn } from "@nebutra/ui/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConnectIntegrationsStep } from "./connect-integrations-step";
import { CreateWorkspaceStep } from "./create-workspace-step";
import { InviteTeamStep } from "./invite-team-step";
import { ProfileSetupStep } from "./profile-setup-step";

const STEPS = [
  { label: "Workspace" },
  { label: "Profile" },
  { label: "Team" },
  { label: "Integrations" },
] as const;

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  i < currentStep
                    ? "bg-primary text-primary-foreground"
                    : i === currentStep
                      ? "border-2 border-primary text-primary"
                      : "border border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {i < currentStep ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  i === currentStep ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px w-8",
                    i < currentStep ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-[var(--radius-2xl)] border border-border bg-card p-8 shadow-sm">
          {currentStep === 0 && <CreateWorkspaceStep onComplete={() => setCurrentStep(1)} />}
          {currentStep === 1 && <ProfileSetupStep onComplete={() => setCurrentStep(2)} />}
          {currentStep === 2 && <InviteTeamStep onComplete={() => setCurrentStep(3)} />}
          {currentStep === 3 && <ConnectIntegrationsStep onComplete={() => router.push("/")} />}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
