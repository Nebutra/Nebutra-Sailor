import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsletterForm } from "@/components/landing/NewsletterForm";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EssayFeature, essays, FEATURED, toCard } from "@/nebutra/home/essay-feature";
import { EssayGrid } from "@/nebutra/home/essay-grid";
import { siteLang } from "@/nebutra/i18n";
import { ROUTES } from "@/nebutra/routes";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro, More } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "sitePages.home" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/", {
      description: t("metaDescription"),
    }),
  );
}

async function Latest() {
  const posts = (await essays()).filter((p) => p.slug !== FEATURED).slice(0, 6);
  return <EssayGrid posts={posts.map(toCard)} />;
}

/**
 * nebutra.com — media first, as a16z's front page is. The thinking leads; the
 * platform you can use today and what we are building follow, stated plainly.
 */
export default async function SiteHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.home" });

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-24 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            lang={lang}
            title={t.rich("hero.title", {
              signature: (chunks) => <span className="signature">{chunks}</span>,
            })}
            cn={zh ? undefined : t("hero.titleCn")}
            lead={t("hero.lead")}
          />
        </div>
      </section>

      <Band>
        <EssayFeature />
      </Band>

      <Band>
        <Intro title={t("latest.title")} cn={zh ? undefined : t("latest.titleCn")} />
        <div className="mt-12">
          <Latest />
        </div>
        <More href={ROUTES.journal}>{t("latest.viewAll")}</More>
      </Band>

      <Band>
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
          <Intro title={t("newsletter.title")} lead={t("newsletter.lead")} />
          <NewsletterForm />
        </div>
      </Band>

      <Band>
        <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
          <div>
            <Intro title="Sailor" lead={t("sailor.lead")} />
            <More href={ROUTES.sailor}>{t("sailor.cta")}</More>
          </div>
          <div>
            <Intro title={t("building.title")} lead={t("building.lead")} />
            <More href={ROUTES.building}>{t("building.cta")}</More>
          </div>
        </div>
      </Band>
    </main>
  );
}
