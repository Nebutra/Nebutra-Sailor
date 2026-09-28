"use client";

import { brand } from "@nebutra/brand/metadata";
import { LogoGithub, LogoSlack, Workflow } from "@nebutra/icons";
import { AnimatedBeam } from "@nebutra/ui/primitives";
import type * as React from "react";
import { useRef } from "react";

function FlowNode({
  ref,
  icon,
  label,
  detail,
}: {
  ref: React.Ref<HTMLDivElement>;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div
      ref={ref}
      className="relative z-10 flex min-w-28 flex-col items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-center shadow-sm"
    >
      <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-foreground">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[260px] w-full max-w-2xl items-center justify-between overflow-hidden rounded-lg border border-border bg-background bg-[radial-gradient(circle_at_50%_0%,var(--blue-2),transparent_42%)] p-8"
    >
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--border)),transparent)]" />
      <FlowNode
        ref={fromRef}
        icon={<LogoGithub className="size-4" />}
        label="GitHub"
        detail="PR opened"
      />
      <FlowNode
        ref={centerRef}
        icon={<Workflow className="size-4 text-[hsl(var(--primary))]" />}
        label={brand.name}
        detail="Policy run"
      />
      <FlowNode
        ref={toRef}
        icon={<LogoSlack className="size-4" />}
        label="Slack"
        detail="Alert sent"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={fromRef}
        toRef={centerRef}
        curvature={-28}
        tone="brand"
        intensity="normal"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={toRef}
        curvature={28}
        tone="success"
        intensity="subtle"
        delay={0.8}
      />
    </div>
  );
}
