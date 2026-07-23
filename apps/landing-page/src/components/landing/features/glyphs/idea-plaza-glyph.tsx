import { ChartTrendingUp, Sparkles, Users } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Idea = {
  title: string;
  votes: number;
  comments: number;
};

const IDEAS: ReadonlyArray<Idea> = [
  { title: "AI-native dataroom", votes: 84, comments: 12 },
  { title: "LLM observability", votes: 42, comments: 8 },
  { title: "Edge embeddings store", votes: 28, comments: 4 },
];

export function IdeaPlazaGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] bg-muted p-3"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
          <span>idea-plaza</span>
          <span className="text-muted-foreground">·</span>
          <span>1,247 ideas</span>
        </div>
        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-mono">
          +12 today
        </Badge>
      </div>

      {/* Idea cards stack */}
      <div className="flex flex-col gap-1">
        {IDEAS.map((idea) => (
          <div
            key={idea.title}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-background px-2 py-1.5"
          >
            <span className="truncate font-mono text-[10px] text-foreground">{idea.title}</span>
            <div className="flex shrink-0 items-center gap-2 font-mono text-[9px] text-muted-foreground">
              <span className="flex items-center gap-0.5 text-[hsl(var(--primary))]">
                <ChartTrendingUp className="h-2.5 w-2.5" />
                {idea.votes}
              </span>
              <span className="flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />
                {idea.comments}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
        <span>public</span>
        <span className="text-muted-foreground">·</span>
        <span>double-opt-in collab</span>
      </div>
    </div>
  );
}
