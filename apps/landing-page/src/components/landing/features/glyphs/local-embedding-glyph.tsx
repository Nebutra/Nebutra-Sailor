import { Brain, LockClosed, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

// 24 deterministic bar heights (px, max 44) — mock 384-dim vector projection.
const BAR_HEIGHTS = [
  12, 28, 18, 36, 22, 14, 40, 24, 30, 16, 34, 20, 26, 38, 10, 32, 22, 18, 28, 14, 36, 20, 24, 30,
] as const;

// Alternating accent pattern: primary vs muted neutral.
function barColor(i: number): string {
  // Roughly every 3rd bar is primary; rest are muted neutrals.
  if (i % 3 === 0) return "var(--brand-primary)";
  if (i % 2 === 0) return "var(--neutral-9)";
  return "var(--neutral-7)";
}

export function LocalEmbeddingGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-md bg-neutral-2 px-3 pb-2 pt-2.5"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2 z-10">
        <Badge variant="green-subtle" size="sm">
          offline
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-10">
        <Sparkles size={10} className="shrink-0 text-neutral-9" />
        <span className="truncate">local · sentence-transformers/all-MiniLM-L6-v2</span>
      </div>

      <div
        className="mt-3 flex h-[52px] items-end justify-between gap-[2px] rounded-sm bg-neutral-1 px-2 py-1.5"
        aria-hidden
      >
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={`bar-${i}-${h}`}
            className="w-[5px] shrink-0 rounded-[1px]"
            style={{ height: h, background: barColor(i) }}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-1 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 text-neutral-11">
          <Brain size={11} className="shrink-0 text-neutral-9" />
          <span>12ms per chunk</span>
          <span className="text-neutral-8">·</span>
          <span className="text-neutral-10">CPU only</span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-11">
          <LockClosed size={11} className="shrink-0 text-neutral-9" />
          <span>zero egress</span>
          <span className="text-neutral-8">·</span>
          <span className="text-neutral-10">privacy preserved</span>
        </div>
      </div>
    </div>
  );
}
