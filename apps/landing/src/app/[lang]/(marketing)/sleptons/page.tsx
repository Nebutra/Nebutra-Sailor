import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/sleptons"));
}

const PART_KEYS = ["ideas", "capital", "network"] as const;
type PartKey = (typeof PART_KEYS)[number];
const PART_HREFS: Record<PartKey, string> = {
  ideas: "/ideas",
  capital: "/solutions",
  network: "/blog/sleptons-project",
};

export default async function SleptonsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.sleptons" });
  const partKey = (key: PartKey, leaf: string) => `parts.${key}.${leaf}` as Parameters<typeof t>[0];
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro level={1} lang={lang} title="Sleptons" lead={t("hero.lead")} cn={t("hero.cn")} />
      </section>
      <Band>
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3">
          {PART_KEYS.map((key) => (
            <div key={key} className="flex flex-col">
              <p className="font-heading text-3xl font-medium text-foreground">
                {zh ? t(partKey(key, "titleCn")) : t(partKey(key, "title"))}
              </p>
              {zh ? null : (
                <p className="mt-1 text-base text-secondary-foreground">
                  {t(partKey(key, "titleCn"))}
                </p>
              )}
              <p className="mt-4 text-base text-muted-foreground">{t(partKey(key, "body"))}</p>
              <Link
                href={PART_HREFS[key]}
                className="mt-6 text-sm text-secondary-foreground hover:text-foreground"
              >
                {t(partKey(key, "cta"))} →
              </Link>
            </div>
          ))}
        </div>
      </Band>
    </main>
  );
}
