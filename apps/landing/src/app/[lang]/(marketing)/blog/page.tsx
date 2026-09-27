import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { EssayFeature, essays, FEATURED, toCard } from "@/nebutra/home/essay-feature";
import { EssayGrid } from "@/nebutra/home/essay-grid";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/blog"));
}

async function All() {
  const posts = (await essays()).filter((p) => p.slug !== FEATURED);
  return <EssayGrid posts={posts.map(toCard)} filter />;
}

export default async function JournalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-16 xl:px-16">
        <Intro
          level={1}
          title="Journal"
          lead="What we believe about building now — agents, the layer after them, and the founder's craft."
          cn="我们对这个时代的判断。"
        />
      </section>
      <Band>
        <Suspense>
          <EssayFeature />
        </Suspense>
      </Band>
      <Band>
        <Suspense>
          <All />
        </Suspense>
      </Band>
    </main>
  );
}
