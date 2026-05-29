"use client";

import { Brain, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Segment = {
  key: string;
  label: string;
  cells: number;
  tone: "system" | "history" | "rag" | "prompt" | "buffer";
};

const SEGMENTS: ReadonlyArray<Segment> = [
  { key: "system", label: "system", cells: 4, tone: "system" },
  { key: "history", label: "history", cells: 6, tone: "history" },
  { key: "rag", label: "rag-context", cells: 3, tone: "rag" },
  { key: "prompt", label: "prompt", cells: 1, tone: "prompt" },
  { key: "buffer", label: "buffer", cells: 1, tone: "buffer" },
] as const;

const TONE_BG: Record<Segment["tone"], string> = {
  system: "var(--neutral-9)",
  history: "var(--blue-9)",
  rag: "var(--status-warning)",
  prompt: "var(--status-success)",
  buffer: "var(--status-danger)",
};

export function GenerationContextGlyph(_props: SubpackageGlyphProps) {
  return (
    <div style={{ height: 160 }} className="flex w-full flex-col justify-between gap-3 p-3">
      {/* Header: usage counter + model tag */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5" style={{ color: "var(--brand-primary)" }} />
          <span className="font-mono text-[11px] text-neutral-12 tabular-nums">
            247,401 / 1,000,000 tokens
          </span>
          <span className="font-mono text-[11px] text-neutral-10">· 24.7%</span>
        </div>
        <Badge variant="gray-subtle" className="font-mono text-[10px]">
          claude-sonnet-4-6
        </Badge>
      </div>

      {/* Budget bar — 15 cells, segmented by role */}
      <div className="flex flex-col gap-1.5">
        <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-2 p-[2px]">
          {SEGMENTS.flatMap((seg) =>
            Array.from({ length: seg.cells }, (_, i) => (
              <div
                key={`${seg.key}-${i}`}
                className="h-full flex-1 rounded-[2px]"
                style={{ background: TONE_BG[seg.tone] }}
                title={seg.label}
              />
            )),
          )}
        </div>

        {/* Legend chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SEGMENTS.map((seg) => (
            <div
              key={seg.key}
              className="flex items-center gap-1 rounded-[var(--radius-md)] border border-neutral-6 bg-neutral-2 px-1.5 py-[1px]"
            >
              <span
                className="h-2 w-2 rounded-[1px]"
                style={{ background: TONE_BG[seg.tone] }}
                aria-hidden
              />
              <span className="font-mono text-[10px] text-neutral-11">{seg.label}</span>
              <span className="font-mono text-[10px] text-neutral-9 tabular-nums">
                {seg.cells}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: truncation strategy + latency */}
      <div className="flex items-center justify-between border-neutral-6 border-t pt-2">
        <span className="font-mono text-[10px] text-neutral-10">
          truncation via reciprocal rank
        </span>
        <div className="flex items-center gap-1">
          <Lightning className="h-3 w-3" style={{ color: "var(--brand-accent)" }} />
          <span className="font-mono text-[10px] text-neutral-11 tabular-nums">12ms</span>
        </div>
      </div>
    </div>
  );
}
