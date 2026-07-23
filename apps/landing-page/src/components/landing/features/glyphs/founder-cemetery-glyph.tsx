import { BookClosed, Clock, FileText } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ArchivedIdea = {
  name: string;
  died: string;
  cause: string;
};

const ARCHIVED: ArchivedIdea[] = [
  { name: "Acme SaaS", died: "2024-08", cause: "no PMF" },
  { name: "VR Yoga", died: "2024-12", cause: "pivot needed" },
  { name: "AI Chef", died: "2025-02", cause: "competitor moved fast" },
];

export function FounderCemeteryGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Lessons archive · 12 projects</span>
        </div>
        <BookClosed className="h-3 w-3 text-muted-foreground" />
      </div>

      <ul className="flex flex-1 flex-col gap-1 overflow-hidden">
        {ARCHIVED.map((idea) => (
          <li
            key={idea.name}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-background px-2 py-1"
          >
            <span className="font-mono text-[10px] text-muted-foreground">idea</span>
            <span className="font-mono text-[10px] text-muted-foreground">·</span>
            <span className="truncate font-mono text-[10px] text-foreground">
              &quot;{idea.name}&quot;
            </span>
            <span className="ml-auto flex items-center gap-1">
              <span className="font-mono text-[9px] text-muted-foreground">{idea.died}</span>
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {idea.cause}
              </Badge>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
        <FileText className="h-2.5 w-2.5" />
        <span>private journal · postmortem template</span>
      </div>
    </div>
  );
}
