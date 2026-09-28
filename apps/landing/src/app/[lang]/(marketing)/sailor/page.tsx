import dynamic from "next/dynamic";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CommandInstallBox } from "@/components/landing/CommandInstallBox";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { REPO_URL } from "@/nebutra/data/repo";
import { SailorCli } from "@/nebutra/home/sailor-cli";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/sailor"));
}

// The old landing's capability section, unchanged: it is Sailor's own craft.
const CapabilityMatrixSection = dynamic(() =>
  import("@/components/landing/CapabilityMatrixSection").then((m) => m.CapabilityMatrixSection),
);

export default async function SailorPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="Sailor"
          lead="The open-source platform we build everything on: auth, billing, tenancy, AI routing and the guards that keep a fast-moving codebase honest. Start a company on it with one command."
          cn="我们自己在用的开源地基，今天就能用。"
        />
        <div className="mt-10 flex flex-col items-start gap-5">
          <CommandInstallBox
            command="npx create-sailor@latest"
            copyLabel="Copy"
            copiedLabel="Copied"
          />
          <p className="text-sm text-muted-foreground">
            <a
              href={REPO_URL}
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Source on GitHub
            </a>{" "}
            ·{" "}
            <Link
              href="/licensing"
              className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Licensing for teams
            </Link>
          </p>
        </div>
      </section>
      <Band>
        <SailorCli />
      </Band>
      <div className="border-t border-border">
        <Suspense>
          <CapabilityMatrixSection />
        </Suspense>
      </div>
    </main>
  );
}
