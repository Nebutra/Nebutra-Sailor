"use client";

import { Pause, Play, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * TtsGlyph
 *
 * Mini text-to-speech voice player card. Shows the source script line in
 * mono, a 24-bar horizontal waveform (first 12 bars "played" in primary,
 * remaining 12 muted), a play/pause control, and a voice / duration row.
 */

const TOTAL_BARS = 24;
const PLAYED_BARS = 12;

// Deterministic sine-like heights (px) — 4px min, 24px max.
const BAR_HEIGHTS: readonly number[] = Array.from({ length: TOTAL_BARS }, (_, i) => {
  const phase = (i / TOTAL_BARS) * Math.PI * 2;
  const normalized = (Math.sin(phase) + 1) / 2; // 0..1
  return Math.round(4 + normalized * 20); // 4..24
});

export function TtsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2.5 rounded-[var(--radius-lg)] bg-muted px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Script line */}
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground"
        >
          <Sparkles className="h-3 w-3" />
        </span>
        <p className="font-mono text-[11px] leading-snug text-foreground">
          &ldquo;Welcome to Nebutra. Let me show you around.&rdquo;
        </p>
      </div>

      {/* Waveform */}
      <div aria-hidden="true" className="flex h-7 items-center justify-between gap-[2px]">
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={`bar-${i}-${h}`}
            className={
              i < PLAYED_BARS
                ? "w-[3px] rounded-full bg-primary/60"
                : "w-[3px] rounded-full bg-muted-foreground/30"
            }
            style={{ height: h }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Play voice preview"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
          >
            <Play className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Pause voice preview"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <Pause className="h-3 w-3" />
          </button>
          <span className="font-mono text-[10px] text-muted-foreground">0:08 / 0:14</span>
        </div>
        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
          Aria &middot; ElevenLabs
        </Badge>
      </div>
    </div>
  );
}
