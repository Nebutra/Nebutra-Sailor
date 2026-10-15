import { getTranslations, setRequestLocale } from "next-intl/server";
import { CapabilityMatrixSection } from "@/components/landing/CapabilityMatrixSection";
import { CommandInstallBox } from "@/components/landing/CommandInstallBox";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { REPO_URL } from "@/nebutra/data/repo";
import { SailorCli } from "@/nebutra/home/sailor-cli";
import { siteLang } from "@/nebutra/i18n";
import { ACME_SITE } from "@/nebutra/routes";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(await sitePageMeta(lang, "/sailor"));
}

export default async function SailorPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const zh = siteLang(lang) === "zh";
  const t = await getTranslations({ locale: lang, namespace: "sitePages.sailor" });
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          lang={lang}
          title="Sailor"
          lead={t("hero.lead")}
          cn={zh ? undefined : t("hero.cn")}
        />
        <div className="mt-10 flex flex-col items-start gap-5">
          <CommandInstallBox
            command="npx create-sailor@latest"
            copyLabel={t("install.copyLabel")}
            copiedLabel={t("install.copiedLabel")}
          />
          <p className="text-sm text-muted-foreground">
            <a
              href={REPO_URL}
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("links.source")}
            </a>{" "}
            ·{" "}
            <a
              href={ACME_SITE}
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("links.seeSite")}
            </a>{" "}
            ·{" "}
            <Link
              href="/licensing"
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("links.licensing")}
            </Link>
          </p>
        </div>
      </section>
      <Band>
        <SailorCli />
      </Band>
      <div className="border-t border-border">
        {/* The old landing's capability section, unchanged: it is Sailor's own craft. */}
        <CapabilityMatrixSection />
      </div>
    </main>
  );
}
