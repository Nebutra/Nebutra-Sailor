import { setRequestLocale } from "next-intl/server";
import { CapabilityMatrixSection } from "@/components/landing/CapabilityMatrixSection";
import { CommandInstallBox } from "@/components/landing/CommandInstallBox";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { REPO_URL } from "@/nebutra/data/repo";
import { SailorCli } from "@/nebutra/home/sailor-cli";
import { pick, siteLang } from "@/nebutra/i18n";
import { ACME_SITE } from "@/nebutra/routes";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/sailor"));
}

export default async function SailorPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = siteLang(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="Sailor"
          lead={pick(l, {
            en: "The open-source platform we build everything on: auth, billing, tenancy, AI routing and the guards that keep a fast-moving codebase honest. Start a company on it with one command.",
            zh: "我们所有东西都建在它上面的开源平台：认证、计费、多租户、AI 路由，以及让快速迭代的代码库保持诚实的守卫。一条命令，在它上面开一家公司。",
          })}
          cn={l === "zh" ? undefined : "我们自己在用的开源地基，今天就能用。"}
        />
        <div className="mt-10 flex flex-col items-start gap-5">
          <CommandInstallBox
            command="npx create-sailor@latest"
            copyLabel={pick(l, { en: "Copy", zh: "复制" })}
            copiedLabel={pick(l, { en: "Copied", zh: "已复制" })}
          />
          <p className="text-sm text-muted-foreground">
            <a
              href={REPO_URL}
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {pick(l, { en: "Source on GitHub", zh: "GitHub 源码" })}
            </a>{" "}
            ·{" "}
            <a
              href={ACME_SITE}
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {pick(l, { en: "See the site you get", zh: "看看生成的站点" })}
            </a>{" "}
            ·{" "}
            <Link
              href="/licensing"
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {pick(l, { en: "Licensing for teams", zh: "团队授权" })}
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
