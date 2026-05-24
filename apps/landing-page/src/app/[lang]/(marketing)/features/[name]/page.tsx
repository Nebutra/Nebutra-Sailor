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
import { AuroraBackground, AuroraText, Badge, CodeBlock, MagicCard } from "@nebutra/ui/primitives";
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
import { resolveShowcase } from "@/components/landing/features/showcases";
import { type Locale, routing } from "@/i18n/routing";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { buildPageMetadata } from "@/lib/seo/metadata";

type FeatureDetailPageProps = {
  params: Promise<{ lang: string; name: string }>;
};

const localeForCopy = (lang: string): "en" | "zh" => (lang === "zh" ? "zh" : "en");

type GroupMeta = {
  icon: ComponentType<{ className?: string }>;
  auroraColors: string[];
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
  package: { en: "package", zh: "能力包" },
  surface: { en: "surface", zh: "能力面" },
  openDocs: { en: "Open docs", zh: "打开文档" },
  related: { en: "More in domain", zh: "同能力域" },
  explore: { en: "Explore", zh: "查看" },
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
  const Showcase = resolveShowcase(entry.slug, entry.group);
  const related = getRelatedEntries(entry, 4);
  const docsHref = createPublicDocsUrl(meta.docsPath);

  const suffix = entry.kind === "package" ? COPY.package[locale] : COPY.surface[locale];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      id="main-content"
    >
      <Navbar />

      {/* HERO */}
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
          <a
            href={docsHref}
            target="_blank"
            rel="noreferrer"
            className="group/cta mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-semibold text-background text-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {COPY.openDocs[locale]}
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
            />
          </a>
        </AnimateIn>
      </section>

      {/* SHOWCASE */}
      {Showcase ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
          <AnimateIn preset="fadeUp" inView>
            <Showcase entry={{ ...entry, icon: undefined }} locale={locale} />
          </AnimateIn>
        </section>
      ) : null}

      {/* CODE */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp" inView>
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

      {/* SUB-PACKAGES */}
      {entry.children.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
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
                        {COPY.explore[locale]}
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

      {/* RELATED */}
      {related.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pt-12 pb-32 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between border-t border-border/40 pt-6 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em]">
            <span>
              {COPY.related[locale]} · {groupLabel}
            </span>
            <Link
              className="hidden items-center gap-1.5 transition-colors hover:text-foreground sm:inline-flex"
              href={`/${lang}/features#capability-${entry.group}`}
            >
              {locale === "zh" ? "查看能力域" : "View domain"}
              <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          </div>

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
