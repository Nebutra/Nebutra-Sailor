import { BlendMode, Image, Play } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const FRAMES: ReadonlyArray<{ tint: string; label: string }> = [
  { tint: "var(--blue-3)", label: "intro" },
  { tint: "var(--cyan-3)", label: "b-roll" },
  { tint: "var(--blue-4)", label: "interview" },
  { tint: "var(--cyan-4)", label: "cuts" },
  { tint: "var(--blue-5)", label: "titles" },
  { tint: "var(--cyan-5)", label: "outro" },
];

export function CinemaGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md bg-[var(--neutral-1)] p-3"
      style={{ height: 160 }}
    >
      {/* Clip-name row */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--neutral-11)]">
        <Image className="h-3 w-3 shrink-0" aria-hidden />
        <div className="flex flex-1 items-center gap-1 overflow-hidden">
          {FRAMES.map((f, i) => (
            <span key={f.label} className="truncate" style={{ width: 24, flexShrink: 0 }}>
              {f.label}
              {i < FRAMES.length - 1 ? " ·" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Film strip — 6 frame cells */}
      <div className="flex items-center gap-0.5 rounded-sm bg-[var(--neutral-12)] p-1">
        {/* Left sprocket column */}
        <div className="flex h-10 flex-col justify-between py-0.5">
          {[0, 1, 2].map((i) => (
            <span key={`l-${i}`} className="block h-1 w-1 rounded-[1px] bg-[var(--neutral-1)]" />
          ))}
        </div>
        {FRAMES.map((f) => (
          <div
            key={f.label}
            className="h-10 rounded-[2px]"
            style={{ width: 24, background: f.tint }}
          />
        ))}
        {/* Right sprocket column */}
        <div className="flex h-10 flex-col justify-between py-0.5">
          {[0, 1, 2].map((i) => (
            <span key={`r-${i}`} className="block h-1 w-1 rounded-[1px] bg-[var(--neutral-1)]" />
          ))}
        </div>
      </div>

      {/* Playback bar */}
      <div className="flex items-center gap-2">
        <Play className="h-3 w-3 shrink-0 text-[var(--neutral-12)]" aria-hidden />
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[var(--neutral-4)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: "49%", background: "var(--brand-gradient)" }}
          />
        </div>
        <span className="font-mono text-[10px] text-[var(--neutral-11)]">2:14 / 4:32</span>
      </div>

      {/* Badge */}
      <div className="flex items-center justify-start">
        <Badge variant="outline" className="gap-1 text-[10px]">
          <BlendMode className="h-3 w-3" aria-hidden />
          Remotion · 4K · HDR
        </Badge>
      </div>

      {/* Footer */}
      <div className="mt-auto font-mono text-[10px] text-[var(--neutral-10)]">
        48 transitions · grading LUT
      </div>
    </div>
  );
}
