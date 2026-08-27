"use client";

import { ArrowRight, Connection, Users } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const CAPTION = {
  en: ["ReBAC", "typed relations"],
  zh: ["关系型授权", "类型化关系"],
} as const;

const RELATION_LABELS = {
  en: { owns: "owns", member: "member" },
  zh: { owns: "拥有", member: "成员" },
} as const;

type NodeTone = "user" | "org";

function GraphNode({ kind, label }: { kind: NodeTone; label: string }) {
  const Icon = kind === "user" ? Users : Connection;
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1.5 border-blue-7 bg-blue-2 px-2 py-1 font-mono text-[10.5px] text-blue-11 shadow-sm"
    >
      <Icon className="h-3 w-3 text-primary" />
      <span className="tracking-tight">{label}</span>
    </Badge>
  );
}

function Edge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-wider text-neutral-10">
      <span className="rounded-[var(--radius-sm)] bg-neutral-3 px-1.5 py-0.5">{label}</span>
      <ArrowRight className="h-3 w-3 text-neutral-9" />
    </span>
  );
}

export function GraphModelGlyph({ locale }: SubpackageGlyphProps) {
  const rel = RELATION_LABELS[locale];
  const caption = CAPTION[locale];

  return (
    <div
      style={{ height: 160 }}
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-gradient-to-br from-blue-1 via-neutral-1 to-cyan-1 px-3 py-3"
    >
      {/* Faint grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--muted)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--muted)) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Scattered graph */}
      <div className="relative h-full w-full">
        {/* user:alice — top-left */}
        <div className="absolute left-0 top-1">
          <GraphNode kind="user" label="user:alice" />
        </div>

        {/* edge 1: owns -> */}
        <div className="absolute left-[36%] top-[18px]">
          <Edge label={rel.owns} />
        </div>

        {/* org:acme — middle, slightly right + down */}
        <div className="absolute left-[42%] top-[52px]">
          <GraphNode kind="org" label="org:acme" />
        </div>

        {/* edge 2: member -> (angled down-right) */}
        <div className="absolute left-[18%] top-[86px]">
          <Edge label={rel.member} />
        </div>

        {/* user:bob — bottom-right area */}
        <div className="absolute left-[6%] top-[108px]">
          <GraphNode kind="user" label="user:bob" />
        </div>

        {/* Caption — bottom-right */}
        <div className="absolute bottom-0 right-0 flex flex-col items-end text-right">
          <span className="font-mono text-[10px] font-medium text-neutral-12">{caption[0]}</span>
          <span className="text-[9.5px] text-neutral-10">{caption[1]}</span>
        </div>
      </div>
    </div>
  );
}
