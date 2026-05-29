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
  stages: Stage[];
  retrievedLabel: string;
  retrievedCount: string;
  chunks: Chunk[];
  scoreLabel: string;
  tokensLabel: string;
  footer: string;
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    query: "User query",
    queryValue: "How do I rotate API keys?",
    stagesLabel: "Retrieval pipeline",
    stages: [
      { Icon: Brain, label: "Embed query", detail: "vector · dim 1536", latency: "12ms" },
      { Icon: Search, label: "Search corpus", detail: "5 / 12,401 chunks", latency: "84ms" },
      { Icon: Sparkles, label: "Re-rank", detail: "top 3 surfaced", latency: "22ms" },
    ],
    retrievedLabel: "Retrieved chunks",
    retrievedCount: "3 of 5",
    chunks: [
      {
        excerpt: "To rotate keys, generate a new key, deploy, then revoke the previous secret.",
        source: "docs/security/api-keys.md",
        relevance: 94,
        tokens: 142,
      },
      {
        excerpt: "Programmatic rotation can be scheduled via the /v1/keys/rotate endpoint.",
        source: "docs/api/keys-endpoint.md",
        relevance: 88,
        tokens: 96,
      },
      {
        excerpt: "Audit logs capture every key create/revoke event for SOC 2 compliance.",
        source: "docs/security/audit-log.md",
        relevance: 71,
        tokens: 128,
      },
    ],
    scoreLabel: "Relevance",
    tokensLabel: "tokens",
    footer: "12,401 chunks · 1,536-dim local embeddings · 118ms end-to-end",
  },
  zh: {
    query: "用户提问",
    queryValue: "How do I rotate API keys?",
    stagesLabel: "检索流水线",
    stages: [
      { Icon: Brain, label: "Query 向量化", detail: "vector · dim 1536", latency: "12ms" },
      { Icon: Search, label: "语料检索", detail: "5 / 12,401 chunks", latency: "84ms" },
      { Icon: Sparkles, label: "重排序", detail: "Top 3 命中", latency: "22ms" },
    ],
    retrievedLabel: "检索结果",
    retrievedCount: "3 / 5",
    chunks: [
      {
        excerpt: "轮换密钥：先生成新 key 并部署，再吊销旧 secret，避免服务中断。",
        source: "docs/security/api-keys.md",
        relevance: 94,
        tokens: 142,
      },
      {
        excerpt: "可通过 /v1/keys/rotate 端点排程自动轮换密钥。",
        source: "docs/api/keys-endpoint.md",
        relevance: 88,
        tokens: 96,
      },
      {
        excerpt: "审计日志记录所有 key 的创建与吊销事件，满足 SOC 2 合规。",
        source: "docs/security/audit-log.md",
        relevance: 71,
        tokens: 128,
      },
    ],
    scoreLabel: "相关度",
    tokensLabel: "tokens",
    footer: "12,401 chunks · 1,536 维本地向量 · 118ms 端到端",
  },
};

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
    <Card className="border-border/60 shadow-none">
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

export function KnowledgeRagShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];

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
            {copy.stages.map((stage) => (
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
            {copy.chunks.map((chunk) => (
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
