"use client";

import { Box, Check, Clock, Play } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type StepState = "done" | "running" | "pending";

type Step = {
  label: string;
  duration: string;
  state: StepState;
};

const STEPS: Step[] = [
  { label: "setup-database", duration: "12s", state: "done" },
  { label: "import-team", duration: "4s", state: "done" },
  { label: "seed-content", duration: "8s (running)", state: "running" },
  { label: "notify-admin", duration: "", state: "pending" },
];

export function PlayLoaderGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3 font-mono text-[10px] leading-tight"
      style={{ height: 160 }}
    >
      {/* Header: playbook identity */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Play className="h-3 w-3 text-[hsl(var(--primary))]" />
        <span className="truncate">
          playbook
          <span className="mx-1 text-muted-foreground">·</span>
          <span className="text-foreground">onboarding-saas-v2</span>
          <span className="mx-1 text-muted-foreground">·</span>
          <span className="text-muted-foreground">v1.4.2</span>
        </span>
      </div>

      {/* Step rows */}
      <div className="flex flex-1 flex-col gap-1">
        {STEPS.map((step) => (
          <StepRow key={step.label} step={step} />
        ))}
      </div>

      {/* Footer: hot-reload safety */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Box className="h-2.5 w-2.5" />
          hot-reload
          <span className="text-muted-foreground">·</span>
          sandbox-safe
        </span>
        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-mono">
          live
        </Badge>
      </div>

      {/* Subtle progress underline for "running" feel */}
      <Progress value={62} className="h-0.5 w-full bg-muted" aria-label="Playbook progress" />
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  if (step.state === "done") {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-[var(--status-success)]/15 text-[var(--status-success)]">
          <Check className="h-2 w-2" />
        </span>
        <span className="truncate text-foreground">{step.label}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{step.duration}</span>
      </div>
    );
  }

  if (step.state === "running") {
    return (
      <div className="flex items-center gap-1.5 text-[hsl(var(--primary))]">
        <span className="inline-flex h-3 w-3 items-center justify-center">
          <Clock className="h-2.5 w-2.5 animate-spin" />
        </span>
        <span className="truncate font-medium">{step.label}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-[hsl(var(--primary))]">{step.duration}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block h-3 w-3 rounded-full border border-dashed border-border" />
      <span className="truncate">{step.label}</span>
      <span className="ml-auto text-muted-foreground">pending</span>
    </div>
  );
}
