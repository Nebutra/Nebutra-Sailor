import { Connection, Database, FileText, Globe, MagnifyingGlass } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const TOOLS: ReadonlyArray<{
  name: string;
  desc: string;
  latency: string;
  icon: typeof Connection;
}> = [
  {
    name: "search_docs",
    desc: "query corpus",
    latency: "247ms",
    icon: MagnifyingGlass,
  },
  {
    name: "read_file",
    desc: "fs.read at path",
    latency: "12ms",
    icon: FileText,
  },
  {
    name: "run_query",
    desc: "SQL on tenant DB",
    latency: "84ms",
    icon: Database,
  },
  {
    name: "fetch_url",
    desc: "HTTP get URL",
    latency: "412ms",
    icon: Globe,
  },
];

export function McpGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-[var(--radius-md)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">
          mcp.tool_catalog · 47 tools
        </span>
        <Connection className="h-3 w-3 text-[hsl(var(--primary))]" />
      </div>

      <ul className="flex flex-col gap-1">
        {TOOLS.map(({ name, desc, latency, icon: Icon }) => (
          <li
            key={name}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-background px-2 py-1"
          >
            <Icon className="h-2.5 w-2.5 shrink-0 text-[hsl(var(--primary))]" />
            <code className="truncate font-mono text-[10px] text-foreground">
              <span className="text-[hsl(var(--primary))]">{name}</span>
              <span className="text-muted-foreground"> · {desc}</span>
            </code>
            <Badge
              variant="outline"
              className="ml-auto shrink-0 border-border bg-transparent px-1 py-0 font-mono text-[9px] text-muted-foreground"
            >
              {latency}
            </Badge>
          </li>
        ))}
      </ul>

      <div className="font-mono text-[9px] text-muted-foreground">MCP 1.0 · stdio · streamable</div>
    </div>
  );
}
