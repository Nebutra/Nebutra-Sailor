import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteLang } from "@/i18n/site-language";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EssayFeature, essays, FEATURED, toCard } from "@/nebutra/home/essay-feature";
import { EssayGrid } from "@/nebutra/home/essay-grid";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/blog"));
}

async function All() {
  const posts = (await essays()).filter((p) => p.slug !== FEATURED);
  return <EssayGrid posts={posts.map(toCard)} filter />;
}

export default async function JournalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.journalPage" });
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-16 xl:px-16">
        <Intro
          level={1}
          lang={lang}
          title={t("title")}
          lead={t("lead")}
          cn={zh ? undefined : t("cn")}
        />
      </section>
      <Band>
        <EssayFeature />
      </Band>
      <Band>
        <All />
      </Band>
    </main>
  );
}
