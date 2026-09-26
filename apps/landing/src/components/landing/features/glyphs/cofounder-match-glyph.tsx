import { Check, Sparkles, Users } from "@nebutra/icons";
import { Badge, Progress } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const TRAITS: ReadonlyArray<string> = ["Engineering", "Sales", "NYC", "YC alum"];

export function CofounderMatchGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-[var(--radius-md)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 text-primary" />
          cofounder match
        </span>
        <Badge
          variant="outline"
          className="border-border bg-background px-1.5 py-0 font-mono text-[9px] text-muted-foreground"
        >
          2,401 candidates
        </Badge>
      </div>

      <div className="flex items-center justify-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-6 bg-blue-3 font-mono text-[11px] font-semibold text-primary"
          role="img"
          aria-label="Candidate M"
        >
          M
        </div>
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-background">
          <Check className="h-3 w-3 text-primary" />
        </div>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border border-success/40 bg-success/15 font-mono text-[11px] font-semibold text-success-strong"
          role="img"
          aria-label="Candidate K"
        >
          K
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="flex items-center gap-1 text-foreground">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
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
            className="border-blue-6 bg-blue-3 px-1.5 py-0 font-mono text-[9px] text-primary"
          >
            {trait}
          </Badge>
        ))}
      </div>

      <div className="font-mono text-[9px] text-muted-foreground">
        mutual interest · double-opt-in
      </div>
    </div>
  );
}
