import { brand } from "@nebutra/brand/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCTS } from "@/nebutra/data/products";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro, More } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/building"));
}

export default async function BuildingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.building" });
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

      <Band>
        <Intro title={`${brand.name} OS`} lead={t("os.lead")} />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-8 inline-flex text-base text-secondary-foreground hover:text-foreground"
        >
          {t("os.cta")} →
        </Link>
      </Band>

      <Band>
        <Intro title={t("platform.title")} lead={t("platform.lead")} />
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
        <More href="/pricing">
          {(await getTranslations({ locale: lang, namespace: "nav" }))("pricing")}
        </More>
      </Band>
    </main>
  );
}
