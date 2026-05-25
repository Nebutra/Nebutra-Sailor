"use client";

import { Brain, Check, Lightning, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    header: "agent.run · claude-sonnet-4-6",
    footer: "durable · resumable on crash",
  },
  zh: {
    header: "agent.run · claude-sonnet-4-6",
    footer: "持久 · 崩溃可恢复",
  },
} as const;

type Step = {
  label: string;
  ms: string;
  tone: "blue-subtle" | "amber-subtle" | "green-subtle";
  done: boolean;
};

const STEPS: readonly Step[] = [
  { label: "· model.think", ms: "412ms", tone: "blue-subtle", done: false },
  { label: '· tool.call("search")', ms: "188ms", tone: "amber-subtle", done: false },
  { label: "· tool.result", ms: "12ms", tone: "green-subtle", done: true },
  { label: "· model.respond", ms: "244ms", tone: "blue-subtle", done: false },
  { label: "· turn.commit", ms: "8ms", tone: "green-subtle", done: true },
] as const;

export function AgentRuntimeGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-1.5 rounded-lg bg-[var(--neutral-1)] p-3 ring-1 ring-[var(--neutral-6)] shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--neutral-11)]">
            <Brain className="h-2.5 w-2.5" />
            {copy.header}
          </span>
          <Sparkles className="h-2.5 w-2.5 text-[var(--blue-9)]" />
        </div>

        {/* Trace steps */}
        <div className="flex flex-col gap-1">
          {STEPS.map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              <Badge variant={step.tone} size="sm" className="gap-0.5 flex-shrink-0">
                {step.done ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{
                      background:
                        step.tone === "blue-subtle"
                          ? "var(--blue-9)"
                          : step.tone === "amber-subtle"
                            ? "var(--amber-9)"
                            : "var(--green-9)",
                    }}
                  />
                )}
                <span className="font-mono text-[9px]">{step.label}</span>
              </Badge>
              <span className="flex-1 border-t border-dashed border-[var(--neutral-6)]" />
              <span
                className="flex-shrink-0 font-mono text-[9px] text-[var(--neutral-10)]"
                style={{ width: 40, textAlign: "right" }}
              >
                {step.ms}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--neutral-10)]">
            <Lightning className="h-2.5 w-2.5" />
            {copy.footer}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
        </div>
      </div>
    </div>
  );
}
