import { setRequestLocale } from "next-intl/server";
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
  type PackageFeatureEntry,
} from "@/components/landing/features/package-feature-data";
import {
  PackageRows,
  sourceSentence,
  TopologyList,
} from "@/components/landing/features/package-parts";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

/**
 * The package index: one band per domain, in CAPABILITY_FOLDERS order, each
 * with how it fits together and every package it holds. Every figure is from
 * the generated stats capability-folder-data.test.ts holds to the repository.
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(
    sitePageMeta(lang, "/features", {
      description: `${PACKAGE_COUNT} packages in ${DOMAINS.length} domains — auth, billing, tenancy, AI, integrations and the design system, written, tested and in one repository.`,
    }),
  );
}

export default async function FeaturesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const locale = isZhUiLocale(lang) ? "zh" : "en";

  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="Packages"
          lead={`${PACKAGE_COUNT} packages in ${DOMAINS.length} domains: every layer a SaaS needs, already written and tested, in one repository. Each domain is below, with how it fits together and every package it holds.`}
          cn="一个仓库，每一层都已经写好。"
        />
      </section>

      {orderedDomains().map((domain) => (
        <DomainBand key={domain.slug} domain={domain} locale={locale} />
      ))}

      <Band>
        <Intro
          title="Start from all of it"
          lead="One command gives you the repository, with every package on this page already wired together."
        />
        <div className="mt-10">
          <CommandInstallBox
            command="npx create-sailor@latest"
            copyLabel="Copy"
            copiedLabel="Copied"
          />
        </div>
      </Band>
    </main>
  );
}

function DomainBand({ domain, locale }: { domain: PackageFeatureEntry; locale: "en" | "zh" }) {
  const folder = folderFor(domain);
  const packages = domain.children
    .map((slug) => getPackageFeatureEntry(slug))
    .filter((e): e is PackageFeatureEntry => e?.kind === "package");

  return (
    <Band id={`capability-${domain.slug}`}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <Intro
            title={folder ? folder.title[locale] : getGroupLabel(domain.group, locale)}
            lead={folder ? folder.summary[locale] : getFeatureSummary(domain, locale)}
          />
          {folder ? (
            <p className="mt-6 text-sm text-muted-foreground">{sourceSentence(folder, locale)}</p>
          ) : null}
          <Link
            href={`/features/${domain.slug}`}
            className="mt-8 inline-flex items-center gap-2 text-base text-secondary-foreground transition-colors duration-micro hover:text-foreground"
          >
            {locale === "zh" ? "进入这个能力域" : "Explore the domain"}
            <span aria-hidden>→</span>
          </Link>
        </div>

        {folder ? (
          <div className="self-start">
            <TopologyList nodes={folder.topology.nodes} locale={locale} />
          </div>
        ) : (
          <PackageRows entries={packages} hrefFor={(p) => `/features/${p.slug}`} locale={locale} />
        )}
      </div>

      {folder && packages.length > 0 ? (
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
