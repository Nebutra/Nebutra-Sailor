import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommandInstallBox } from "@/components/landing/CommandInstallBox";
import {
  CAPABILITY_FOLDERS,
  type CapabilityFolder,
} from "@/components/landing/features/capability-folder-data";
import {
  getFeatureSummary,
  getGroupLabel,
  getPackageFeatureEntry,
  PACKAGE_FEATURE_ENTRIES,
  type PackageCatalogTranslator,
  type PackageFeatureEntry,
} from "@/components/landing/features/package-feature-data";
import {
  GlyphBento,
  sourceSentence,
  TopologyList,
} from "@/components/landing/features/package-parts";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

/**
 * The package index: one band per domain, in CAPABILITY_FOLDERS order, each
 * with how it fits together and every package it holds. Every figure is from
 * the generated stats capability-folder-data.test.ts holds to the repository.
 * Copy lives in the `packageCatalog` i18n namespace
 * (apps/landing/messages/*.json), read here via getTranslations().
 */

const DOMAINS = PACKAGE_FEATURE_ENTRIES.filter((e) => e.kind !== "package");
const PACKAGE_COUNT = PACKAGE_FEATURE_ENTRIES.filter((e) => e.kind === "package").length;

function folderFor(domain: PackageFeatureEntry): CapabilityFolder | undefined {
  return CAPABILITY_FOLDERS.find((f) => f.id === domain.slug);
}

/** Domains with a capability folder first, in its order; the rest after. */
function orderedDomains(): PackageFeatureEntry[] {
  const rank = (d: PackageFeatureEntry) => {
    const i = CAPABILITY_FOLDERS.findIndex((f) => f.id === d.slug);
    return i === -1 ? CAPABILITY_FOLDERS.length : i;
  };
  return [...DOMAINS].sort((a, b) => rank(a) - rank(b));
}

async function packageCatalogT(lang: string): Promise<PackageCatalogTranslator> {
  return (await getTranslations({
    locale: lang,
    namespace: "packageCatalog",
  })) as unknown as PackageCatalogTranslator;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await packageCatalogT(lang);
  return buildPageMetadata(
    await sitePageMeta(lang, "/features", {
      description: t("page.metaDescription", {
        packageCount: PACKAGE_COUNT,
        domainCount: DOMAINS.length,
      }),
    }),
  );
}

export default async function FeaturesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await packageCatalogT(lang);

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-24 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            lang={lang}
            title={t.rich("page.heroTitle", {
              signature: (chunks) => <span className="signature">{chunks}</span>,
            })}
            lead={t("page.heroLead", {
              packageCount: PACKAGE_COUNT,
              domainCount: DOMAINS.length,
            })}
          />
        </div>
      </section>

      {orderedDomains().map((domain) => (
        <DomainBand key={domain.slug} domain={domain} t={t} />
      ))}

      <Band>
        <Intro title={t("page.startTitle")} lead={t("page.startLead")} />
        <div className="mt-10">
          <CommandInstallBox
            command="npx create-sailor@latest"
            copyLabel={t("page.install.copyLabel")}
            copiedLabel={t("page.install.copiedLabel")}
          />
        </div>
      </Band>
    </main>
  );
}

function DomainBand({ domain, t }: { domain: PackageFeatureEntry; t: PackageCatalogTranslator }) {
  const folder = folderFor(domain);
  const packages = domain.children
    .map((slug) => getPackageFeatureEntry(slug))
    .filter((e): e is PackageFeatureEntry => e?.kind === "package");

  // The domain's load-bearing packages lead the bento; a domain without a
  // capability folder (ops) leads with its first packages.
  const focus = (folder?.focusPackages ?? [])
    .map((name) => getPackageFeatureEntry(name.replace(/^@nebutra\//, "")))
    .filter((e): e is PackageFeatureEntry => e?.kind === "package");
  const lead =
    focus.length >= 3 ? focus : [...focus, ...packages.filter((p) => !focus.includes(p))];

  return (
    <Band id={`capability-${domain.slug}`}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <Intro
            title={folder ? t(`folders.${folder.id}.title`) : getGroupLabel(domain.group, t)}
            lead={folder ? t(`folders.${folder.id}.summary`) : getFeatureSummary(domain, t)}
          />
          {folder ? (
            <p className="mt-6 text-sm text-muted-foreground">{sourceSentence(folder, t)}</p>
          ) : null}
          {folder ? (
            <div className="mt-10">
              <TopologyList folderId={folder.id} nodes={folder.topology.nodes} t={t} compact />
            </div>
          ) : null}
          <Link
            href={`/features/${domain.slug}`}
            className="mt-8 inline-flex items-center gap-2 text-base text-secondary-foreground transition-colors duration-micro hover:text-foreground"
          >
            {t("page.exploreDomain")}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <GlyphBento entries={lead} t={t} />
        </div>
      </div>

      {packages.length > 0 ? (
        <p className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {packages.map((p) => (
            <Link
              key={p.slug}
              href={`/features/${p.slug}`}
              className="font-mono text-muted-foreground transition-colors duration-micro hover:text-foreground"
              translate="no"
            >
              {p.label}
            </Link>
          ))}
        </p>
      ) : null}
    </Band>
  );
}
