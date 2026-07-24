"use client";

import { ArrowRight, Box, Lightning, Shield } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * ExecutionPolicyGlyph — policy routing rules list.
 *
 * Renders the rule table that decides which compute provider handles
 * a task. Each row: condition (mono) → action (badge). Footer shows
 * evaluation cadence + latency.
 */

const COPY = {
  en: {
    header: "policy.execution · 4 rules",
    footer: "evaluated per-task · 3ms p50",
  },
  zh: {
    header: "policy.execution · 4 条规则",
    footer: "逐任务评估 · 3ms p50",
  },
} as const;

type Rule = {
  condition: string;
  action: string;
  variant: "blue-subtle" | "gray-subtle" | "teal-subtle";
};

const RULES: readonly Rule[] = [
  {
    condition: 'task.kind === "render"',
    action: "Vercel Sandbox",
    variant: "blue-subtle",
  },
  {
    condition: "task.duration > 5min",
    action: "AWS Lambda",
    variant: "gray-subtle",
  },
  {
    condition: 'task.tenant === "internal"',
    action: "local-runner",
    variant: "teal-subtle",
  },
  {
    condition: "default",
    action: "Vercel Sandbox",
    variant: "blue-subtle",
  },
] as const;

export function ExecutionPolicyGlyph({ locale }: SubpackageGlyphProps) {
  const t = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-md)] bg-muted p-2.5"
      style={{ height: 160 }}
    >
      {/* Header: policy id + rule count */}
      <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground/80">
        <Shield className="h-2.5 w-2.5 text-[hsl(var(--primary))]" aria-hidden="true" />
        <span className="truncate">{t.header}</span>
      </div>

      {/* Rule rows */}
      <div className="flex flex-1 flex-col justify-center gap-1">
        {RULES.map((rule) => (
          <div
            key={rule.condition}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-background px-1.5 py-1"
          >
            <span className="flex-1 truncate font-mono text-[9px] text-foreground/85">
              {rule.condition}
            </span>
            <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Badge variant={rule.variant} size="sm" className="shrink-0 font-mono text-[9px]">
              {rule.action}
            </Badge>
          </div>
        ))}
      </div>

      {/* Footer: evaluation cadence */}
      <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/80">
        <Lightning className="h-2.5 w-2.5" aria-hidden="true" />
        <Box className="h-2.5 w-2.5" aria-hidden="true" />
        <span className="truncate">{t.footer}</span>
      </div>
    </div>
  );
}
