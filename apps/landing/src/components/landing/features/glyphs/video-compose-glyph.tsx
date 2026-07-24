"use client";

import { Play } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * VideoComposeGlyph
 *
 * Mini video editor timeline. A 16:9 preview frame on the left, three
 * stacked timeline tracks (video / audio / captions) on the right, a
 * playhead with mono timestamp, and a "Remotion · 1080p" pill chip.
 */

type Segment = {
  /** Width as percent of the track row. */
  width: number;
  /** Background CSS variable / color. */
  bg: string;
};

const VIDEO_SEGMENTS: ReadonlyArray<Segment> = [
  { width: 30, bg: "hsl(var(--primary))" },
  { width: 45, bg: "var(--blue-8)" },
  { width: 25, bg: "var(--blue-7)" },
];

const AUDIO_SEGMENTS: ReadonlyArray<Segment> = [
  { width: 55, bg: "var(--status-success)" },
  { width: 45, bg: "color-mix(in oklab, var(--status-success) 65%, transparent)" },
];

const CAPTION_SEGMENTS: ReadonlyArray<Segment> = [
  { width: 22, bg: "hsl(var(--border))" },
  { width: 28, bg: "hsl(var(--border))" },
  { width: 18, bg: "hsl(var(--border))" },
  { width: 32, bg: "hsl(var(--border))" },
];

function TimelineTrack({ segments }: { segments: ReadonlyArray<Segment> }) {
  return (
    <div className="flex h-2.5 w-full items-center gap-[2px] rounded-[var(--radius-sm)] bg-muted px-[2px]">
      {segments.map((seg, i) => (
        <span
          key={i}
          className="h-1.5 rounded-[2px]"
          style={{ width: `${seg.width}%`, background: seg.bg }}
        />
      ))}
    </div>
  );
}

export function VideoComposeGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2.5 rounded-[var(--radius-lg)] bg-muted px-4 py-3"
      style={{ height: 160 }}
    >
      {/* Top: preview frame + three tracks */}
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-background text-muted-foreground"
          style={{ width: 80, height: 45 }}
        >
          <Play className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
          <TimelineTrack segments={VIDEO_SEGMENTS} />
          <TimelineTrack segments={AUDIO_SEGMENTS} />
          <TimelineTrack segments={CAPTION_SEGMENTS} />
        </div>
      </div>

      {/* Playhead line */}
      <div className="relative h-px w-full bg-[hsl(var(--border))]">
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-[hsl(var(--primary))]"
          style={{ left: "38%" }}
        />
      </div>

      {/* Bottom: timestamp + pill */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">0:08 / 0:42</span>
        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
          Remotion &middot; 1080p
        </Badge>
      </div>
    </div>
  );
}
