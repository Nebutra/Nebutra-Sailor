"use client";

import { ArrowRight, Brain, Lightning, MagnifyingGlass, Sparkles } from "@nebutra/icons";
import { Badge, Input } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type Stage = {
  label: string;
  ms: string;
  icon: typeof Brain;
};

const STAGES: readonly Stage[] = [
  { label: "Embed", ms: "12ms", icon: Brain },
  { label: "Search", ms: "84ms", icon: MagnifyingGlass },
  { label: "Re-rank", ms: "22ms", icon: Sparkles },
] as const;

type Chunk = {
  path: string;
  score: string;
};

const CHUNKS: readonly Chunk[] = [
  { path: "docs/security/keys.md", score: "0.94" },
  { path: "docs/auth/rotation.md", score: "0.88" },
] as const;

export function KnowledgeRagGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      style={{ height: 160 }}
      className="flex w-full flex-col gap-1.5 overflow-hidden p-3"
      aria-hidden="true"
    >
      <div className="pointer-events-none">
        <Input
          size="sm"
          readOnly
          tabIndex={-1}
          aria-label="RAG query preview"
          value="How do I rotate keys?"
          prefix={<MagnifyingGlass />}
        />
      </div>

      <div className="flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.label} className="flex flex-1 items-center gap-1">
              <Badge
                variant="outline"
                size="sm"
                className="flex w-full items-center justify-center gap-1 px-1 py-0.5 font-mono text-[10px] tabular-nums"
              >
                <Icon className="h-2.5 w-2.5 text-[color:var(--brand-primary)]" />
                <span className="truncate">{stage.label}</span>
                <span className="text-muted-foreground">·</span>
                <span>{stage.ms}</span>
              </Badge>
              {idx < STAGES.length - 1 ? (
                <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
              ) : null}
            </div>
          );
        })}
      </div>

      <ul className="m-0 flex flex-col gap-1 p-0">
        {CHUNKS.map((chunk) => (
          <li
            key={chunk.path}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-background/40 px-2 py-1"
          >
            <span className="truncate font-mono text-[11px] tracking-tight text-foreground">
              {chunk.path}
            </span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--brand-accent)]">
              {chunk.score}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground">
        <Lightning className="h-2.5 w-2.5 text-[color:var(--brand-accent)]" />
        <span>pgvector · 1,536-dim · 118ms total</span>
      </div>
    </div>
  );
}
