"use client";

import { Code, Globe, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    url: "your-site.app",
    prompts: ['"B2B SaaS for ops teams"', '"Hero · 3-col features · CTA"', '"Match nebutra brand"'],
    badge: "v0",
    footer: "v0 · prompt → page · 8s",
  },
  zh: {
    url: "your-site.app",
    prompts: ['"面向运营团队的 B2B SaaS"', '"Hero · 3 列特性 · CTA"', '"匹配 nebutra 品牌"'],
    badge: "v0",
    footer: "v0 · prompt → page · 8s",
  },
} as const;

/**
 * LandingBuilderGlyph
 *
 * Mini AI landing-page builder preview for @nebutra/landing-builder.
 * Left half renders a tiny "browser frame" with stacked mock blocks
 * (hero, 3-col features grid, pricing). Right half lists three
 * monospace prompt bubbles flowing into the page, capped by a
 * mono footer that names the engine + perf budget.
 */
export function LandingBuilderGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div
      aria-hidden="true"
      className="flex w-full items-stretch gap-2.5 rounded-[var(--radius-lg)] bg-[var(--neutral-2)] px-3 py-3"
      style={{ height: 160 }}
    >
      {/* Left: browser-frame mockup */}
      <div className="flex w-[44%] shrink-0 flex-col overflow-hidden rounded-[var(--radius-md)] bg-[var(--neutral-1)] ring-1 ring-[var(--neutral-6)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-1 border-b border-[var(--neutral-6)] bg-[var(--neutral-2)] px-1.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neutral-7)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neutral-7)]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neutral-7)]" />
          <div className="ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--neutral-1)] px-1 py-[1px]">
            <Globe className="h-2 w-2 text-[var(--neutral-10)]" />
            <span className="truncate font-mono text-[7px] text-[var(--neutral-10)]">
              {copy.url}
            </span>
          </div>
        </div>
        {/* Page body */}
        <div className="flex flex-1 flex-col gap-1.5 p-1.5">
          {/* Hero */}
          <div className="space-y-1 rounded-[var(--radius-sm)] bg-[var(--neutral-2)] p-1.5">
            <div className="h-1.5 w-2/3 rounded-[var(--radius-sm)] bg-[var(--neutral-7)]" />
            <div className="h-1 w-full rounded-[var(--radius-sm)] bg-[var(--neutral-5)]" />
            <div className="h-1.5 w-7 rounded-[var(--radius-sm)] bg-[var(--brand-primary)]" />
          </div>
          {/* Features grid */}
          <div className="grid grid-cols-3 gap-1">
            <div className="h-5 rounded-[var(--radius-sm)] bg-[var(--neutral-3)] ring-1 ring-[var(--neutral-6)]" />
            <div className="h-5 rounded-[var(--radius-sm)] bg-[var(--neutral-3)] ring-1 ring-[var(--neutral-6)]" />
            <div className="h-5 rounded-[var(--radius-sm)] bg-[var(--neutral-3)] ring-1 ring-[var(--neutral-6)]" />
          </div>
          {/* Pricing */}
          <div className="flex items-center gap-1">
            <div className="h-3 flex-1 rounded-[var(--radius-sm)] bg-[var(--neutral-3)] ring-1 ring-[var(--neutral-6)]" />
            <div className="h-3 flex-1 rounded-[var(--radius-sm)] bg-[var(--neutral-3)] ring-1 ring-[var(--neutral-6)]" />
          </div>
        </div>
      </div>

      {/* Right: prompt rows + footer */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--neutral-11)]">
            <Code className="h-3 w-3" />
            prompt
          </span>
          <Badge variant="blue-subtle" size="sm" icon={<Sparkles />}>
            {copy.badge}
          </Badge>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1">
          {copy.prompts.map((prompt) => (
            <div
              key={prompt}
              className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--neutral-1)] px-1.5 py-1 ring-1 ring-[var(--neutral-6)]"
            >
              <span className="font-mono text-[9px] text-[var(--brand-primary)]">→</span>
              <span className="truncate font-mono text-[9px] text-[var(--neutral-12)]">
                {prompt}
              </span>
            </div>
          ))}
        </div>
        <p className="truncate font-mono text-[9px] text-[var(--neutral-10)]">{copy.footer}</p>
      </div>
    </div>
  );
}
