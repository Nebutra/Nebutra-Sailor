import { Box, Brain, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Category = {
  label: string;
  icon: typeof Box;
  providers: string[];
};

const CATEGORIES: Category[] = [
  { label: "Models", icon: Brain, providers: ["OpenAI", "Anthropic", "Google"] },
  { label: "Embeddings", icon: Sparkles, providers: ["Cohere", "Voyage", "local"] },
  { label: "Vision", icon: Box, providers: ["OpenAI", "Anthropic"] },
  { label: "Voice", icon: Sparkles, providers: ["ElevenLabs", "OpenAI", "Azure"] },
];

export function ProviderRegistryGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-md)] bg-[var(--neutral-2)] px-3 py-2"
      style={{ height: 160 }}
    >
      <div className="font-mono text-[9px] tracking-tight text-[var(--neutral-10)]">
        registry · 24 providers · 8 categories
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.label} className="flex items-center gap-1.5">
              <Icon className="h-2.5 w-2.5 shrink-0 text-[var(--neutral-11)]" />
              <span className="w-[58px] shrink-0 font-mono text-[9px] text-[var(--neutral-11)]">
                {cat.label}:
              </span>
              <div className="flex flex-wrap items-center gap-0.5">
                {cat.providers.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="h-4 rounded-[var(--radius-sm)] border-[var(--neutral-6)] px-1 font-mono text-[8px] font-normal text-[var(--neutral-12)]"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="font-mono text-[9px] tracking-tight text-[var(--neutral-10)]">
        typed metadata · zero runtime
      </div>
    </div>
  );
}
