import { Box, Brain, Code } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const ROWS = [
  {
    icon: Brain,
    name: "Message",
    sig: "{ role, content[] }",
  },
  {
    icon: Code,
    name: "Tool",
    sig: "{ name, params, execute }",
  },
  {
    icon: Box,
    name: "StreamEvent",
    sig: '"delta" | "tool_call" | ...',
  },
  {
    icon: Box,
    name: "Actor",
    sig: "{ id, type, tenantId }",
  },
] as const;

export function AiPrimitivesGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-md bg-neutral-2 px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2 z-10">
        <Badge variant="gray-subtle" size="sm">
          5 primitives · 0 deps
        </Badge>
      </div>

      <div className="mt-5 flex flex-col gap-1 font-mono text-[10.5px] leading-tight">
        {ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.name}
              className="flex items-center gap-2 rounded-sm bg-neutral-1 px-2 py-1"
            >
              <Icon size={11} className="shrink-0 text-neutral-10" />
              <span className="w-[78px] shrink-0 text-neutral-12">{row.name}</span>
              <span className="text-neutral-9">=</span>
              <span className="truncate text-neutral-11">{row.sig}</span>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-1.5 left-3 right-3 font-mono text-[9.5px] text-neutral-9">
        consumed by @nebutra/agents
      </div>
    </div>
  );
}
