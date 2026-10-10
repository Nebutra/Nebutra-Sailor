"use client";

import {
  BookClosed as Book,
  Brain,
  Lightning,
  MagnifyingGlass as Search,
  Sparkles,
} from "@nebutra/icons";
import { Badge, Card, CardContent, Input, Progress } from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

type Stage = {
  Icon: IconCmp;
  label: string;
  detail: string;
  latency: string;
};

type Chunk = {
  excerpt: string;
  source: string;
  relevance: number;
  tokens: number;
};

type Copy = {
  query: string;
  queryValue: string;
  stagesLabel: string;
  /** Translatable stage label/detail, keyed by stage index. */
  stages: Record<string, { label?: string; detail?: string }>;
  retrievedLabel: string;
  retrievedCount: string;
  /** Translatable chunk excerpt, keyed by chunk index. */
  chunks: Record<string, { excerpt: string }>;
  scoreLabel: string;
  tokensLabel: string;
  footer: string;
};

// Icons, latencies, sources and scores — demo data, same on every locale.
const STAGES: ReadonlyArray<Pick<Stage, "Icon" | "latency">> = [
  { Icon: Brain, latency: "12ms" },
  { Icon: Search, latency: "84ms" },
  { Icon: Sparkles, latency: "22ms" },
];
const CHUNKS: ReadonlyArray<Omit<Chunk, "excerpt">> = [
  { source: "docs/security/api-keys.md", relevance: 94, tokens: 142 },
  { source: "docs/api/keys-endpoint.md", relevance: 88, tokens: 96 },
  { source: "docs/security/audit-log.md", relevance: 71, tokens: 128 },
];

function StageRow({ stage }: { stage: Stage }) {
  const { Icon } = stage;
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 px-3 py-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-background text-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-xs font-semibold text-foreground">{stage.label}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">{stage.detail}</span>
      </div>
      <Badge variant="outline" size="sm" className="font-mono">
        <Lightning className="h-3 w-3" aria-hidden="true" />
        {stage.latency}
      </Badge>
    </li>
  );
}

type ChunkCardProps = { chunk: Chunk; scoreLabel: string; tokensLabel: string };

function ChunkCard({ chunk, scoreLabel, tokensLabel }: ChunkCardProps) {
  return (
    <Card>
      <CardContent className="space-y-2.5 p-3">
        <p className="text-xs leading-relaxed text-foreground">{chunk.excerpt}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="gray-subtle" size="sm" className="font-mono">
            <Book className="h-3 w-3" aria-hidden="true" />
            {chunk.source}
          </Badge>
          <Badge variant="outline" size="sm" className="font-mono">
            {chunk.tokens} {tokensLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
            {scoreLabel}
          </span>
          <div className="min-w-0 flex-1">
            <Progress value={chunk.relevance} size="sm" animated={false} />
          </div>
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
            {chunk.relevance}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function KnowledgeRagShowcase({ copy: rawCopy }: PackageShowcaseProps) {
  const copy = rawCopy as Copy;
  const stages: Stage[] = STAGES.map((stage, i) => ({
    ...stage,
    label: copy.stages[i]?.label ?? "",
    detail: copy.stages[i]?.detail ?? "",
  }));
  const chunks: Chunk[] = CHUNKS.map((chunk, i) => ({
    ...chunk,
    excerpt: copy.chunks[i]?.excerpt ?? "",
  }));

  return (
    <ShowcaseFrame>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="rag-query"
            className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {copy.query}
          </label>
          <Input
            id="rag-query"
            readOnly
            value={copy.queryValue}
            prefix={<Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {copy.stagesLabel}
          </div>
          <ol className="space-y-1.5">
            {stages.map((stage) => (
              <StageRow key={stage.label} stage={stage} />
            ))}
          </ol>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {copy.retrievedLabel}
            </span>
            <Badge variant="gray-subtle" size="sm" className="font-mono">
              {copy.retrievedCount}
            </Badge>
          </div>
          <div className="grid gap-2">
            {chunks.map((chunk) => (
              <ChunkCard
                key={chunk.source}
                chunk={chunk}
                scoreLabel={copy.scoreLabel}
                tokensLabel={copy.tokensLabel}
              />
            ))}
          </div>
        </div>
        <div className="border-t border-border/60 pt-3">
          <p className="text-center font-mono text-[11px] text-muted-foreground">{copy.footer}</p>
        </div>
      </div>
    </ShowcaseFrame>
  );
}
