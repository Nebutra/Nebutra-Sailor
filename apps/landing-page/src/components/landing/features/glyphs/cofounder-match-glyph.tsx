import { Check, Sparkles, Users } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const TRAITS: ReadonlyArray<string> = ["Engineering", "Sales", "NYC", "YC alum"];

export function CofounderMatchGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-md bg-[var(--neutral-2)] px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--neutral-11)]">
          <Users className="h-3 w-3 text-[var(--brand-primary)]" />
          cofounder match
        </span>
        <Badge
          variant="outline"
          className="border-[var(--neutral-7)] bg-[var(--neutral-1)] px-1.5 py-0 font-mono text-[9px] text-[var(--neutral-11)]"
        >
          2,401 candidates
        </Badge>
      </div>

      <div className="flex items-center justify-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--blue-6)] bg-[var(--blue-3)] font-mono text-[11px] font-semibold text-[var(--blue-11)]"
          role="img"
          aria-label="Candidate M"
        >
          M
        </div>
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--brand-primary)] bg-[var(--neutral-1)]">
          <Check className="h-3 w-3 text-[var(--brand-primary)]" />
        </div>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 font-mono text-[11px] font-semibold text-emerald-700"
          role="img"
          aria-label="Candidate K"
        >
          K
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="flex items-center gap-1 text-[var(--neutral-12)]">
            <Sparkles className="h-2.5 w-2.5 text-[var(--brand-primary)]" />
            92% compatibility match
          </span>
        </div>
        <Progress value={92} className="h-1.5" />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {TRAITS.map((trait) => (
          <Badge
            key={trait}
            variant="outline"
            className="border-[var(--blue-6)] bg-[var(--blue-3)] px-1.5 py-0 font-mono text-[9px] text-[var(--blue-11)]"
          >
            {trait}
          </Badge>
        ))}
      </div>

      <div className="font-mono text-[9px] text-[var(--neutral-10)]">
        mutual interest · double-opt-in
      </div>
    </div>
  );
}
