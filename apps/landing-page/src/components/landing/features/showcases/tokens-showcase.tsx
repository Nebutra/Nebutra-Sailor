"use client";

import { BlendMode, Droplet } from "@nebutra/icons";
import { Badge, ColorBadge, Heading, Text } from "@nebutra/ui/primitives";
import type { PackageShowcaseProps } from "./types";

/**
 * TokensShowcase — visual gallery for the @nebutra/tokens package.
 *
 * Renders the runtime CSS variable surface: 12-step neutral scale,
 * brand swatches, type ramp, and radius tiles.
 */

type Locale = "en" | "zh";

const COPY = {
  en: {
    brandTitle: "Brand and status",
    neutralLabel: "Neutral scale",
    panelSubtitle: "Runtime CSS variables, single source of truth",
    panelTitle: "Design tokens",
    radiusTitle: "Radius",
    ramp: {
      body: "Body copy renders at a comfortable reading rhythm.",
      caption: "Captions live at the smallest typographic step.",
      display: "Aa Display",
      heading: "Aa Heading",
    },
    rampLabels: { body: "body", caption: "caption", display: "display", heading: "heading" },
    typeTitle: "Type ramp",
  },
  zh: {
    brandTitle: "品牌与状态",
    neutralLabel: "中性色阶",
    panelSubtitle: "运行时 CSS 变量，单一事实来源",
    panelTitle: "设计 tokens",
    radiusTitle: "圆角",
    ramp: {
      body: "正文以舒适的阅读节奏呈现。",
      caption: "标注位于最小的字号层级。",
      display: "Aa 展示",
      heading: "Aa 标题",
    },
    rampLabels: { body: "正文", caption: "标注", display: "展示", heading: "标题" },
    typeTitle: "字号梯度",
  },
} satisfies Record<Locale, Record<string, unknown>>;

const NEUTRAL_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const BRAND_SWATCHES = [
  { label: "--brand-primary", style: { background: "var(--brand-primary)" } },
  { label: "--brand-accent", style: { background: "var(--brand-accent)" } },
  { label: "--brand-gradient", style: { background: "var(--brand-gradient)" } },
  { label: "--status-danger", style: { background: "var(--status-danger)" } },
  { label: "--status-success", style: { background: "var(--status-success)" } },
  { label: "--status-warning", style: { background: "var(--status-warning)" } },
] as const;

const RADIUS_TILES = [
  { label: "--radius-sm", value: "var(--radius-sm)" },
  { label: "--radius-md", value: "var(--radius-md)" },
  { label: "--radius-lg", value: "var(--radius-lg)" },
  { label: "--radius-panel", value: "var(--radius-panel)" },
] as const;

export function TokensShowcase(props: PackageShowcaseProps) {
  const { locale } = props;
  const copy = COPY[locale];

  return (
    <div
      className="min-h-[400px] w-full rounded-[var(--radius-panel)] border border-border bg-background p-6 md:p-8"
      style={{ minHeight: 400 }}
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Droplet className="h-4 w-4" />
        </span>
        <div>
          <Heading level={3}>{copy.panelTitle}</Heading>
          <Text variant="body-sm" color="muted">
            {copy.panelSubtitle}
          </Text>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <Text variant="label" color="muted">
            {copy.neutralLabel}
          </Text>
          <Badge size="sm" variant="gray-subtle">
            12 steps
          </Badge>
        </div>
        <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
          {NEUTRAL_STEPS.map((step) => (
            <div key={step} className="flex flex-col gap-1.5">
              <div
                aria-hidden="true"
                className="h-14 w-full rounded-[var(--radius-md)] border border-border"
                style={{ background: `var(--neutral-${step})` }}
              />
              <Text variant="caption" className="font-mono" color="muted">
                --neutral-{step}
              </Text>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <BlendMode className="h-3.5 w-3.5 text-muted-foreground" />
          <Text variant="label" color="muted">
            {copy.brandTitle}
          </Text>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BRAND_SWATCHES.map((swatch) => (
            <div
              key={swatch.label}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border p-3"
            >
              <div
                aria-hidden="true"
                className="h-12 w-full rounded-[var(--radius-sm)]"
                style={swatch.style}
              />
              <ColorBadge capitalize={false} size="sm" variant="gray-subtle">
                <span className="font-mono">{swatch.label}</span>
              </ColorBadge>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <Text className="mb-3" color="muted" variant="label">
          {copy.typeTitle}
        </Text>
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4">
            <Heading display level={1}>
              {copy.ramp.display}
            </Heading>
            <Text className="font-mono" color="muted" variant="caption">
              {copy.rampLabels.display}
            </Text>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <Heading level={2}>{copy.ramp.heading}</Heading>
            <Text className="font-mono" color="muted" variant="caption">
              {copy.rampLabels.heading}
            </Text>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <Text variant="body">{copy.ramp.body}</Text>
            <Text className="font-mono" color="muted" variant="caption">
              {copy.rampLabels.body}
            </Text>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <Text color="muted" variant="caption">
              {copy.ramp.caption}
            </Text>
            <Text className="font-mono" color="muted" variant="caption">
              {copy.rampLabels.caption}
            </Text>
          </div>
        </div>
      </section>

      <section>
        <Text className="mb-3" color="muted" variant="label">
          {copy.radiusTitle}
        </Text>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RADIUS_TILES.map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col items-center gap-2 border border-border bg-muted/40 p-4"
              style={{ borderRadius: tile.value }}
            >
              <div
                aria-hidden="true"
                className="h-10 w-10"
                style={{ background: "var(--brand-gradient)", borderRadius: tile.value }}
              />
              <Badge size="sm" variant="outline">
                <span className="font-mono">{tile.label}</span>
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
