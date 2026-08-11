"use client";

import { Box, Check, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const LINES: ReadonlyArray<{ kind: "cmd" | "ok" | "ready"; text: string }> = [
  { kind: "cmd", text: "$ npx create-sailor my-saas" },
  { kind: "ok", text: "Cloning template" },
  { kind: "ok", text: "Installing deps (pnpm · 47s)" },
  { kind: "ok", text: "Setting up environment" },
  { kind: "ok", text: "Running db migrations" },
  { kind: "ready", text: "Ready in 12.3s." },
];

const TIERS: ReadonlyArray<{ label: string; active: boolean }> = [
  { label: "Indie", active: false },
  { label: "Pro", active: true },
  { label: "Enterprise", active: false },
];

export function CreateSailorGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[oklch(0.16_0.012_250)]"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-white/40">
          <Box className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-wider">scaffold</span>
        </div>
        <Badge
          variant="outline"
          className="h-5 border-white/10 px-1.5 font-mono text-[10px] text-white/60"
        >
          create-sailor
        </Badge>
      </div>

      {/* Session body */}
      <div className="flex flex-col gap-0.5 px-3 py-1.5 font-mono text-[10.5px] leading-[1.3]">
        {LINES.map((line, i) => {
          if (line.kind === "cmd") {
            return (
              <div key={i} className="truncate text-muted-foreground/90">
                {line.text}
              </div>
            );
          }
          if (line.kind === "ok") {
            return (
              <div key={i} className="flex items-center gap-1.5 truncate">
                <Check className="h-3 w-3 shrink-0 text-success" />
                <span className="truncate text-muted-foreground">{line.text}</span>
              </div>
            );
          }
          return (
            <div key={i} className="mt-0.5 flex items-center gap-1.5 truncate">
              <Sparkles className="h-3 w-3 shrink-0 text-[var(--brand-accent)]" />
              <span className="truncate font-semibold text-white/90">{line.text}</span>
            </div>
          );
        })}
      </div>

      {/* Tier chips row */}
      <div className="absolute inset-x-3 bottom-2 flex items-center gap-1.5">
        {TIERS.map((tier) =>
          tier.active ? (
            <Badge key={tier.label} variant="blue" className="h-5 px-1.5 font-mono text-[10px]">
              {tier.label}
            </Badge>
          ) : (
            <Badge
              key={tier.label}
              variant="outline"
              className="h-5 border-white/10 px-1.5 font-mono text-[10px] text-white/50"
            >
              {tier.label}
            </Badge>
          ),
        )}
      </div>
    </div>
  );
}
