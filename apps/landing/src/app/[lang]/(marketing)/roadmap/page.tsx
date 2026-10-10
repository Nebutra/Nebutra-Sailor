import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { DIRECTION_ESSAY, essayHref, NINE_LAYERS_ESSAY } from "@/nebutra/data/roadmap";
import { siteLang } from "@/nebutra/i18n";
import { LayerStack } from "@/nebutra/roadmap/layer-stack";
import { timeline } from "@/nebutra/roadmap/model";
import { Timeline } from "@/nebutra/roadmap/timeline";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "roadmapPage" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/roadmap", {
      description: t("meta.description"),
    }),
  );
}

/**
 * The roadmap: the founder's nine layers. L1–L8 are a stacked figure (the
 * direction, which holds still); L9 is the timeline under it — what landed,
 * month by month, then Now and Later. Every entry links up to the
 * layer it answers to. A Server Component; the only client code is the
 * beam's fallback for browsers without scroll-driven animations.
 */
export default async function RoadmapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "roadmapPage" });
  const phases = timeline();

  return (
    <main id="main-content" className="rm">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title={t("hero.title")}
          lead={t("hero.lead")}
          cn={zh ? undefined : t("hero.cn")}
        />
        <Link
          href={NINE_LAYERS_ESSAY}
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {t("hero.essayLink")}
        </Link>
      </section>

      <Band id="direction">
        <Intro
          title={t("direction.title")}
          lead={t("direction.lead")}
          cn={zh ? undefined : t("direction.cn")}
        />
        <LayerStack lang={lang} zh={zh} phases={phases} />
        <Link
          href={essayHref(DIRECTION_ESSAY, zh)}
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {t("direction.essayLink")}
        </Link>
      </Band>

      <Band id="timeline">
        <Intro
          title={t("execution.title")}
          lead={t("execution.lead")}
          cn={zh ? undefined : t("execution.cn")}
        />
        <Timeline lang={lang} zh={zh} phases={phases} />
      </Band>
    </main>
  );
}
