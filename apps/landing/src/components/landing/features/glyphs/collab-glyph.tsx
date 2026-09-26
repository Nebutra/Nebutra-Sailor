"use client";

import { Connection, Users } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

/**
 * CollabGlyph
 *
 * Mini live-collab presence card for the @nebutra/collab sub-package.
 * Shows a "Live · 3 collaborators" header with pulsing dot, a stack of
 * overlapping initial avatars, two floating ghost cursors with name
 * labels, and a "Liveblocks · websocket" mono badge footer.
 */

type Collaborator = {
  initial: string;
  /** Tailwind background class for the solid avatar dot. */
  bg: string;
  /** Tailwind classes for the tinted avatar chip (bg + ink). */
  chip: string;
};

const COLLABORATORS: ReadonlyArray<Collaborator> = [
  { initial: "M", bg: "bg-chart-1", chip: "bg-chart-1/15 text-chart-1" },
  { initial: "K", bg: "bg-chart-3", chip: "bg-chart-3/15 text-chart-3" },
  { initial: "J", bg: "bg-warning", chip: "bg-warning/15 text-warning-strong" },
];

type GhostCursor = {
  name: string;
  /** Tailwind background class for the cursor dot (solid). */
  bg: string;
  /** Tailwind classes for the name label (tint + ink). */
  chip: string;
  /** Absolute position offset from container. */
  style: React.CSSProperties;
};

const GHOST_CURSORS: ReadonlyArray<GhostCursor> = [
  {
    name: "Mira",
    bg: "bg-chart-1",
    chip: "bg-chart-1/15 text-chart-1",
    style: { left: "14%", top: "8%" },
  },
  {
    name: "Kenji",
    bg: "bg-chart-3",
    chip: "bg-chart-3/15 text-chart-3",
    style: { right: "12%", top: "30%" },
  },
];

export function CollabGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="relative flex w-full flex-col justify-between gap-2 overflow-hidden rounded-[var(--radius-lg)] bg-muted px-3 py-3"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusDot state="READY" decorative titlePrefix="Live session" />
          <span className="text-[11px] font-medium text-foreground">Live</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users />3 collaborators
          </span>
        </div>
      </div>

      {/* Avatar stack */}
      <div className="z-10 flex items-center -space-x-2">
        {COLLABORATORS.map((c) => (
          <div
            key={c.initial}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[11px] font-semibold ${c.chip}`}
          >
            {c.initial}
          </div>
        ))}
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-foreground text-[10px] font-semibold text-background">
          +1
        </div>
      </div>

      {/* Ghost cursor labels (absolute, decorative) */}
      {GHOST_CURSORS.map((g) => (
        <div
          key={g.name}
          className="pointer-events-none absolute flex items-center gap-1"
          style={g.style}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${g.bg}`} />
          <span className={`rounded-[var(--radius-sm)] px-1 py-px font-mono text-[9px] ${g.chip}`}>
            {g.name}
          </span>
        </div>
      ))}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Badge variant="gray-subtle" size="sm" className="font-mono text-[10px] tracking-tight">
          <Connection />
          Liveblocks · websocket
        </Badge>
      </div>
    </div>
  );
}
