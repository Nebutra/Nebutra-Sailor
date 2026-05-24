import {
  Api,
  ArrowRight,
  ArrowUpRight,
  Connection,
  Cpu,
  CreditCard,
  Database,
  Droplet,
  Layers,
  Shield,
  TerminalWindow as TerminalSquare,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import {
  AuroraBackground,
  AuroraText,
  Badge,
  CodeBlock,
  MagicCard,
  MetricCard,
} from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ComponentType } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { getCodeSampleForEntry } from "@/components/landing/features/feature-code-samples";
import {
  getFeatureSummary,
  getFeatureTitle,
  getGroupLabel,
  getPackageFeatureEntry,
  getRelatedEntries,
  PACKAGE_FEATURE_ENTRIES,
} from "@/components/landing/features/package-feature-data";
import { type Locale, routing } from "@/i18n/routing";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { buildPageMetadata } from "@/lib/seo/metadata";

type FeatureDetailPageProps = {
  params: Promise<{ lang: string; name: string }>;
};

const localeForCopy = (lang: string): "en" | "zh" => (lang === "zh" ? "zh" : "en");

type GroupMeta = {
  icon: ComponentType<{ className?: string }>;
  /** Aurora gradient colors for the title highlight. */
  auroraColors: string[];
  /** Subtle aurora-bg variant. */
  ambient: "subtle" | "vivid" | "monochrome";
  docsPath: string;
};

const GROUP_META: Record<string, GroupMeta> = {
  ai: {
    icon: Cpu,
    auroraColors: ["#9333ea", "#3b82f6", "#22d3ee", "#a855f7"],
    ambient: "vivid",
    docsPath: "ai/overview",
  },
  iam: {
    icon: Shield,
    auroraColors: ["#ef4444", "#f97316", "#fb7185", "#dc2626"],
    ambient: "vivid",
    docsPath: "concepts/permissions",
  },
  integrations: {
    icon: Connection,
    auroraColors: ["#06b6d4", "#3b82f6", "#22d3ee", "#0ea5e9"],
    ambient: "subtle",
    docsPath: "integrations/overview",
  },
  platform: {
    icon: Database,
    auroraColors: ["#3b82f6", "#6366f1", "#8b5cf6", "#0ea5e9"],
    ambient: "subtle",
    docsPath: "database/overview",
  },
  design: {
    icon: Droplet,
    auroraColors: ["#0BF1C3", "#0033FE", "#06b6d4", "#38bdf8"],
    ambient: "subtle",
    docsPath: "design/tokens",
  },
  commerce: {
    icon: CreditCard,
    auroraColors: ["#10b981", "#06b6d4", "#34d399", "#0ea5e9"],
    ambient: "subtle",
    docsPath: "payments/overview",
  },
  gateway: {
    icon: Api,
    auroraColors: ["#10b981", "#3b82f6", "#22d3ee", "#34d399"],
    ambient: "subtle",
    docsPath: "development/api-gateway",
  },
  ops: {
    icon: TerminalSquare,
    auroraColors: ["#f59e0b", "#10b981", "#fbbf24", "#84cc16"],
    ambient: "monochrome",
    docsPath: "development/project-structure",
  },
};

const DEFAULT_META: GroupMeta = {
  icon: Layers,
  auroraColors: ["#3b82f6", "#06b6d4", "#0ea5e9", "#38bdf8"],
  ambient: "subtle",
  docsPath: "development/project-structure",
};

const COPY = {
  back: { en: "All features", zh: "全部能力" },
  capability: { en: "Capability", zh: "能力" },
  package: { en: "Package", zh: "能力包" },
  surface: { en: "Surface", zh: "能力面" },
  exampleUsage: { en: "Example usage", zh: "示例用法" },
  exampleDesc: {
    en: "Drop-in code from the public docs — production-grade and tenant-aware by default.",
    zh: "公开文档里的可直接使用代码片段——生产级、默认按租户隔离。",
  },
  exploreFeature: { en: "Explore feature", zh: "探索功能" },
  openDocs: { en: "Open docs", zh: "打开文档" },
  subpackages: { en: "Sub-packages", zh: "子能力包" },
  subpackagesDesc: {
    en: "Stable contracts composed into this capability boundary.",
    zh: "组成这个能力边界的稳定契约接口。",
  },
  related: { en: "Same domain", zh: "同能力域" },
  relatedDesc: {
    en: "Other capability packages inside the same domain.",
    zh: "同一能力域里的其他 package。",
  },
  metric_subpackages: { en: "Sub-packages", zh: "子包" },
  metric_owner: { en: "Owner", zh: "Owner" },
  metric_kind: { en: "Kind", zh: "类型" },
  kind_package: { en: "Package", zh: "Package" },
  kind_group: { en: "Group", zh: "Group" },
  kind_capability: { en: "Capability", zh: "Capability" },
} as const;

const KIND_LABEL = {
  package: { en: "Package", zh: "Package" },
  group: { en: "Group", zh: "Group" },
  capability: { en: "Capability", zh: "Capability" },
} as const;

export function generateStaticParams() {
  return routing.locales.flatMap((lang) =>
    PACKAGE_FEATURE_ENTRIES.map((entry) => ({ lang, name: entry.slug })),
  );
}

export async function generateMetadata({ params }: FeatureDetailPageProps): Promise<Metadata> {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const entry = getPackageFeatureEntry(name);
  if (!entry) return {};

  const locale = localeForCopy(lang);
  return buildPageMetadata({
    title: `${getFeatureTitle(entry, locale)} | Nebutra`,
    description: getFeatureSummary(entry, locale),
    path: `/features/${entry.slug}`,
    locale: lang as Locale,
  });
}

export default async function FeatureDetailPage({ params }: FeatureDetailPageProps) {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();

  const entry = getPackageFeatureEntry(name);
  if (!entry) notFound();

  const locale = localeForCopy(lang);
  setRequestLocale(lang as Locale);

  const summary = getFeatureSummary(entry, locale);
  const groupLabel = getGroupLabel(entry.group, locale);
  const meta = GROUP_META[entry.group] ?? DEFAULT_META;
  const Icon = meta.icon;
  const sample = getCodeSampleForEntry(entry);
  const related = getRelatedEntries(entry, 4);
  const docsHref = createPublicDocsUrl(meta.docsPath);

  // Title split: render `<label>` plain + suffix word in AuroraText.
  const suffix = entry.kind === "package" ? COPY.package[locale] : COPY.surface[locale];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      id="main-content"
    >
      <Navbar />

      {/* HERO ───────────────────────────────────────────────────────── */}
      <section className="relative isolate mx-auto max-w-[1400px] px-4 pt-36 pb-20 sm:px-6 lg:px-8">
        <AuroraBackground variant={meta.ambient} position="top" intensity={0.55} />

        <AnimateIn preset="fade" inView>
          <Link
            className="group/back inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em] transition-colors hover:text-foreground"
            href={`/${lang}/features`}
          >
            <ArrowRight aria-hidden="true" className="size-3 rotate-180" />
            {COPY.back[locale]}
          </Link>
        </AnimateIn>

        <AnimateIn preset="fade" inView delay={0.05}>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono uppercase tracking-[0.18em]"
            >
              <Icon className="size-3" />
              {groupLabel}
            </Badge>
            <Badge
              variant="secondary"
              size="sm"
              className="font-mono normal-case tracking-normal"
              translate="no"
            >
              {entry.path}
            </Badge>
            <Badge size="sm" variant="outline" className="font-mono uppercase tracking-[0.18em]">
              {KIND_LABEL[entry.kind][locale]}
            </Badge>
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView delay={0.1}>
          <h1
            className="mt-6 font-semibold text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-[5.5rem]"
            style={{ letterSpacing: "var(--tracking-display)", lineHeight: 1.05 }}
          >
            <span translate="no">{entry.label}</span>{" "}
            <AuroraText colors={meta.auroraColors} speed={1.2}>
              {suffix}
            </AuroraText>
          </h1>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView delay={0.18}>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
            {summary}
          </p>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView delay={0.26}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={docsHref}
              target="_blank"
              rel="noreferrer"
              className="group/cta inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-semibold text-background text-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {COPY.openDocs[locale]}
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              />
            </a>
            <Link
              href={`/${lang}/features#capability-${entry.group}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-5 py-2.5 font-semibold text-foreground text-sm backdrop-blur-md transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {locale === "zh" ? "查看能力地图" : "View capability map"}
            </Link>
          </div>
        </AnimateIn>
      </section>

      {/* CODE SHOWCASE ──────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp" inView>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
                {COPY.exampleUsage[locale]}
              </p>
              <h2 className="mt-2 font-semibold text-2xl text-foreground sm:text-3xl">
                {entry.label}
                <span className="text-muted-foreground"> · {sample.filename}</span>
              </h2>
            </div>
            <p className="max-w-md text-muted-foreground text-sm">{COPY.exampleDesc[locale]}</p>
          </div>

          <CodeBlock
            filename={sample.filename}
            language={sample.language}
            highlightedLines={sample.highlightedLines}
            maxHeight="540px"
            aria-label={`${entry.label} usage example`}
          >
            {sample.code}
          </CodeBlock>
        </AnimateIn>
      </section>

      {/* METRIC STRIP ───────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
        <AnimateIn preset="fade" inView>
          <div className="grid grid-cols-2 gap-6 rounded-[var(--radius-panel)] border border-border bg-background/40 p-6 backdrop-blur-md sm:grid-cols-4 sm:p-8">
            <MetricCard
              label={COPY.metric_subpackages[locale]}
              value={entry.children.length}
              icon={<Layers />}
            />
            <MetricCard label={COPY.metric_owner[locale]} value={groupLabel} icon={<Icon />} />
            <MetricCard label={COPY.metric_kind[locale]} value={KIND_LABEL[entry.kind][locale]} />
            <MetricCard
              label={locale === "zh" ? "源码边界" : "Source path"}
              value={entry.path}
              size="sm"
            />
          </div>
        </AnimateIn>
      </section>

      {/* SUB-PACKAGES BENTO ─────────────────────────────────────────── */}
      {entry.children.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
          <AnimateIn preset="fade" inView>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
                  {COPY.subpackages[locale]}
                </p>
                <h2 className="mt-2 max-w-2xl font-semibold text-3xl text-foreground sm:text-4xl">
                  {entry.children.length} {locale === "zh" ? "个 sub-package" : "stable interfaces"}
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  {COPY.subpackagesDesc[locale]}
                </p>
              </div>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {entry.children.map((child) => {
              const childEntry = getPackageFeatureEntry(child);
              const childTitle = childEntry ? getFeatureTitle(childEntry, locale) : child;
              const childDesc = childEntry
                ? getFeatureSummary(childEntry, locale)
                : locale === "zh"
                  ? `${child} — ${entry.label} 能力域中的子 package。`
                  : `${child} — sub-package inside ${entry.label}.`;
              return (
                <Link
                  key={child}
                  href={`/${lang}/features/${child}`}
                  className="group/sub block rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <MagicCard
                    className="h-full rounded-[var(--radius-card)] p-6"
                    gradientSize={220}
                    gradientFrom={meta.auroraColors[0]}
                    gradientTo={meta.auroraColors[1]}
                  >
                    <div className="flex h-full min-h-[140px] flex-col">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background/60">
                          <Icon className="size-4" />
                        </span>
                        <span className="font-mono text-foreground text-sm" translate="no">
                          {child}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground text-lg leading-snug">
                        {childTitle}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                        {childDesc}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-4 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] transition-colors group-hover/sub:text-foreground">
                        {locale === "zh" ? "查看" : "Explore"}
                        <ArrowUpRight aria-hidden="true" className="size-3" />
                      </span>
                    </div>
                  </MagicCard>
                </Link>
              );
            })}
          </AnimateInGroup>
        </section>
      ) : null}

      {/* RELATED ────────────────────────────────────────────────────── */}
      {related.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pt-12 pb-32 sm:px-6 lg:px-8">
          <AnimateIn preset="fade" inView>
            <div className="mb-8 flex items-end justify-between border-t border-border/40 pt-12">
              <div>
                <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
                  {COPY.related[locale]}
                </p>
                <h2 className="mt-2 max-w-2xl font-semibold text-2xl text-foreground sm:text-3xl">
                  {groupLabel}
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">{COPY.relatedDesc[locale]}</p>
              </div>
              <Link
                className="hidden items-center gap-1.5 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground sm:inline-flex"
                href={`/${lang}/features#capability-${entry.group}`}
              >
                {locale === "zh" ? "查看能力域" : "View domain"}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {related.map((sibling) => {
              const siblingTitle = getFeatureTitle(sibling, locale);
              return (
                <Link
                  key={sibling.slug}
                  href={`/${lang}/features/${sibling.slug}`}
                  className="group/sib block rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <MagicCard
                    className="h-full rounded-[var(--radius-card)] p-5"
                    gradientSize={180}
                    gradientFrom={meta.auroraColors[0]}
                    gradientTo={meta.auroraColors[2]}
                  >
                    <div className="flex h-full flex-col">
                      <span
                        className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em]"
                        translate="no"
                      >
                        {sibling.path}
                      </span>
                      <h3 className="mt-3 font-semibold text-base text-foreground leading-snug">
                        {siblingTitle}
                      </h3>
                      <span className="mt-auto inline-flex items-center gap-1 pt-6 font-mono text-[11px] text-muted-foreground transition-colors group-hover/sib:text-foreground">
                        <ArrowUpRight aria-hidden="true" className="size-3" />
                      </span>
                    </div>
                  </MagicCard>
                </Link>
              );
            })}
          </AnimateInGroup>
        </section>
      ) : null}

      <FooterMinimal />
    </main>
  );
}
