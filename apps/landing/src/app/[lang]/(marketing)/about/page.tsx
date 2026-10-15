import { brand } from "@nebutra/brand/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/about"));
}

const NAME = [
  { word: "Nebula", meaningKey: "nebula" },
  { word: "Nurture", meaningKey: "nurture" },
  { word: "Ultra", meaningKey: "ultra" },
  { word: "Future", meaningKey: "future" },
] as const;

export default async function CompanyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.about" });
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          lang={lang}
          title={t("hero.title")}
          lead={t("hero.lead")}
          cn={t("hero.cn")}
        />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {t("hero.cta")} →
        </Link>
      </section>

      <Band>
        <Intro title={t("name.title")} lead={t("name.lead")} />
        <dl className="mt-12 grid max-w-content grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-4">
          {NAME.map((n) => (
            <div key={n.word}>
              <dt className="font-heading text-3xl font-medium text-foreground">{n.word}</dt>
              <dd className="mt-2 text-base text-muted-foreground">{t(`name.${n.meaningKey}`)}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band>
        <Intro title={t("how.title")} lead={t("how.lead")} cn={zh ? undefined : t("how.cn")} />
        <p className="mt-10 font-heading text-2xl text-secondary-foreground">
          {t("how.architectureNote")}
        </p>
      </Band>

      <Band>
        <div className="grid max-w-content grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <p className="font-heading text-2xl font-medium text-foreground">
              {t("contact.founderTitle")}
            </p>
            <a
              href={`mailto:tseka@${brand.domains.landing}`}
              className="mt-3 inline-block text-lg text-secondary-foreground hover:text-foreground"
            >
              tseka@{brand.domains.landing}
            </a>
          </div>
          <div>
            <p className="font-heading text-2xl font-medium text-foreground">
              {t("contact.companyTitle")}
            </p>
            <p className="mt-3 text-base text-muted-foreground">
              {brand.nameFullEn}
              <br />
              {brand.nameFull}
            </p>
          </div>
        </div>
      </Band>
    </main>
  );
}
