"use client";

import {
  Box,
  Check,
  Clock,
  Database,
  GitBranch,
  Globe,
  Lightning,
  TerminalWindow as Terminal,
} from "@nebutra/icons";

import { Badge } from "@nebutra/ui/primitives/badge";
import { Card, CardContent, CardHeader } from "@nebutra/ui/primitives/card";
import { MetricCard, MetricGrid } from "@nebutra/ui/primitives/metric-card";
import { StatusBadge } from "@nebutra/ui/primitives/status-badge";
import {
  AnimatedSpan,
  Terminal as TerminalView,
  TypingAnimation,
} from "@nebutra/ui/primitives/terminal";

import type { PackageShowcaseProps } from "./types";

type Layout = "cli" | "connection" | "preset" | "compliance";

type OpsCopy = {
  badge: string;
  boundary: string;
  version: string;
  deploys: string;
  mtts: string;
  build: string;
  presets: [string, string, string, string];
  activeLabel: string;
  pending: string;
  passed: string;
};

const COPY: Record<"en" | "zh", OpsCopy> = {
  en: {
    badge: "CLI · Ops",
    boundary: "release boundary",
    version: "Version",
    deploys: "Deploys today",
    mtts: "Mean time to ship",
    build: "Build duration",
    presets: ["Indie", "Pro", "Enterprise", "Custom"],
    activeLabel: "Active",
    pending: "Pending review",
    passed: "Passed",
  },
  zh: {
    badge: "CLI · 运维",
    boundary: "发布边界",
    version: "版本",
    deploys: "今日发布",
    mtts: "平均交付时长",
    build: "构建耗时",
    presets: ["独立开发", "专业版", "企业版", "自定义"],
    activeLabel: "已启用",
    pending: "待审核",
    passed: "已通过",
  },
};

const COMPLIANCE_ITEMS: Record<"en" | "zh", [string, boolean][]> = {
  en: [
    ["ICP filing verified", true],
    ["Mainland DNS resolution", true],
    ["China Pay gateway active", true],
    ["Data residency Beijing-2", true],
    ["PIPL audit log retention", false],
    ["MLPS 2.0 self-assessment", false],
  ],
  zh: [
    ["ICP 备案已核验", true],
    ["境内 DNS 已解析", true],
    ["China Pay 网关已激活", true],
    ["数据驻留 Beijing-2", true],
    ["PIPL 审计日志留存", false],
    ["等保 2.0 自评估", false],
  ],
};

function pickLayout(slug: string): Layout {
  if (slug === "cli" || slug === "create-sailor") return "cli";
  if (slug === "sanity" || slug === "supabase") return "connection";
  if (slug === "preset") return "preset";
  if (slug.includes("compliance")) return "compliance";
  return "cli";
}

function CliBody({ slug }: { slug: string }) {
  return (
    <TerminalView className="max-w-full">
      <TypingAnimation>{`$ pnpm nebutra ${slug} init`}</TypingAnimation>
      <AnimatedSpan className="text-emerald-500">✓ Resolving workspace presets</AnimatedSpan>
      <AnimatedSpan className="text-emerald-500">✓ Linking @nebutra/{slug}@1.4.2</AnimatedSpan>
      <AnimatedSpan className="text-emerald-500">✓ Writing release boundary config</AnimatedSpan>
      <AnimatedSpan className="text-emerald-500">✓ Health probe green · 0 drift</AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">→ ready in 2.4s</AnimatedSpan>
    </TerminalView>
  );
}

function ConnectionBody({ slug }: { slug: string }) {
  const Icon = slug === "supabase" ? Database : Box;
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="flex items-center gap-4 p-4 md:p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">{slug}.nebutra.dev</span>
          <span className="font-mono text-xs text-muted-foreground">@nebutra/{slug}@1.4.2</span>
        </div>
        <div className="ml-auto flex flex-col items-end gap-2">
          <StatusBadge
            status="success"
            leftIcon={Globe}
            leftLabel="us-east-1"
            rightLabel="200 OK"
          />
          <Badge variant="success" size="sm" className="font-mono">
            <Check className="h-3 w-3" aria-hidden="true" />
            connected
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function PresetBody({ copy }: { copy: OpsCopy }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {copy.presets.map((label, i) => {
        const active = i === 1;
        return (
          <Card
            key={label}
            className={
              active ? "border-primary bg-primary/5 shadow-none" : "border-border/60 shadow-none"
            }
          >
            <CardContent className="flex flex-col gap-2 p-3">
              <span className="text-sm font-semibold text-foreground">{label}</span>
              {active ? (
                <Badge variant="success" size="sm" className="font-mono">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {copy.activeLabel}
                </Badge>
              ) : (
                <span className="text-[11px] font-mono text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ComplianceBody({ locale, copy }: { locale: "en" | "zh"; copy: OpsCopy }) {
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="divide-y divide-border/60 p-0">
        {COMPLIANCE_ITEMS[locale].map(([label, passed]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-sm text-foreground">{label}</span>
            <Badge variant={passed ? "success" : "warning"} size="sm" className="font-mono">
              {passed ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Clock className="h-3 w-3" aria-hidden="true" />
              )}
              {passed ? copy.passed : copy.pending}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Body({
  layout,
  slug,
  locale,
  copy,
}: {
  layout: Layout;
  slug: string;
  locale: "en" | "zh";
  copy: OpsCopy;
}) {
  if (layout === "connection") return <ConnectionBody slug={slug} />;
  if (layout === "preset") return <PresetBody copy={copy} />;
  if (layout === "compliance") return <ComplianceBody locale={locale} copy={copy} />;
  return <CliBody slug={slug} />;
}

export function OpsGroupFallback({ entry, locale }: PackageShowcaseProps) {
  const copy = COPY[locale];
  const layout = pickLayout(entry.slug);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">{entry.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{entry.path}</span>
          </div>
          <Badge variant="outline" size="sm" className="font-mono">
            {copy.badge}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <Body layout={layout} slug={entry.slug} locale={locale} copy={copy} />

          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard
                size="sm"
                label={copy.version}
                value="1.4.2"
                description="latest stable"
                icon={<GitBranch />}
              />
              <MetricCard
                size="sm"
                label={copy.deploys}
                value="14"
                trend="up"
                trendValue="+3"
                icon={<Lightning />}
              />
              <MetricCard
                size="sm"
                label={copy.mtts}
                value="6m"
                trend="down"
                trendValue="−1m"
                icon={<Clock />}
              />
              <MetricCard
                size="sm"
                label={copy.build}
                value="48s"
                trend="down"
                trendValue="−6s"
                icon={<Box />}
              />
            </MetricGrid>
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 font-mono text-[11px] text-muted-foreground">
        {entry.path} · {copy.boundary}
      </div>
    </div>
  );
}
