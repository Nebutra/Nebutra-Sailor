"use client";

import { Clock, FileText, Pen } from "@nebutra/icons";
import { Badge, StatusDot } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type SchemaRow = {
  icon: typeof FileText;
  name: string;
  count: string;
  meta: string;
};

const SCHEMA_ROWS: readonly SchemaRow[] = [
  {
    icon: FileText,
    name: "post",
    count: "12,401 docs",
    meta: "last edited 2m ago",
  },
  {
    icon: Pen,
    name: "author",
    count: "847 docs",
    meta: "last edited 12m ago",
  },
  {
    icon: Clock,
    name: "category",
    count: "38 docs",
    meta: "stable",
  },
];

export function SanityGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3"
      style={{ height: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-foreground">Sanity Studio v5</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" size="sm">
            Connected
          </Badge>
          <StatusDot state="READY" />
        </div>
      </div>

      {/* Schema rows */}
      <div className="flex flex-1 flex-col gap-1">
        {SCHEMA_ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-muted px-2 py-1"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-[10px] text-foreground">{row.name}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="font-mono text-[10px] text-muted-foreground">{row.count}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{row.meta}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          GROQ · webhook ingestion
        </span>
      </div>
    </div>
  );
}
