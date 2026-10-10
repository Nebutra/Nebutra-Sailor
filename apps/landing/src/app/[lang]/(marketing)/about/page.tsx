import { brand } from "@nebutra/brand/metadata";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { answersTo, DECISION_LAYERS, type DecisionLayer, offering } from "@/nebutra/data/offerings";
import { NINE_LAYERS_ESSAY } from "@/nebutra/data/roadmap";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/about"));
}

/** What answers to a layer besides the offerings: the Journal tells (L7), the name is (L8), the roadmap runs (L9). */
const EXTRA: Partial<
  Record<DecisionLayer, { key: "journal" | "theName" | "roadmapLabel"; href: string }[]>
> = {
  l7: [{ key: "journal", href: "/blog" }],
  l8: [{ key: "theName", href: "#name" }],
  l9: [{ key: "roadmapLabel", href: "/roadmap" }],
};

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
          cn={zh ? undefined : t("hero.cn")}
        />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {t("hero.cta")} →
        </Link>
      </section>

      {/* The nine layers, used: what each one decides, and what answers to it. */}
      <Band id="layers">
        <Intro title={t("layers.title")} lead={t("layers.lead")} />
        <ol className="mt-14 max-w-content divide-y divide-border border-y border-border">
          {DECISION_LAYERS.map((id) => {
            const links = [
              ...answersTo(id).map((o) => ({
                label: o === "consulting" ? t("layers.consulting") : o === "kcq" ? "KCQ" : "Sailor",
                href: offering(o).href,
              })),
              ...(EXTRA[id] ?? []).map((x) => ({ label: t(`layers.${x.key}`), href: x.href })),
            ];
            return (
              <li
                key={id}
                id={id}
                className="grid scroll-mt-20 grid-cols-1 gap-2 py-6 md:grid-cols-[10rem_minmax(0,1fr)_14rem] md:items-baseline md:gap-8"
              >
                <p className="font-heading text-xl text-foreground">
                  <span className="text-muted-foreground">{id.toUpperCase()}</span>{" "}
                  {t(`layers.${id}.name`)}
                </p>
                <p className="text-base text-muted-foreground text-pretty">
                  {t(`layers.${id}.decides`)}
                </p>
                <p className="text-sm text-secondary-foreground">
                  {links.map((l, i) => (
                    <span key={l.href}>
                      {i > 0 ? <span aria-hidden> · </span> : null}
                      {l.href.startsWith("/") ? (
                        <Link href={l.href} className="hover:text-foreground">
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className="hover:text-foreground">
                          {l.label}
                        </a>
                      )}
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-secondary-foreground">
          <Link href={NINE_LAYERS_ESSAY} className="hover:text-foreground">
            {t("layers.essay")} →
          </Link>
          <Link href="/roadmap" className="hover:text-foreground">
            {t("layers.roadmap")} →
          </Link>
        </p>
      </Band>

      <Band id="name">
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
