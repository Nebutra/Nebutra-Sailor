import { ArrowRight, Connection } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

type NodePos = {
  id: string;
  label: string;
  top: number;
  left: number;
};

type Edge = {
  from: string;
  to: string;
  label: string;
};

const NODES: NodePos[] = [
  { id: "acme", label: "Acme Corp", top: 30, left: 14 },
  { id: "atlas", label: "Project Atlas", top: 64, left: 52 },
  { id: "openai", label: "OpenAI", top: 30, left: 76 },
  { id: "mira", label: "Mira", top: 96, left: 18 },
];

const EDGES: Edge[] = [
  { from: "acme", to: "atlas", label: "owns" },
  { from: "atlas", to: "openai", label: "depends_on" },
  { from: "acme", to: "mira", label: "employs" },
];

function nodeById(id: string): NodePos {
  const node = NODES.find((n) => n.id === id);
  if (!node) {
    throw new Error(`KnowledgeGraphGlyph: unknown node id "${id}"`);
  }
  return node;
}

export function KnowledgeGraphGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted px-3 py-3"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <Connection className="h-3 w-3" />
          <span>graph</span>
        </div>
        <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-mono">
          247 entities · 1,847 edges
        </Badge>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker
            id="kg-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--muted-foreground))" />
          </marker>
        </defs>
        {EDGES.map((edge) => {
          const a = nodeById(edge.from);
          const b = nodeById(edge.to);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={`${a.left + 8}%`}
              y1={a.top + 6}
              x2={`${b.left + 4}%`}
              y2={b.top + 6}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="2 2"
              markerEnd="url(#kg-arrow)"
            />
          );
        })}
      </svg>

      {NODES.map((node) => (
        <div
          key={node.id}
          className="absolute rounded-[var(--radius-md)] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm"
          style={{ top: node.top, left: `${node.left}%` }}
        >
          {node.label}
        </div>
      ))}

      {EDGES.map((edge) => {
        const a = nodeById(edge.from);
        const b = nodeById(edge.to);
        const midTop = (a.top + b.top) / 2 - 2;
        const midLeft = (a.left + b.left) / 2 + 2;
        return (
          <div
            key={`label-${edge.from}-${edge.to}`}
            className="absolute flex items-center gap-0.5 rounded bg-background px-1 text-[8px] font-mono text-muted-foreground"
            style={{ top: midTop, left: `${midLeft}%` }}
          >
            <ArrowRight className="h-2 w-2" />
            {edge.label}
          </div>
        );
      })}

      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between font-mono text-[9px] text-muted-foreground">
        <span>Cypher-compatible · typed edges</span>
      </div>
    </div>
  );
}
