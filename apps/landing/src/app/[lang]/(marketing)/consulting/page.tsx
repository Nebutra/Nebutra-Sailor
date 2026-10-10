import { brand } from "@nebutra/brand/metadata";
import { Button } from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { offering } from "@/nebutra/data/offerings";
import { Practice } from "@/nebutra/investors/practice";
import { sitePageMeta } from "@/nebutra/seo";
import { LayerTags } from "@/nebutra/ui/layer-tags";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "sitePages.consulting" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/consulting", { description: t("metaDescription") }),
  );
}

const signature = (chunks: ReactNode) => <span className="signature">{chunks}</span>;

/**
 * nebutra.com/consulting — the second business: AI products built for
 * companies, and AI products taken from China to markets worldwide. The proof
 * it can show without a client list is the same as on /investors: the map and
 * the languages this site is served in (Practice).
 */
export default async function ConsultingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "sitePages.consulting" });
  const mail = `mailto:tseka@${brand.domains.landing}`;
  const actions = (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <Button asChild size="lg">
        <Link href="/contact">{t("hero.primary")}</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a href={mail}>{t("hero.secondary")}</a>
      </Button>
    </div>
  );
  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-20 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            lang={lang}
            className="max-w-4xl"
            title={t.rich("hero.title", { signature })}
            lead={t("hero.lead")}
          />
          <LayerTags lang={lang} serves={offering("consulting").serves} className="mt-6" />
          {actions}
        </div>
      </section>

      <Band id="practice">
        <Practice lang={lang} />
      </Band>

      <Band id="talk">
        <Intro title={t("talk.title")} lead={t("talk.lead")} />
        {actions}
      </Band>
    </main>
  );
}
