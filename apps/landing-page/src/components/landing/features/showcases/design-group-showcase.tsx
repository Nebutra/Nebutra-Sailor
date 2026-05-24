"use client";

import {
  ArrowRight,
  BlendMode,
  BookClosed,
  Brain,
  Database,
  Droplet,
  Eye,
  GitBranch,
  Layers,
  Lightning,
  Shield,
  Sparkles,
} from "@nebutra/icons";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ColorBadge,
  Heading,
  MetricCard,
  MetricGrid,
  Text,
} from "@nebutra/ui/primitives";
import { Fragment, type ReactNode } from "react";
import type { PackageShowcaseProps } from "./types";

// Group-level showcase for design/* packages without a bespoke showcase
// (ui, icons, theme, brand, design-tokens, design-sync, …). Body varies
// per slug so `ui` vs `icons` vs `theme` look obviously distinct.
type Layout = "ui" | "icons" | "theme" | "sync" | "gallery";

function pickLayout(slug: string): Layout {
  if (slug === "ui" || slug.includes("component")) return "ui";
  if (slug === "icons") return "icons";
  if (slug === "theme" || slug === "brand") return "theme";
  if (slug.includes("sync") || slug.includes("tokens-")) return "sync";
  return "gallery";
}

function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(hash) % max;
}

type Copy = {
  badge: string;
  footerSuffix: string;
  metricComponents: string;
  metricCoverage: string;
  metricSync: string;
  metricTokens: string;
  syncRepo: string;
  syncSource: string;
  syncTarget: string;
};
const COPY: Record<"en" | "zh", Copy> = {
  en: {
    badge: "Design system",
    footerSuffix: "design supply chain",
    metricComponents: "Components",
    metricCoverage: "Coverage",
    metricSync: "Sync status",
    metricTokens: "Tokens shipped",
    syncRepo: "Tokens repo",
    syncSource: "Figma",
    syncTarget: "@nebutra/tokens",
  },
  zh: {
    badge: "设计系统",
    footerSuffix: "设计供应链",
    metricComponents: "组件",
    metricCoverage: "覆盖率",
    metricSync: "同步状态",
    metricTokens: "Tokens 数",
    syncRepo: "Tokens 仓库",
    syncSource: "Figma",
    syncTarget: "@nebutra/tokens",
  },
};

const ICON_GRID = [
  Sparkles,
  Brain,
  Database,
  Shield,
  Lightning,
  Eye,
  BookClosed,
  GitBranch,
  Layers,
  BlendMode,
  Droplet,
  ArrowRight,
] as const;
const TILE =
  "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-muted/30 p-4";

function Swatch({ label, bg, h = "h-12" }: { label: string; bg: string; h?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-border p-2">
      <div
        className={`${h} rounded-[var(--radius-sm)]`}
        style={{ background: bg }}
        aria-hidden="true"
      />
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function UiLayout() {
  const samples: Array<{ label: string; node: ReactNode }> = [
    { label: "Button · default", node: <Button size="sm">Action</Button> },
    {
      label: "Button · outline",
      node: (
        <Button size="sm" variant="outline">
          Outline
        </Button>
      ),
    },
    {
      label: "Button · secondary",
      node: (
        <Button size="sm" variant="secondary">
          Subtle
        </Button>
      ),
    },
    { label: "Badge", node: <Badge size="sm">Stable</Badge> },
    {
      label: "ColorBadge",
      node: (
        <ColorBadge size="sm" variant="blue-subtle">
          Info
        </ColorBadge>
      ),
    },
    {
      label: "Input · resting",
      node: (
        <div className="h-7 w-full rounded-[var(--radius-sm)] border border-border bg-background" />
      ),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {samples.map((s) => (
        <div key={s.label} className={TILE}>
          {s.node}
          <Text variant="caption" color="muted">
            {s.label}
          </Text>
        </div>
      ))}
    </div>
  );
}

function IconsLayout() {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ICON_GRID.map((Icon, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: stable icon order
          key={i}
          className="flex aspect-square items-center justify-center rounded-[var(--radius-sm)] border border-border bg-muted/30 text-foreground"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

function ThemeLayout() {
  const brand = ["brand-primary", "brand-accent", "brand-gradient"] as const;
  const radii = ["sm", "md", "lg"] as const;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {brand.map((l) => (
          <Swatch key={l} label={l} bg={`var(--${l})`} h="h-14" />
        ))}
      </div>
      <div className="flex items-stretch gap-2">
        {radii.map((r) => (
          <div
            key={r}
            className="flex flex-1 flex-col items-center gap-1.5 border border-border bg-muted/30 p-3"
            style={{ borderRadius: `var(--radius-${r})` }}
          >
            <div
              className="h-8 w-8"
              aria-hidden="true"
              style={{ background: "var(--brand-gradient)", borderRadius: `var(--radius-${r})` }}
            />
            <Badge size="sm" variant="outline">
              <span className="font-mono">radius-{r}</span>
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncLayout({ copy }: { copy: Copy }) {
  const nodes = [
    { Icon: Eye, label: copy.syncSource },
    { Icon: Database, label: copy.syncRepo },
    { Icon: Droplet, label: copy.syncTarget },
  ];
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
      {nodes.map((n, i) => (
        <Fragment key={n.label}>
          <Card className="border-border/60 bg-muted/30 shadow-none">
            <CardContent className="flex flex-col items-center gap-1.5 p-3">
              <n.Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
              <span className="text-center text-[11px] font-medium text-foreground">{n.label}</span>
            </CardContent>
          </Card>
          {i < nodes.length - 1 && (
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function GalleryLayout() {
  const swatches = ["neutral-2", "neutral-7", "neutral-12", "blue-9", "cyan-9"] as const;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {swatches.map((l) => (
          <Swatch key={l} label={l} bg={`var(--${l})`} />
        ))}
        <Swatch label="brand-gradient" bg="var(--brand-gradient)" />
      </div>
      <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-border bg-muted/30 p-4">
        <Heading level={2}>Aa Heading</Heading>
        <Text variant="body">Body copy renders the rhythm.</Text>
        <Text variant="body-sm" color="muted">
          Small body for secondary context.
        </Text>
        <Text variant="caption" color="muted">
          Caption · the smallest step
        </Text>
      </div>
    </div>
  );
}

function renderBody(layout: Layout, copy: Copy) {
  if (layout === "ui") return <UiLayout />;
  if (layout === "icons") return <IconsLayout />;
  if (layout === "theme") return <ThemeLayout />;
  if (layout === "sync") return <SyncLayout copy={copy} />;
  return <GalleryLayout />;
}

export function DesignGroupShowcase(props: PackageShowcaseProps) {
  const { entry, locale } = props;
  const copy = COPY[locale];
  const layout = pickLayout(entry.slug);
  const tokensShipped = 120 + seeded(entry.slug, 380);
  const components = 18 + seeded(entry.slug, 90, 7);
  const coverage = 82 + seeded(entry.slug, 16, 13);

  return (
    <div
      className="rounded-[var(--radius-panel)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <Droplet className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <Badge size="sm" variant="outline" className="font-mono">
              {entry.path}
            </Badge>
          </div>
          <Badge size="sm" variant="gray-subtle">
            {copy.badge}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          {renderBody(layout, copy)}
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard
                size="sm"
                label={copy.metricTokens}
                value={tokensShipped}
                icon={<Droplet />}
              />
              <MetricCard
                size="sm"
                label={copy.metricComponents}
                value={components}
                icon={<Layers />}
              />
              <MetricCard
                size="sm"
                label={copy.metricCoverage}
                value={`${coverage}%`}
                icon={<Eye />}
              />
              <MetricCard
                size="sm"
                label={copy.metricSync}
                value="OK"
                trend="up"
                icon={<GitBranch />}
              />
            </MetricGrid>
          </div>
          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">{entry.path}</span>
            <span className="shrink-0">{copy.footerSuffix}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
