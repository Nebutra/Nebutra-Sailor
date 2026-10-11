import { brand } from "@nebutra/brand/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCTS } from "@/nebutra/data/products";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro, More } from "@/nebutra/ui/page";

/**
 * The founder OS, layer by layer. Every claim here is one the rest of the
 * site already makes — Sailor's line, Sleptons' job, the product list — so
 * this page cannot drift into a second story. It replaced the 2026-05
 * "Builder Core × Sleptons, two flagships" page, whose product names, the
 * Launchpad submodule and a row of dead links no longer described anything.
 */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/about/products"));
}

const LAYER_KEYS = ["sailor", "sleptons", "os"] as const;
type LayerKey = (typeof LAYER_KEYS)[number];
const LAYER_NAMES: Record<LayerKey, string> = {
  sailor: "Sailor",
  sleptons: "Sleptons",
  os: `${brand.name} OS`,
};
const LAYER_HREFS: Record<LayerKey, string> = {
  sailor: "/sailor",
  sleptons: "/sleptons",
  os: "/blog/why-we-build-nebutra",
};

export default async function FounderOsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.aboutProducts" });
  const layerKey = (key: LayerKey, leaf: string) =>
    `layers.${key}.${leaf}` as Parameters<typeof t>[0];
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          lang={lang}
          title={t("hero.title")}
          lead={t("hero.lead")}
          cn={zh ? undefined : t("hero.cn")}
        />
      </section>

      {LAYER_KEYS.map((key) => (
        <Band key={key}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t(layerKey(key, "status"))}
          </p>
          <Intro
            title={LAYER_NAMES[key]}
            lead={t(layerKey(key, "line"))}
            cn={zh ? undefined : t(layerKey(key, "cn"))}
          />
          <p className="mt-6 max-w-2xl text-base leading-7 text-secondary-foreground">
            {t(layerKey(key, "body"))}
          </p>
          <More href={LAYER_HREFS[key]}>{t(layerKey(key, "cta"))}</More>
        </Band>
      ))}

      <Band>
        <Intro
          title={t("platform.title")}
          lead={t("platform.lead")}
          cn={zh ? undefined : t("platform.cn")}
        />
        <ul className="mt-12 max-w-4xl divide-y divide-border border-y border-border">
          {PRODUCTS.map((p) => (
            <li key={p.id}>
              <a
                href={p.href}
                className="group grid grid-cols-1 gap-1 py-5 transition-colors duration-micro sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
              >
                <span className="text-base text-foreground">{p.name}</span>
                <span className="text-sm text-muted-foreground">{zh ? p.whatZh : p.what}</span>
                <span className="text-xs text-muted-foreground transition-colors duration-micro group-hover:text-foreground">
                  {p.domain} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/building"
          className="mt-8 inline-flex text-base text-secondary-foreground hover:text-foreground"
        >
          {t("platform.buildingLink")} →
        </Link>
      </Band>
    </main>
  );
}
