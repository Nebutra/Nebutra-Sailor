"use client";

import {
  Stepper,
  StepperContent,
  StepperNavigation,
  StepperProvider,
} from "@nebutra/ui/primitives";

const STEPS = [
  { id: "workspace", title: "Workspace", description: "Name and URL" },
  { id: "team", title: "Team", description: "Invite people" },
  { id: "plan", title: "Plan", description: "Pick a tier" },
];

export function StepperDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-6 p-6">
      <StepperProvider steps={STEPS}>
        <Stepper />
        <StepperContent step={0}>
          <p className="text-muted-foreground text-sm">Choose a name your team will recognise.</p>
        </StepperContent>
        <StepperContent step={1}>
          <p className="text-muted-foreground text-sm">
            Invite teammates by email; they join as members.
          </p>
        </StepperContent>
        <StepperContent step={2}>
          <p className="text-muted-foreground text-sm">Start on Pro; change plans any time.</p>
        </StepperContent>
        <StepperNavigation />
      </StepperProvider>
    </div>
  );
}
