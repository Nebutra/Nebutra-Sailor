import { Brain, Cpu } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ModelRow = {
  model: string;
  context: string;
  price: string;
};

const ROWS: ReadonlyArray<ModelRow> = [
  { model: "claude-sonnet-4-6", context: "1M", price: "$3" },
  { model: "gpt-4o", context: "128K", price: "$5" },
  { model: "deepseek-v3", context: "64K", price: "$0.27" },
  { model: "gemini-pro-2.5", context: "2M", price: "$2.5" },
];

export function AiProvidersGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex flex-col gap-1.5 rounded-md bg-[var(--neutral-1)] px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--neutral-11)]">
          <Brain className="h-3 w-3 text-[var(--brand-primary)]" />
          <span>Provider Matrix</span>
        </div>
        <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[9px] font-medium">
          <Cpu className="h-2.5 w-2.5" />
          12 providers · 41 models
        </Badge>
      </div>

      <div className="flex-1 overflow-hidden rounded-sm border border-[var(--neutral-6)]">
        <div className="grid grid-cols-[1fr_50px_56px] items-center gap-2 border-b border-[var(--neutral-6)] bg-[var(--neutral-2)] px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-[var(--neutral-10)]">
          <span>Model</span>
          <span className="text-right">Context</span>
          <span className="text-right">$/1M tok</span>
        </div>
        {ROWS.map((row, i) => (
          <div
            key={row.model}
            className={`grid grid-cols-[1fr_50px_56px] items-center gap-2 px-2 py-1 text-[10px] ${
              i < ROWS.length - 1 ? "border-b border-[var(--neutral-5)]" : ""
            }`}
          >
            <span className="truncate font-mono text-[var(--neutral-12)]">{row.model}</span>
            <span className="text-right font-mono text-[var(--neutral-11)]">{row.context}</span>
            <span className="text-right font-mono font-medium text-[var(--brand-primary)]">
              {row.price}
            </span>
          </div>
        ))}
      </div>

      <div className="font-mono text-[9px] text-[var(--neutral-10)]">
        metadata only · runtime via @nebutra/agents
      </div>
    </div>
  );
}
