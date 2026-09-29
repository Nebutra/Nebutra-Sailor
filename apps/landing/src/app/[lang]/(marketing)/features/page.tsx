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
  GlyphBento,
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
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-24 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            title={
              locale === "zh" ? (
                <>
                  每一层，都已经<span className="signature">写好。</span>
                </>
              ) : (
                <>
                  Every layer, already <span className="signature">written.</span>
                </>
              )
            }
            cn={locale === "zh" ? undefined : "每一层，都已经写好。"}
            lead={
              locale === "zh"
                ? `${PACKAGE_COUNT} 个包，${DOMAINS.length} 个能力域：一个 SaaS 需要的每一层都写好、测好，放在同一个仓库里。下面逐个能力域展开：它怎么组织，里面有哪些包。`
                : `${PACKAGE_COUNT} packages in ${DOMAINS.length} domains: every layer a SaaS needs, written, tested and in one repository. Each domain is below, with how it fits together and every package it holds.`
            }
          />
        </div>
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
            title={folder ? folder.title[locale] : getGroupLabel(domain.group, locale)}
            lead={folder ? folder.summary[locale] : getFeatureSummary(domain, locale)}
          />
          {folder ? (
            <p className="mt-6 text-sm text-muted-foreground">{sourceSentence(folder, locale)}</p>
          ) : null}
          {folder ? (
            <div className="mt-10">
              <TopologyList nodes={folder.topology.nodes} locale={locale} compact />
            </div>
          ) : null}
          <Link
            href={`/features/${domain.slug}`}
            className="mt-8 inline-flex items-center gap-2 text-base text-secondary-foreground transition-colors duration-micro hover:text-foreground"
          >
            {locale === "zh" ? "进入这个能力域" : "Explore the domain"}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <GlyphBento entries={lead} locale={locale} />
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
