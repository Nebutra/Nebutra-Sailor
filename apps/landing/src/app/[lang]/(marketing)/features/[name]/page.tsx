import { CodeBlock } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  CAPABILITY_FOLDERS,
  type CapabilityFolder,
} from "@/components/landing/features/capability-folder-data";
import {
  type FeatureCodeSample,
  getCodeSampleForEntry,
} from "@/components/landing/features/feature-code-samples";
import { getGroupTokens } from "@/components/landing/features/feature-group-tokens";
import { getSubpackageGlyph } from "@/components/landing/features/glyphs";
import {
  getFeatureSummary,
  getGroupLabel,
  getPackageFeatureEntry,
  PACKAGE_FEATURE_ENTRIES,
  type PackageFeatureEntry,
  toSerializablePackageFeatureEntry,
} from "@/components/landing/features/package-feature-data";
import {
  PackageCard,
  PackageRows,
  sourceSentence,
  TopologyList,
} from "@/components/landing/features/package-parts";
import { getPackageShowcase } from "@/components/landing/features/showcases";
import { Link } from "@/i18n/navigation";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { isHighSignalFeatureEntry } from "@/lib/seo/route-registry";
import { defaultPublicationSet, unpublishedSet } from "@/lib/seo/site-routes";
import { REPO_URL } from "@/nebutra/data/repo";
import { Band, Intro } from "@/nebutra/ui/page";

type FeatureDetailPageProps = {
  params: Promise<{ lang: string; name: string }>;
};

type Lang = "en" | "zh";

const COPY = {
  allPackages: { en: "Packages", zh: "全部功能包" },
  docs: { en: "Docs", zh: "文档" },
  source: { en: "Source", zh: "源码" },
  inCode: { en: "In code", zh: "代码里" },
  owns: { en: "What it owns", zh: "它负责什么" },
  stops: { en: "Where it stops", zh: "它的边界" },
  proof: { en: "How we know it works", zh: "怎么证明它能用" },
  packages: { en: "Packages", zh: "功能包" },
} as const;

/**
 * Params outside generateStaticParams render on demand as a blocking route
 * rather than streaming behind a <Suspense> fallback: a streamed page reaches a
 * reader without JavaScript as its fallback (scripts/verify-landing-ssr.mjs).
 */
export const instant = false;

export function generateStaticParams() {
  // Same predicate the sitemap uses — one definition of "worth indexing", so
  // the prerender set and the published set cannot drift apart.
  const highSignalEntries = PACKAGE_FEATURE_ENTRIES.filter(isHighSignalFeatureEntry);
  return prerenderDefaultLocale(highSignalEntries, (entry) => ({ name: entry.slug }));
}

function folderFor(entry: PackageFeatureEntry): CapabilityFolder | undefined {
  return CAPABILITY_FOLDERS.find((f) => f.id === entry.group);
}

function domainOf(entry: PackageFeatureEntry): PackageFeatureEntry | undefined {
  return PACKAGE_FEATURE_ENTRIES.find((e) => e.kind !== "package" && e.group === entry.group);
}

function titleOf(entry: PackageFeatureEntry, locale: Lang): string {
  if (entry.kind === "package") return entry.label;
  return folderFor(entry)?.title[locale] ?? getGroupLabel(entry.group, locale);
}

export async function generateMetadata({ params }: FeatureDetailPageProps): Promise<Metadata> {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const entry = getPackageFeatureEntry(name);
  if (!entry) return {};

  const locale: Lang = isZhUiLocale(lang) ? "zh" : "en";
  const path = `/features/${entry.slug}`;
  // A `package` entry is auto-flattened from the file tree: served (and reachable
  // from its domain page) but never a canonical document, so it is published in
  // zero locales rather than being an indexable near-duplicate orphan that no
  // sitemap lists.
  return buildPageMetadata({
    title: `${titleOf(entry, locale)} — Nebutra`,
    description: getFeatureSummary(entry, locale),
    path,
    locale: lang as Locale,
    publishedIn: isHighSignalFeatureEntry(entry)
      ? defaultPublicationSet(path)
      : unpublishedSet(path),
  });
}

export default async function FeatureDetailPage({ params }: FeatureDetailPageProps) {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();

  const entry = getPackageFeatureEntry(name);
  if (!entry) notFound();

  setRequestLocale(lang as Locale);
  const locale: Lang = isZhUiLocale(lang) ? "zh" : "en";

  return entry.kind === "package" ? (
    <PackagePage entry={entry} locale={locale} />
  ) : (
    <DomainPage entry={entry} locale={locale} />
  );
}

type PageProps = { entry: PackageFeatureEntry; locale: Lang };

/** A domain: how it fits together, what it owns, its code, and every package in it. */
function DomainPage({ entry, locale }: PageProps) {
  const folder = folderFor(entry);
  const sample = getCodeSampleForEntry(entry);
  const packages = entry.children
    .map((slug) => getPackageFeatureEntry(slug))
    .filter((e): e is PackageFeatureEntry => e?.kind === "package");
  const withGlyph = packages.filter((p) => getSubpackageGlyph(p.slug));
  const withoutGlyph = packages.filter((p) => !getSubpackageGlyph(p.slug));
  const hrefFor = (p: PackageFeatureEntry) => `/features/${p.slug}`;

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-20 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <BackLink href={`/features`} label={COPY.allPackages[locale]} />
          <Intro
            level={1}
            className="mt-8"
            title={titleOf(entry, locale)}
            lead={folder ? folder.summary[locale] : getFeatureSummary(entry, locale)}
            cn={locale === "en" ? folder?.title.zh : undefined}
          />
          <SourceLine
            entry={entry}
            locale={locale}
            sentence={folder ? sourceSentence(folder, locale) : undefined}
          />
        </div>
      </section>

      {folder ? (
        <Band id="topology">
          <Intro title={folder.topology.title[locale]} lead={folder.topology.caption[locale]} />
          <div className="mt-12 max-w-4xl">
            <TopologyList nodes={folder.topology.nodes} locale={locale} />
          </div>
        </Band>
      ) : null}

      {folder ? (
        <Band>
          <div className="grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-3">
            <Principles heading={COPY.owns[locale]} items={folder.owns} locale={locale} />
            <Principles heading={COPY.stops[locale]} items={folder.boundaries} locale={locale} />
            <Principles heading={COPY.proof[locale]} items={folder.proof} locale={locale} />
          </div>
        </Band>
      ) : null}

      {sample ? <CodeBand sample={sample} label={titleOf(entry, locale)} locale={locale} /> : null}

      {packages.length > 0 ? (
        <Band id="packages">
          <Intro
            title={COPY.packages[locale]}
            lead={
              locale === "zh"
                ? `${entry.path} 下的 ${packages.length} 个包。`
                : `${packages.length} packages in ${entry.path}.`
            }
          />
          {withGlyph.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {withGlyph.map((p) => (
                <PackageCard key={p.slug} entry={p} href={hrefFor(p)} locale={locale} />
              ))}
            </div>
          ) : null}
          {withoutGlyph.length > 0 ? (
            <div className="mt-12 max-w-4xl">
              <PackageRows entries={withoutGlyph} hrefFor={hrefFor} locale={locale} />
            </div>
          ) : null}
        </Band>
      ) : null}
    </main>
  );
}

/** One package: what it is, what it looks like at work, its code, its neighbours. */
function PackagePage({ entry, locale }: PageProps) {
  const domain = domainOf(entry);
  const Showcase = getPackageShowcase(entry.slug);
  const Glyph = Showcase ? null : getSubpackageGlyph(entry.slug);
  const sample = getCodeSampleForEntry(entry);
  const serializable = toSerializablePackageFeatureEntry(entry);
  const siblings = (domain?.children ?? [])
    .filter((slug) => slug !== entry.slug)
    .map((slug) => getPackageFeatureEntry(slug))
    .filter((e): e is PackageFeatureEntry => e?.kind === "package")
    .slice(0, 6);
  const domainTitle = domain ? titleOf(domain, locale) : entry.group;

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-20 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <BackLink
            href={`/features/${domain?.slug ?? ""}`}
            label={domain ? domainTitle : COPY.allPackages[locale]}
          />
          <Intro
            level={1}
            className="mt-8"
            title={<span translate="no">{entry.label}</span>}
            lead={getFeatureSummary(entry, locale)}
          />
          <SourceLine entry={entry} locale={locale} />
        </div>
      </section>

      {Showcase ? (
        <Band id="showcase">
          <Showcase entry={serializable} locale={locale} />
        </Band>
      ) : Glyph ? (
        <Band id="showcase">
          <div className="max-w-2xl rounded-[var(--radius-card)] border border-border bg-card p-6">
            <Glyph entry={serializable} locale={locale} />
          </div>
        </Band>
      ) : null}

      {sample ? <CodeBand sample={sample} label={entry.label} locale={locale} /> : null}

      {siblings.length > 0 && domain ? (
        <Band>
          <Intro title={locale === "zh" ? `${domainTitle}里的其他包` : `More in ${domainTitle}`} />
          <div className="mt-12 max-w-4xl">
            <PackageRows
              entries={siblings}
              hrefFor={(p) => `/features/${p.slug}`}
              locale={locale}
            />
          </div>
          <Link
            href={`/features/${domain.slug}`}
            className="mt-10 inline-flex items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
          >
            {locale === "zh"
              ? `全部 ${domain.children.length} 个包`
              : `All ${domain.children.length} packages`}
            <span aria-hidden>→</span>
          </Link>
        </Band>
      ) : null}
    </main>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
    >
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}

/** Where the code lives, and the two ways to read more: the docs and the source. */
function SourceLine({
  entry,
  locale,
  sentence,
}: {
  entry: PackageFeatureEntry;
  locale: Lang;
  sentence?: string;
}) {
  const link =
    "text-secondary-foreground underline-offset-4 transition-colors duration-micro hover:text-foreground hover:underline";
  return (
    <p className="mt-8 text-sm text-muted-foreground">
      {sentence ? (
        sentence
      ) : (
        <code className="font-mono" translate="no">
          {entry.path}
        </code>
      )}{" "}
      ·{" "}
      <a href={`${REPO_URL}/tree/main/${entry.path}`} className={link}>
        {COPY.source[locale]} ↗
      </a>{" "}
      ·{" "}
      <a href={createPublicDocsUrl(getGroupTokens(entry.group).docsPath)} className={link}>
        {COPY.docs[locale]} ↗
      </a>
    </p>
  );
}

function Principles({
  heading,
  items,
  locale,
}: {
  heading: string;
  items: CapabilityFolder["owns"];
  locale: Lang;
}) {
  return (
    <div>
      <h2 className="font-heading text-lg text-foreground">{heading}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.en} className="text-sm text-muted-foreground">
            {item[locale]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodeBand({
  sample,
  label,
  locale,
}: {
  sample: FeatureCodeSample;
  label: string;
  locale: Lang;
}) {
  return (
    <Band id="usage">
      <Intro title={COPY.inCode[locale]} />
      <div className="mt-12 max-w-4xl">
        <CodeBlock
          filename={sample.filename}
          language={sample.language}
          highlightedLines={sample.highlightedLines}
          maxHeight="540px"
          aria-label={`${label} usage example`}
        >
          {sample.code}
        </CodeBlock>
      </div>
    </Band>
  );
}
