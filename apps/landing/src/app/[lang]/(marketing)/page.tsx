import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsletterForm } from "@/components/landing/NewsletterForm";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EssayFeature, essays, FEATURED, toCard } from "@/nebutra/home/essay-feature";
import { EssayGrid } from "@/nebutra/home/essay-grid";
import { Offerings } from "@/nebutra/home/offerings";
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
 * nebutra.com — the company in one line, then what it offers today: the two
 * businesses (Sailor, Consulting) with a real artifact each, and KCQ, incubated
 * on Sailor. The nine layers are how we decide, named under every offering.
 * The Journal follows; the vision (Nebutra OS, Sleptons) is one line at the end.
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
            className="max-w-4xl"
            title={t.rich("hero.title", {
              signature: (chunks) => <span className="signature">{chunks}</span>,
            })}
            cn={zh ? undefined : t("hero.titleCn")}
            lead={t("hero.lead")}
          />
        </div>
      </section>

      <Band id="offer">
        <Offerings lang={lang} />
      </Band>

      <Band id="decide">
        <Intro title={t("decide.title")} lead={t("decide.lead")} />
        <More href="/about#layers">{t("decide.cta")}</More>
      </Band>

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

      {/* The vision, weakened to one line: it lives in the Journal and on Building. */}
      <Band>
        <p className="max-w-2xl text-base text-muted-foreground text-pretty">{t("later.line")}</p>
        <More href={ROUTES.building}>{t("later.cta")}</More>
      </Band>
    </main>
  );
}
