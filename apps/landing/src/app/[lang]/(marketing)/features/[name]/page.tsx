import { CodeBlock } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CAPABILITY_FOLDERS,
  type CapabilityFolder,
} from "@/components/landing/features/capability-folder-data";
import {
  type FeatureCodeSample,
  getCodeSampleForEntry,
} from "@/components/landing/features/feature-code-samples";
import { getGroupTokens } from "@/components/landing/features/feature-group-tokens";
import { getGlyphCopy, getSubpackageGlyph } from "@/components/landing/features/glyphs";
import {
  getFeatureSummary,
  getGroupLabel,
  getPackageFeatureEntry,
  PACKAGE_FEATURE_ENTRIES,
  type PackageCatalogTranslator,
  type PackageFeatureEntry,
  toSerializablePackageFeatureEntry,
} from "@/components/landing/features/package-feature-data";
import {
  PackageCard,
  PackageRows,
  sourceSentence,
  TopologyList,
} from "@/components/landing/features/package-parts";
import { getPackageShowcase, getShowcaseCopy } from "@/components/landing/features/showcases";
import { Link } from "@/i18n/navigation";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { isHighSignalFeatureEntry } from "@/lib/seo/route-registry";
import { defaultPublicationSet, unpublishedSet } from "@/lib/seo/site-routes";
import { REPO_URL } from "@/nebutra/data/repo";
import { siteLang } from "@/nebutra/i18n";
import { Band, Intro } from "@/nebutra/ui/page";

type FeatureDetailPageProps = {
  params: Promise<{ lang: string; name: string }>;
};

type Lang = "en" | "zh";

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

function titleOf(entry: PackageFeatureEntry, t: PackageCatalogTranslator): string {
  if (entry.kind === "package") return entry.label;
  const folder = folderFor(entry);
  return folder ? t(`folders.${folder.id}.title`) : getGroupLabel(entry.group, t);
}

async function packageCatalogT(lang: string): Promise<PackageCatalogTranslator> {
  return (await getTranslations({
    locale: lang,
    namespace: "packageCatalog",
  })) as unknown as PackageCatalogTranslator;
}

export async function generateMetadata({ params }: FeatureDetailPageProps): Promise<Metadata> {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const entry = getPackageFeatureEntry(name);
  if (!entry) return {};

  const t = await packageCatalogT(lang);
  const path = `/features/${entry.slug}`;
  // A `package` entry is auto-flattened from the file tree: served (and reachable
  // from its domain page) but never a canonical document, so it is published in
  // zero locales rather than being an indexable near-duplicate orphan that no
  // sitemap lists.
  return buildPageMetadata({
    title: `${titleOf(entry, t)} — Nebutra`,
    description: getFeatureSummary(entry, t),
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
  const locale: Lang = siteLang(lang);
  const t = await packageCatalogT(lang);

  return entry.kind === "package" ? (
    <PackagePage entry={entry} locale={locale} t={t} />
  ) : (
    <DomainPage entry={entry} locale={locale} t={t} />
  );
}

type PageProps = { entry: PackageFeatureEntry; locale: Lang; t: PackageCatalogTranslator };

/** A domain: how it fits together, what it owns, its code, and every package in it. */
function DomainPage({ entry, locale, t }: PageProps) {
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
        <div className="relative z-10 mx-auto w-full max-w-content">
          <BackLink href={`/features`} label={t("page.allPackages")} />
          <Intro
            level={1}
            lang={locale}
            className="mt-8"
            title={titleOf(entry, t)}
            lead={folder ? t(`folders.${folder.id}.summary`) : getFeatureSummary(entry, t)}
            cn={locale === "en" && folder ? t(`folders.${folder.id}.titleCn`) : undefined}
          />
          <SourceLine
            entry={entry}
            t={t}
            sentence={folder ? sourceSentence(folder, t) : undefined}
          />
        </div>
      </section>

      {folder ? (
        <Band id="topology">
          <div className="mx-auto w-full max-w-content">
            <Intro
              title={t(`folders.${folder.id}.topology.title`)}
              lead={t(`folders.${folder.id}.topology.caption`)}
            />
            <div className="mt-12">
              <TopologyList folderId={folder.id} nodes={folder.topology.nodes} t={t} />
            </div>
          </div>
        </Band>
      ) : null}

      {folder ? (
        <Band>
          <div className="mx-auto w-full max-w-content">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              <Principles
                heading={t("page.owns")}
                folderId={folder.id}
                field="owns"
                count={folder.ownsCount}
                t={t}
              />
              <Principles
                heading={t("page.stops")}
                folderId={folder.id}
                field="boundaries"
                count={folder.boundariesCount}
                t={t}
              />
              <Principles
                heading={t("page.proof")}
                folderId={folder.id}
                field="proof"
                count={folder.proofCount}
                t={t}
              />
            </div>
          </div>
        </Band>
      ) : null}

      {sample ? <CodeBand sample={sample} label={titleOf(entry, t)} t={t} /> : null}

      {packages.length > 0 ? (
        <Band id="packages">
          <div className="mx-auto w-full max-w-content">
            <Intro
              title={t("page.packages")}
              lead={t("page.packagesCount", { count: packages.length, path: entry.path })}
            />
            {withGlyph.length > 0 ? (
              <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {withGlyph.map((p) => (
                  <PackageCard key={p.slug} entry={p} href={hrefFor(p)} t={t} />
                ))}
              </div>
            ) : null}
            {withoutGlyph.length > 0 ? (
              <div className="mt-12">
                <PackageRows entries={withoutGlyph} hrefFor={hrefFor} t={t} />
              </div>
            ) : null}
          </div>
        </Band>
      ) : null}
    </main>
  );
}

/** One package: what it is, what it looks like at work, its code, its neighbours. */
function PackagePage({ entry, t }: PageProps) {
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
  const domainTitle = domain ? titleOf(domain, t) : entry.group;

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-20 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10 mx-auto w-full max-w-content">
          <BackLink
            href={`/features/${domain?.slug ?? ""}`}
            label={domain ? domainTitle : t("page.allPackages")}
          />
          <Intro
            level={1}
            className="mt-8"
            title={<span translate="no">{entry.label}</span>}
            lead={getFeatureSummary(entry, t)}
          />
          <SourceLine entry={entry} t={t} />
        </div>
      </section>

      {Showcase ? (
        <Band id="showcase">
          <div className="mx-auto w-full max-w-content">
            <Showcase entry={serializable} copy={getShowcaseCopy(entry.slug, t)} />
          </div>
        </Band>
      ) : Glyph ? (
        <Band id="showcase">
          <div className="mx-auto w-full max-w-content">
            <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-border bg-card p-6">
              <Glyph entry={serializable} copy={getGlyphCopy(entry.slug, t)} />
            </div>
          </div>
        </Band>
      ) : null}

      {sample ? <CodeBand sample={sample} label={entry.label} t={t} /> : null}

      {siblings.length > 0 && domain ? (
        <Band>
          <div className="mx-auto w-full max-w-content">
            <Intro title={t("page.moreInDomain", { domain: domainTitle })} />
            <div className="mt-12">
              <PackageRows entries={siblings} hrefFor={(p) => `/features/${p.slug}`} t={t} />
            </div>
            <Link
              href={`/features/${domain.slug}`}
              className="mt-10 inline-flex items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
            >
              {t("page.allPackagesInDomain", { count: domain.children.length })}
              <span aria-hidden>→</span>
            </Link>
          </div>
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
  t,
  sentence,
}: {
  entry: PackageFeatureEntry;
  t: PackageCatalogTranslator;
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
        {t("page.source")} ↗
      </a>{" "}
      ·{" "}
      <a href={createPublicDocsUrl(getGroupTokens(entry.group).docsPath)} className={link}>
        {t("page.docs")} ↗
      </a>
    </p>
  );
}

function Principles({
  heading,
  folderId,
  field,
  count,
  t,
}: {
  heading: string;
  folderId: string;
  field: "owns" | "boundaries" | "proof";
  count: number;
  t: PackageCatalogTranslator;
}) {
  const items = Array.from({ length: count }, (_, i) => t(`folders.${folderId}.${field}.${i}`));
  return (
    <div>
      <h2 className="font-heading text-lg text-foreground">{heading}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodeBand({
  sample,
  label,
  t,
}: {
  sample: FeatureCodeSample;
  label: string;
  t: PackageCatalogTranslator;
}) {
  return (
    <Band id="usage">
      <div className="mx-auto w-full max-w-content">
        <Intro title={t("page.inCode")} />
        <div className="mt-12">
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
      </div>
    </Band>
  );
}
