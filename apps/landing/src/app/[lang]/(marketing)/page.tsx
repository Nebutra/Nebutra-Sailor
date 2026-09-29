import { brand } from "@nebutra/brand/metadata";
import { setRequestLocale } from "next-intl/server";
import { NewsletterForm } from "@/components/landing/NewsletterForm";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EssayFeature, essays, FEATURED, toCard } from "@/nebutra/home/essay-feature";
import { EssayGrid } from "@/nebutra/home/essay-grid";
import { pick, siteLang } from "@/nebutra/i18n";
import { ROUTES } from "@/nebutra/routes";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro, More } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(
    sitePageMeta(lang, "/", {
      description: pick(siteLang(lang), {
        en: `No company should be hard to start. ${brand.name} builds the platform, the products and the network that make it so.`,
        zh: `让世界上没有难创的业。${brand.name} 在造让这件事成立的平台、产品和网络。`,
      }),
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
  const l = siteLang(lang);
  const zh = l === "zh";

  return (
    <main id="main-content">
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-24 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            title={
              zh ? (
                <>
                  让世界上没有<span className="signature">难创的业。</span>
                </>
              ) : (
                <>
                  No company should be hard to <span className="signature">start.</span>
                </>
              )
            }
            cn={zh ? undefined : "让世界上没有难创的业。"}
            lead={pick(l, {
              en: `Founders rarely die of bad ideas. They die of the Founder Tax — a dozen brilliant tools, each seeing one slice, none knowing you are building a company. ${brand.name} is building the system that does, and writing down what we learn on the way.`,
              zh: `创业者很少死于坏点子，他们死于“创始人税”：十几个出色的工具，每个只看到一小块，没有一个知道你在建一家公司。${brand.name} 在造那个知道的系统，并把一路学到的写下来。`,
            })}
          />
        </div>
      </section>

      <Band>
        <EssayFeature />
      </Band>

      <Band>
        <Intro title={pick(l, { en: "Latest", zh: "最新文章" })} cn={zh ? undefined : "最新文章"} />
        <div className="mt-12">
          <Latest />
        </div>
        <More href={ROUTES.journal}>{pick(l, { en: "All essays", zh: "全部文章" })}</More>
      </Band>

      <Band>
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
          <Intro
            title={pick(l, { en: "Read it as it's written.", zh: "写完就发，第一时间读到。" })}
            lead={pick(l, {
              en: "New essays on agents, the layer after them, and the founder's craft — when they are ready, not on a schedule.",
              zh: "关于 agent、agent 之后的那一层，以及创始人这门手艺的新文章。写好了才发，不赶排期。",
            })}
          />
          <NewsletterForm />
        </div>
      </Band>

      <Band>
        <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
          <div>
            <Intro
              title="Sailor"
              lead={pick(l, {
                en: "The open-source platform we build everything on. Usable today: npx create-sailor.",
                zh: "我们所有东西都建在它上面的开源平台。今天就能用：npx create-sailor。",
              })}
            />
            <More href={ROUTES.sailor}>{pick(l, { en: "The platform", zh: "了解平台" })}</More>
          </div>
          <div>
            <Intro
              title={pick(l, { en: "What we're building", zh: "我们正在造的" })}
              lead={pick(l, {
                en: `${brand.name} OS, the Sleptons network, and the early products growing on the platform.`,
                zh: `${brand.name} OS、Sleptons 网络，以及在平台上长出来的早期产品。`,
              })}
            />
            <More href={ROUTES.building}>{pick(l, { en: "In progress", zh: "进展" })}</More>
          </div>
        </div>
      </Band>
    </main>
  );
}
