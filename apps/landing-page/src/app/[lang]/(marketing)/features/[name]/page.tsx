import { ArrowRight, ArrowUpRight, Box, GitBranch, Shield } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Badge, CodeBlock, MagicCard } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { FeatureHero } from "@/components/landing/features/FeatureHero";
import { getCodeSampleForEntry } from "@/components/landing/features/feature-code-samples";
import { getGroupTokens } from "@/components/landing/features/feature-group-tokens";
import { getSubpackageGlyph } from "@/components/landing/features/glyphs";
import {
  getFeatureSummary,
  getFeatureTitle,
  getGroupLabel,
  getPackageFeatureEntry,
  getRelatedEntries,
  PACKAGE_FEATURE_ENTRIES,
  toSerializablePackageFeatureEntry,
} from "@/components/landing/features/package-feature-data";
import { resolveShowcase } from "@/components/landing/features/showcases";
import { ShowcaseFrame } from "@/components/landing/features/showcases/showcase-frame";
import { type Locale, routing } from "@/i18n/routing";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { buildPageMetadata } from "@/lib/seo/metadata";

type FeatureDetailPageProps = {
  params: Promise<{ lang: string; name: string }>;
};

const localeForCopy = (lang: string): "en" | "zh" => (lang === "zh" ? "zh" : "en");

const COPY = {
  back: { en: "All features", zh: "全部能力" },
  package: { en: "package", zh: "能力包" },
  surface: { en: "surface", zh: "能力面" },
  openDocs: { en: "Open docs", zh: "打开文档" },
  related: { en: "More in domain", zh: "同能力域" },
  explore: { en: "Explore", zh: "查看" },
  kindPackage: { en: "Package", zh: "能力包" },
  kindGroup: { en: "Group", zh: "能力组" },
  kindCapability: { en: "Capability", zh: "能力面" },
  // Governance strip
  govStability: { en: "Stability", zh: "稳定性" },
  govStable: { en: "Stable", zh: "稳定" },
  govBoundary: { en: "Boundary", zh: "边界" },
  govOwners: { en: "Owners", zh: "归属" },
  govScope: { en: "Scope", zh: "作用域" },
  govScopeTenant: { en: "Tenant-scoped", zh: "按租户隔离" },
  govScopeRequest: { en: "Request-scoped", zh: "按请求隔离" },
  govScopeGlobal: { en: "Global", zh: "全局" },
  // Code section
  codeUsage: { en: "Usage", zh: "使用方式" },
} as const;

function kindLabel(kind: "package" | "group" | "capability", locale: "en" | "zh") {
  if (kind === "package") return COPY.kindPackage[locale];
  if (kind === "group") return COPY.kindGroup[locale];
  return COPY.kindCapability[locale];
}

/**
 * Derive the runtime scope label from the capability group. iam runs per
 * tenant, gateway runs per request, everything else is treated as global.
 * Returning a single tag avoids inventing per-package metadata we don't have.
 */
function scopeLabel(group: string, locale: "en" | "zh") {
  if (group === "iam" || group === "commerce") return COPY.govScopeTenant[locale];
  if (group === "gateway") return COPY.govScopeRequest[locale];
  return COPY.govScopeGlobal[locale];
}

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
  const meta = getGroupTokens(entry.group);
  const sample = getCodeSampleForEntry(entry);
  const Showcase = resolveShowcase(entry.slug, entry.group);
  const related = getRelatedEntries(entry, 4);
  const docsHref = createPublicDocsUrl(meta.docsPath);
  const serializableEntry = toSerializablePackageFeatureEntry(entry);

  const suffix = entry.kind === "package" ? COPY.package[locale] : COPY.surface[locale];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      id="main-content"
    >
      <Navbar />

      {/* HERO */}
      <FeatureHero
        backHref={`/${lang}/features`}
        backLabel={COPY.back[locale]}
        tokens={meta}
        eyebrow={groupLabel}
        path={entry.path}
        titlePrefix={entry.label}
        titleSuffix={suffix}
        summary={summary}
        primaryCtaHref={docsHref}
        primaryCtaLabel={COPY.openDocs[locale]}
      />

      {/* GOVERNANCE — small below-hero strip giving the package's
          stability, scope, and boundary at a glance. */}
      <section className="relative z-10 mx-auto -mt-6 max-w-[1400px] px-4 pb-10 sm:px-6 lg:px-8">
        <AnimateIn preset="fade" inView delay={0.05}>
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/40 pt-5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
            <div className="flex items-center gap-2">
              <Shield aria-hidden="true" className="size-3 text-foreground/60" />
              <dt className="sr-only">{COPY.govStability[locale]}</dt>
              <dd className="flex items-center gap-1.5">
                <span
                  className="inline-block size-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span className="text-foreground/85">{COPY.govStable[locale]}</span>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Box aria-hidden="true" className="size-3 text-foreground/60" />
              <dt className="sr-only">{COPY.govScope[locale]}</dt>
              <dd className="text-foreground/85">{scopeLabel(entry.group, locale)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch aria-hidden="true" className="size-3 text-foreground/60" />
              <dt className="sr-only">{COPY.govBoundary[locale]}</dt>
              <dd
                className="font-mono normal-case tracking-normal text-foreground/85"
                translate="no"
              >
                {entry.path}
              </dd>
            </div>
            <div className="ml-auto hidden items-center gap-2 md:flex">
              <dt className="sr-only">{COPY.govOwners[locale]}</dt>
              <dd
                className="font-mono normal-case tracking-normal text-foreground/85"
                translate="no"
              >
                @nebutra/{entry.group}
              </dd>
            </div>
          </dl>
        </AnimateIn>
      </section>

      {/* SHOWCASE */}
      {Showcase ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-[var(--section-gap-md)] sm:px-6 lg:px-8">
          <AnimateIn preset="fadeUp" inView>
            <Showcase entry={serializableEntry} locale={locale} />
          </AnimateIn>
        </section>
      ) : null}

      {/* CODE — wrapped in ShowcaseFrame so it shares panel chrome with the Showcase above */}
      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-[var(--section-gap-md)] sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp" inView>
          <div className="mb-4 flex items-end justify-between gap-4 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em]">
                {COPY.codeUsage[locale]}
              </span>
              <Badge
                variant="secondary"
                size="sm"
                className="font-mono normal-case tracking-normal"
                translate="no"
              >
                {sample.filename}
              </Badge>
            </div>
            <Badge
              variant="outline"
              size="sm"
              className="font-mono uppercase tracking-[0.18em]"
              translate="no"
            >
              {sample.language}
            </Badge>
          </div>
          <ShowcaseFrame className="border-0 p-0! md:p-0! overflow-hidden">
            <CodeBlock
              filename={sample.filename}
              language={sample.language}
              highlightedLines={sample.highlightedLines}
              maxHeight="540px"
              aria-label={`${entry.label} usage example`}
            >
              {sample.code}
            </CodeBlock>
          </ShowcaseFrame>
        </AnimateIn>
      </section>

      {/* SUB-PACKAGES */}
      {entry.children.length > 0 ? (
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-[var(--section-gap-md)] sm:px-6 lg:px-8">
          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {entry.children.map((child) => {
              const childEntry = getPackageFeatureEntry(child);
              // Strip the trailing " package" / "能力包" so we don't repeat the
              // Kind badge next to it.
              const childTitle = childEntry?.label ?? child;
              const childDesc = childEntry
                ? getFeatureSummary(childEntry, locale)
                : locale === "zh"
                  ? `${child} — ${entry.label} 能力域中的子 package。`
                  : `${child} — sub-package inside ${entry.label}.`;
              const childKind = childEntry?.kind ?? "package";
              const Glyph = getSubpackageGlyph(child);
              const serializableChildEntry = childEntry
                ? toSerializablePackageFeatureEntry(childEntry)
                : null;
              return (
                <Link
                  key={child}
                  href={`/${lang}/features/${child}`}
                  className="group/sub block rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <MagicCard
                    className="h-full rounded-[var(--radius-card)] overflow-hidden"
                    gradientSize={220}
                    gradientFrom={meta.auroraColors[0]}
                    gradientTo={meta.auroraColors[1]}
                  >
                    {/* Bespoke glyph hero (if a designer landed one) */}
                    {Glyph && serializableChildEntry ? (
                      <div className="border-b border-border/40 bg-background/40 p-4">
                        <Glyph entry={serializableChildEntry} locale={locale} />
                      </div>
                    ) : null}

                    <div className="flex flex-col p-6">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="font-mono text-foreground/85 text-xs" translate="no">
                          {child}
                        </span>
                        <Badge
                          variant="outline"
                          size="sm"
                          className="font-mono uppercase tracking-[0.18em]"
                        >
                          {kindLabel(childKind, locale)}
                        </Badge>
                      </div>
                      <h3
                        className="font-semibold text-foreground text-lg leading-snug"
                        translate="no"
                      >
                        {childTitle}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                        {childDesc}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] transition-colors group-hover/sub:text-foreground">
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
        <section className="relative z-10 mx-auto max-w-[1400px] px-4 pt-12 pb-[var(--section-gap-lg)] sm:px-6 lg:px-8">
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
              const siblingDesc = getFeatureSummary(sibling, locale);
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-foreground/85 text-xs" translate="no">
                          {sibling.label}
                        </span>
                        <Badge
                          variant="outline"
                          size="sm"
                          className="font-mono uppercase tracking-[0.18em]"
                        >
                          {kindLabel(sibling.kind, locale)}
                        </Badge>
                      </div>
                      <span
                        className="mt-3 font-mono text-[10px] text-muted-foreground/80 normal-case tracking-normal"
                        translate="no"
                      >
                        {sibling.path}
                      </span>
                      <p className="mt-3 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                        {siblingDesc}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] transition-colors group-hover/sib:text-foreground">
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

      <FooterMinimal />
    </main>
  );
}
