import { brand } from "@nebutra/brand/metadata";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { NewsletterForm } from "@/components/landing/NewsletterForm";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EssayFeature, essays, FEATURED, toCard } from "@/nebutra/home/essay-feature";
import { EssayGrid } from "@/nebutra/home/essay-grid";
import { ROUTES } from "@/nebutra/routes";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro, More } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(
    sitePageMeta(lang, "/", {
      description: `No company should be hard to start. ${brand.name} builds the platform, the products and the network that make it so.`,
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

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-24 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            title={
              <>
                No company should be hard to <span className="signature">start.</span>
              </>
            }
            cn="让世界上没有难创的业。"
            lead={`Founders rarely die of bad ideas. They die of the Founder Tax — a dozen brilliant tools, each seeing one slice, none knowing you are building a company. ${brand.name} is building the system that does, and writing down what we learn on the way.`}
          />
        </div>
      </section>

      <Band>
        <Suspense>
          <EssayFeature />
        </Suspense>
      </Band>

      <Band>
        <Intro title="Latest" cn="最新文章" />
        <div className="mt-12">
          <Suspense>
            <Latest />
          </Suspense>
        </div>
        <More href={ROUTES.journal}>All essays</More>
      </Band>

      <Band>
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
          <Intro
            title="Read it as it's written."
            lead="New essays on agents, the layer after them, and the founder's craft — when they are ready, not on a schedule."
          />
          <NewsletterForm />
        </div>
      </Band>

      <Band>
        <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
          <div>
            <Intro
              title="Sailor"
              lead="The open-source platform we build everything on. Usable today: npx create-sailor."
            />
            <More href={ROUTES.sailor}>The platform</More>
          </div>
          <div>
            <Intro
              title="What we're building"
              lead={`${brand.name} OS, the Sleptons network, and the early products growing on the platform.`}
            />
            <More href={ROUTES.building}>In progress</More>
          </div>
        </div>
      </Band>
    </main>
  );
}
