import { brand } from "@nebutra/brand/metadata";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCTS } from "@/nebutra/data/products";
import { pick, siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/building"));
}

export default async function BuildingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = siteLang(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title={pick(l, { en: "What we're building", zh: "我们正在造的" })}
          lead={pick(l, {
            en: `${brand.name} OS, and the products we built on the platform along the way.`,
            zh: `${brand.name} OS，以及一路在平台上做出来的产品。`,
          })}
          cn={l === "zh" ? undefined : "我们正在造的东西。"}
        />
      </section>

      <Band>
        <Intro
          title={`${brand.name} OS`}
          lead={pick(l, {
            en: "One sentence, a whole company: brand, product, code and launch from one context, on your Mac. In development — the essay below is what it is for; there is nothing to show until there is something real.",
            zh: "一句话，一整家公司：品牌、产品、代码和发布，在你的 Mac 上从同一个上下文里完成。开发中——下面那篇文章讲它为什么存在；在有真东西之前，不拿出来展示。",
          })}
        />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-8 inline-flex text-base text-secondary-foreground hover:text-foreground"
        >
          {pick(l, { en: "Why we are building it", zh: "我们为什么要造它" })} →
        </Link>
      </Band>

      <Band>
        <Intro
          title={pick(l, { en: "On the platform", zh: "平台上的产品" })}
          lead={pick(l, {
            en: "Products we have built on Sailor along the way, each open to use.",
            zh: "我们一路在 Sailor 上做出来的产品，都可以直接用。",
          })}
        />
        <ul className="mt-12 max-w-4xl divide-y divide-border border-y border-border">
          {PRODUCTS.map((p) => (
            <li key={p.id}>
              <a
                href={p.href}
                className="group grid grid-cols-1 gap-1 py-5 transition-colors duration-micro sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
              >
                <span className="text-base text-foreground">{p.name}</span>
                <span className="text-sm text-muted-foreground">
                  {l === "zh" ? p.whatZh : p.what}
                </span>
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
