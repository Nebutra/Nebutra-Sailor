import {
  Api,
  ArrowRight,
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
import { Badge } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ComponentType } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import { FeatureBentoCard } from "@/components/landing/features/FeatureBentoCard";
import {
  AIMockup,
  BillingMockup,
  DataMockup,
  DXMockup,
  MultiTenantMockup,
  SecurityMockup,
} from "@/components/landing/features/FeatureMockups";
import { FeatureSmallCard } from "@/components/landing/features/FeatureSmallCard";
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
  color: string;
  mockup: ComponentType;
  docsPath: string;
};

// Map each capability group to the existing FeatureMockups visualization,
// the icon used on the index page bento, and the canonical docs landing.
const GROUP_META: Record<string, GroupMeta> = {
  ai: {
    icon: Cpu,
    color: "var(--purple-9)",
    mockup: AIMockup,
    docsPath: "ai/overview",
  },
  iam: {
    icon: Shield,
    color: "var(--red-9)",
    mockup: SecurityMockup,
    docsPath: "concepts/permissions",
  },
  integrations: {
    icon: Connection,
    color: "var(--cyan-9)",
    mockup: AIMockup,
    docsPath: "integrations/overview",
  },
  platform: {
    icon: Database,
    color: "var(--blue-9)",
    mockup: MultiTenantMockup,
    docsPath: "database/overview",
  },
  design: {
    icon: Droplet,
    color: "var(--cyan-9)",
    mockup: DataMockup,
    docsPath: "design/tokens",
  },
  commerce: {
    icon: CreditCard,
    color: "var(--blue-9)",
    mockup: BillingMockup,
    docsPath: "payments/overview",
  },
  gateway: {
    icon: Api,
    color: "var(--emerald-9)",
    mockup: DXMockup,
    docsPath: "development/api-gateway",
  },
  ops: {
    icon: TerminalSquare,
    color: "var(--emerald-9)",
    mockup: DXMockup,
    docsPath: "development/project-structure",
  },
};

const DEFAULT_META: GroupMeta = {
  icon: Layers,
  color: "var(--blue-9)",
  mockup: MultiTenantMockup,
  docsPath: "development/project-structure",
};

const COPY = {
  back: { en: "all features", zh: "全部能力" },
  badge: { en: "capability surface", zh: "能力面" },
  cta: { en: "Explore feature", zh: "探索功能" },
  contracts: { en: "Contracts", zh: "契约" },
  contractsDesc: {
    en: "Sub-packages composing this capability, each with its own stable interface.",
    zh: "构成这个能力的子 package，每个都有自己稳定的接口边界。",
  },
  contractsEmpty: {
    en: "This is a leaf package — no further sub-packages.",
    zh: "这是叶子 package — 没有更细的子包。",
  },
  related: { en: "Same capability domain", zh: "同能力域" },
  relatedDesc: {
    en: "Sibling packages inside the same capability domain.",
    zh: "同一能力域里的姐妹 package。",
  },
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

  const title = getFeatureTitle(entry, locale);
  const summary = getFeatureSummary(entry, locale);
  const groupLabel = getGroupLabel(entry.group, locale);
  const meta = GROUP_META[entry.group] ?? DEFAULT_META;
  const Icon = meta.icon;
  const related = getRelatedEntries(entry, 4);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      id="main-content"
    >
      <Navbar />

      {/* Hero */}
      <section className="relative mx-auto max-w-[1400px] px-4 pt-32 pb-12 sm:px-6 lg:px-8">
        <AnimateIn preset="fade" inView>
          <Link
            className="group/back inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground transition-colors hover:text-foreground"
            href={`/${lang}/features`}
          >
            <ArrowRight className="size-3 rotate-180" aria-hidden="true" />
            <span>{COPY.back[locale]}</span>
          </Link>
        </AnimateIn>

        <AnimateIn preset="fade" inView delay={0.05}>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm" className="font-mono uppercase tracking-[0.18em]">
              <span
                className="inline-flex items-center"
                style={{ color: meta.color }}
                aria-hidden="true"
              >
                <Icon className="size-3" />
              </span>
              <span className="ml-1.5">{groupLabel}</span>
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
            className="mt-6 font-semibold text-4xl leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ letterSpacing: "var(--tracking-display)" }}
          >
            {title}
          </h1>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView delay={0.18}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {summary}
          </p>
        </AnimateIn>
      </section>

      {/* Featured bento card — uses the same FeatureBentoCard component the
          index page renders, so the visual language stays identical. */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-12 sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp" inView>
          <div className="h-[420px] sm:h-[480px] lg:h-[520px]">
            <FeatureBentoCard
              href={createPublicDocsUrl(meta.docsPath)}
              icon={Icon}
              color={meta.color}
              mockup={meta.mockup}
              title={title}
              description={summary}
              ctaLabel={COPY.cta[locale]}
            />
          </div>
        </AnimateIn>
      </section>

      {/* Contracts strip — children of this entry rendered as small cards */}
      {entry.children.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
          <AnimateIn preset="fade" inView>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="font-bold text-primary text-xs uppercase tracking-[0.2em]">
                  {COPY.contracts[locale]}
                </p>
                <h2 className="mt-2 max-w-2xl font-semibold text-2xl text-foreground sm:text-3xl">
                  {locale === "zh"
                    ? `${entry.children.length} 个子能力`
                    : `${entry.children.length} sub-packages`}
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">{COPY.contractsDesc[locale]}</p>
              </div>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {entry.children.map((child) => {
              const childEntry = getPackageFeatureEntry(child);
              const childTitle = childEntry ? getFeatureTitle(childEntry, locale) : child;
              const childDesc = childEntry
                ? getFeatureSummary(childEntry, locale)
                : locale === "zh"
                  ? `${child} — ${entry.label} 能力域中的子包。`
                  : `${child} — sub-package inside ${entry.label}.`;
              return (
                <Link
                  key={child}
                  href={`/${lang}/features/${child}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-card)]"
                >
                  <FeatureSmallCard icon={Icon} title={childTitle} description={childDesc} />
                </Link>
              );
            })}
          </AnimateInGroup>
        </section>
      ) : null}

      {/* Related — sibling packages in the same group */}
      {related.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-8">
          <AnimateIn preset="fade" inView>
            <div className="mb-6 flex items-end justify-between border-t border-border/40 pt-12">
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
                <span>{locale === "zh" ? "查看能力域" : "View domain"}</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {related.map((sibling) => {
              const siblingTitle = getFeatureTitle(sibling, locale);
              const siblingDesc = getFeatureSummary(sibling, locale);
              return (
                <Link
                  key={sibling.slug}
                  href={`/${lang}/features/${sibling.slug}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-card)]"
                >
                  <FeatureSmallCard icon={Icon} title={siblingTitle} description={siblingDesc} />
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
