import { ArrowRight, Clock, RefreshClockwise } from "@nebutra/icons";
import { Badge, Button } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const MARKERS = [
  { label: "5m", active: false },
  { label: "18m", active: false },
  { label: "1h", active: false },
  { label: "4h", active: true },
  { label: "1d", active: false },
  { label: "3d", active: false },
  { label: "1w", active: false },
  { label: "2w", active: false },
] as const;

export function TimeMachineGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex flex-col gap-2.5 rounded-[var(--radius-lg)] bg-neutral-2/40 p-3"
      style={{ height: 160 }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-11">
          <Clock className="h-3 w-3 text-neutral-10" />
          <span>time-machine</span>
          <span className="text-neutral-9">·</span>
          <span>247 versions</span>
          <span className="text-neutral-9">·</span>
          <span>replay any</span>
        </div>
        <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[10px]">
          <RefreshClockwise className="h-3 w-3" />
          Rewind
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative flex-1 px-1">
        <div className="absolute top-1/2 right-1 left-1 h-px -translate-y-1/2 bg-neutral-7" />
        <div className="relative grid h-full grid-cols-8 items-center">
          {MARKERS.map((marker) => (
            <div key={marker.label} className="relative flex flex-col items-center gap-1">
              {marker.active ? (
                <div className="relative flex h-4 w-4 items-center justify-center">
                  <div className="absolute inset-0 rounded-full ring-2 ring-[var(--brand-primary)] ring-offset-1 ring-offset-[var(--neutral-1)]" />
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--brand-primary)" }}
                  />
                </div>
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-neutral-8" />
              )}
              <span
                className={`font-mono text-[9px] ${
                  marker.active ? "font-semibold text-[var(--brand-primary)]" : "text-neutral-10"
                }`}
              >
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active label */}
      <div className="flex items-center justify-center">
        <Badge
          variant="outline"
          className="h-5 gap-1 border-[var(--brand-primary)]/40 px-1.5 font-mono text-[9px] text-[var(--brand-primary)]"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--brand-primary)" }}
          />
          active · 4h ago
        </Badge>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center font-mono text-[9px] text-neutral-10">
        point-in-time recovery · CRDT-safe
      </div>
    </div>
  );
}
