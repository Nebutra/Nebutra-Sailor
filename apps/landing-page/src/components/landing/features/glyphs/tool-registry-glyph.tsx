import { Box, Code, Database, Envelope, MagnifyingGlass } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ToolRow = {
  readonly name: string;
  readonly version: string;
  readonly category: string;
  readonly Icon: typeof Box;
};

const TOOL_ROWS: readonly ToolRow[] = [
  { name: "search_docs", version: "v1.4.2", category: "retrieval", Icon: MagnifyingGlass },
  { name: "send_email", version: "v2.1.0", category: "comms", Icon: Envelope },
  { name: "query_db", version: "v1.8.1", category: "data", Icon: Database },
  { name: "run_shell", version: "v0.9.4", category: "system", Icon: Code },
];

export function ToolRegistryGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-1.5 rounded-[var(--radius-md)] bg-[var(--neutral-1)] p-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--neutral-10)]">
        <Box className="h-3 w-3 text-[var(--neutral-11)]" />
        <span>tool-registry</span>
        <span className="text-[var(--neutral-8)]">·</span>
        <span>247 tools</span>
        <span className="text-[var(--neutral-8)]">·</span>
        <span>12 categories</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        {TOOL_ROWS.map(({ name, version, category, Icon }) => (
          <div
            key={name}
            className="flex items-center gap-1.5 rounded border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-1.5 py-1"
          >
            <Icon className="h-3 w-3 shrink-0 text-[var(--neutral-11)]" />
            <span className="flex-1 truncate font-mono text-[10px] text-[var(--neutral-12)]">
              {name}
            </span>
            <Badge variant="outline" className="h-4 px-1 font-mono text-[9px] leading-none">
              {version}
            </Badge>
            <Badge variant="gray-subtle" className="h-4 px-1 font-mono text-[9px] leading-none">
              {category}
            </Badge>
          </div>
        ))}
      </div>
      <div className="font-mono text-[9px] text-[var(--neutral-10)]">
        versioned · audited · per-tenant ACL
      </div>
    </div>
  );
}
