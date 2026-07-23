import { Brain, Lightning, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const METHODS: ReadonlyArray<{
  signature: string;
  icon: typeof Brain;
}> = [
  { signature: "generateText({ model, prompt }) → { text }", icon: Sparkles },
  { signature: "streamText({ model, prompt }) → AsyncIterable", icon: Lightning },
  { signature: "embed({ model, value }) → { embedding }", icon: Brain },
];

const PROVIDERS: ReadonlyArray<string> = ["OpenAI", "Anthropic", "Google", "DeepSeek"];

export function AgentsGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-[var(--radius-md)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">
          @nebutra/agents · unified surface
        </span>
        <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
      </div>

      <ul className="flex flex-col gap-1">
        {METHODS.map(({ signature, icon: Icon }) => (
          <li
            key={signature}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-background px-2 py-1"
          >
            <Icon className="h-2.5 w-2.5 shrink-0 text-[hsl(var(--primary))]" />
            <code className="truncate font-mono text-[10px] text-foreground">{signature}</code>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1">
        {PROVIDERS.map((provider) => (
          <Badge
            key={provider}
            variant="outline"
            className="border-[var(--blue-6)] bg-[var(--blue-3)] px-1.5 py-0 font-mono text-[9px] text-primary"
          >
            {provider}
          </Badge>
        ))}
      </div>

      <div className="font-mono text-[9px] text-muted-foreground">provider-agnostic</div>
    </div>
  );
}
