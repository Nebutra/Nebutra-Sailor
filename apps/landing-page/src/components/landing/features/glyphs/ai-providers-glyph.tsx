import { Brain, Cpu } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
// Rows are derived from the live model catalog (models.dev + OpenRouter) — never
// hand-typed. Refresh with `pnpm --filter @nebutra/landing-page gen:ai-showcase`.
import { AI_SHOWCASE_PROVIDER_COUNT, AI_SHOWCASE_ROWS } from "./ai-showcase.generated";
import type { SubpackageGlyphProps } from "./types";

const ROWS = AI_SHOWCASE_ROWS;

export function AiProvidersGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-background px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Brain className="h-3 w-3 text-[hsl(var(--primary))]" />
          <span>Provider Matrix</span>
        </div>
        <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[9px] font-medium">
          <Cpu className="h-2.5 w-2.5" />
          {AI_SHOWCASE_PROVIDER_COUNT} providers · live catalog
        </Badge>
      </div>

      <div className="flex-1 overflow-hidden rounded-[var(--radius-sm)] border border-border">
        <div className="grid grid-cols-[1fr_50px_56px] items-center gap-2 border-b border-border bg-muted px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Model</span>
          <span className="text-right">Context</span>
          <span className="text-right">$/1M tok</span>
        </div>
        {ROWS.map((row, i) => (
          <div
            key={row.model}
            className={`grid grid-cols-[1fr_50px_56px] items-center gap-2 px-2 py-1 text-[10px] ${
              i < ROWS.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="truncate font-mono text-foreground">{row.model}</span>
            <span className="text-right font-mono text-muted-foreground">{row.context}</span>
            <span className="text-right font-mono font-medium text-[hsl(var(--primary))]">
              {row.price}
            </span>
          </div>
        ))}
      </div>

      <div className="font-mono text-[9px] text-muted-foreground">
        metadata only · runtime via @nebutra/agents
      </div>
    </div>
  );
}
