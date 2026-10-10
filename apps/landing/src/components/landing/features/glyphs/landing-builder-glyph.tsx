"use client";

import { Code, Globe, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

// Demo URL and engine line — same on every locale.
const DEMO_URL = "your-site.app";
const BADGE = "v0";
const FOOTER = "v0 · prompt → page · 8s";

type LandingBuilderCopy = { prompts: Record<string, string> };

/**
 * LandingBuilderGlyph
 *
 * Mini AI landing builder preview for @nebutra/landing-builder.
 * Left half renders a tiny "browser frame" with stacked mock blocks
 * (hero, 3-col features grid, pricing). Right half lists three
 * monospace prompt bubbles flowing into the page, capped by a
 * mono footer that names the engine + perf budget.
 */
export function LandingBuilderGlyph({ copy: rawCopy }: SubpackageGlyphProps) {
  const prompts = Object.values((rawCopy as LandingBuilderCopy).prompts);

  return (
    <div
      aria-hidden="true"
      className="flex w-full items-stretch gap-2.5 rounded-[var(--radius-lg)] bg-muted px-3 py-3"
      style={{ height: 160 }}
    >
      {/* Left: browser-frame mockup */}
      <div className="flex w-[44%] shrink-0 flex-col overflow-hidden rounded-[var(--radius-md)] bg-background ring-1 ring-border">
        {/* Browser chrome */}
        <div className="flex items-center gap-1 border-b border-border bg-muted px-1.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <div className="ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-[var(--radius-sm)] bg-background px-1 py-[1px]">
            <Globe className="h-2 w-2 text-muted-foreground" />
            <span className="truncate font-mono text-[7px] text-muted-foreground">{DEMO_URL}</span>
          </div>
        </div>
        {/* Page body */}
        <div className="flex flex-1 flex-col gap-1.5 p-1.5">
          {/* Hero */}
          <div className="space-y-1 rounded-[var(--radius-sm)] bg-muted p-1.5">
            <div className="h-1.5 w-2/3 rounded-[var(--radius-sm)] bg-border" />
            <div className="h-1 w-full rounded-[var(--radius-sm)] bg-muted" />
            <div className="h-1.5 w-7 rounded-[var(--radius-sm)] bg-primary" />
          </div>
          {/* Features grid */}
          <div className="grid grid-cols-3 gap-1">
            <div className="h-5 rounded-[var(--radius-sm)] bg-muted ring-1 ring-border" />
            <div className="h-5 rounded-[var(--radius-sm)] bg-muted ring-1 ring-border" />
            <div className="h-5 rounded-[var(--radius-sm)] bg-muted ring-1 ring-border" />
          </div>
          {/* Pricing */}
          <div className="flex items-center gap-1">
            <div className="h-3 flex-1 rounded-[var(--radius-sm)] bg-muted ring-1 ring-border" />
            <div className="h-3 flex-1 rounded-[var(--radius-sm)] bg-muted ring-1 ring-border" />
          </div>
        </div>
      </div>

      {/* Right: prompt rows + footer */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Code className="h-3 w-3" />
            prompt
          </span>
          <Badge variant="blue-subtle" size="sm" icon={<Sparkles />}>
            {BADGE}
          </Badge>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1">
          {prompts.map((prompt) => (
            <div
              key={prompt}
              className="flex items-center gap-1 rounded-[var(--radius-md)] bg-background px-1.5 py-1 ring-1 ring-border"
            >
              <span className="font-mono text-[9px] text-primary">→</span>
              <span className="truncate font-mono text-[9px] text-foreground">{prompt}</span>
            </div>
          ))}
        </div>
        <p className="truncate font-mono text-[9px] text-muted-foreground">{FOOTER}</p>
      </div>
    </div>
  );
}
