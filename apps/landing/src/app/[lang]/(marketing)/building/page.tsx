import { brand } from "@nebutra/brand/metadata";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCTS } from "@/nebutra/data/products";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/building"));
}

export default async function BuildingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="What we're building"
          lead={`${brand.name} OS, and the products we built on the platform along the way.`}
          cn="我们正在造的东西。"
        />
      </section>

      <Band>
        <Intro
          title={`${brand.name} OS`}
          lead="One sentence, a whole company: brand, product, code and launch from one context, on your Mac. In development — the essay below is what it is for; there is nothing to show until there is something real."
        />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-8 inline-flex text-base text-secondary-foreground hover:text-foreground"
        >
          Why we are building it →
        </Link>
      </Band>

      <Band>
        <Intro
          title="On the platform"
          lead="Products we have built on Sailor along the way, each open to use."
        />
        <ul className="mt-12 max-w-4xl divide-y divide-border border-y border-border">
          {PRODUCTS.map((p) => (
            <li key={p.id}>
              <a
                href={p.href}
                className="group grid grid-cols-1 gap-1 py-5 transition-colors duration-micro sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
              >
                <span className="text-base text-foreground">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.what}</span>
                <span className="text-xs text-muted-foreground transition-colors duration-micro group-hover:text-foreground">
                  {p.domain} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Band>
    </main>
  );
}
