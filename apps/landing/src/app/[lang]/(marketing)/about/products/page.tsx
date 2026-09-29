import { brand } from "@nebutra/brand/metadata";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCTS } from "@/nebutra/data/products";
import { pick, siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro, More } from "@/nebutra/ui/page";

/**
 * The founder OS, layer by layer. Every claim here is one the rest of the
 * site already makes — Sailor's line, Sleptons' job, the product list — so
 * this page cannot drift into a second story. It replaced the 2026-05
 * "Builder Core × Sleptons, two flagships" page, whose product names, the
 * Launchpad submodule and a row of dead links no longer described anything.
 */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/about/products"));
}

const LAYERS = [
  {
    name: "Sailor",
    line: { en: "Skip to production.", zh: "给 AI 写出来的产品铺好上线的路。" },
    body: {
      en: "The production layer for agent-built software: auth, billing for global and China rails, multi-tenancy and an AI gateway in one command, running locally with zero keys. You own the code.",
      zh: "给 agent 写出来的软件用的生产层：认证、全球与中国双通道支付、多租户和 AI 网关，一条命令搞定，零密钥本地就能跑。代码归你。",
    },
    cn: "给 AI 写出来的产品铺好上线的路。",
    href: "/sailor",
    cta: { en: "Sailor", zh: "了解 Sailor" },
    status: { en: "Usable today", zh: "今天就能用" },
  },
  {
    name: "Sleptons",
    line: {
      en: "Where people, ideas, needs and capital find each other.",
      zh: "人、想法、需求与资本彼此找到的地方。",
    },
    body: {
      en: "The network around the platform: Ideas, the open board of ideas and needs, and the people and resources that pick them up.",
      zh: "平台周围的网络：公开的创意与需求墙，以及接住它们的人和资源。",
    },
    cn: "人、想法、需求与资本彼此找到的地方。",
    href: "/sleptons",
    cta: { en: "Sleptons", zh: "了解 Sleptons" },
    status: { en: "Open", zh: "已开放" },
  },
  {
    name: `${brand.name} OS`,
    line: { en: "One sentence, a whole company.", zh: "一句话，一整家公司。" },
    body: {
      en: "Brand, product, code and launch from one context, on your Mac. In development — there is nothing to show until there is something real.",
      zh: "品牌、产品、代码和发布，在你的 Mac 上从同一个上下文里完成。开发中——在有真东西之前，不拿出来展示。",
    },
    cn: "一句话，一整家公司。",
    href: "/blog/why-we-build-nebutra",
    cta: { en: "Why we are building it", zh: "我们为什么要造它" },
    status: { en: "In development", zh: "开发中" },
  },
] as const;

export default async function FounderOsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = siteLang(lang);
  const zh = l === "zh";
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title={pick(l, { en: "The founder OS", zh: "创始人操作系统" })}
          lead={pick(l, {
            en: `Everything ${brand.name} makes is one system for starting a company: a production layer to build on, a network to find people and needs, and an OS that runs the company from one context.`,
            zh: `${brand.name} 做的所有东西，是同一套开公司的系统：一个可以在上面建造的生产层，一个找人和需求的网络，以及一个在同一上下文里运转整家公司的操作系统。`,
          })}
          cn={zh ? undefined : "创始人操作系统：一套从想法走到公司的系统。"}
        />
      </section>

      {LAYERS.map((layer) => (
        <Band key={layer.name}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {pick(l, layer.status)}
          </p>
          <Intro title={layer.name} lead={pick(l, layer.line)} cn={zh ? undefined : layer.cn} />
          <p className="mt-6 max-w-2xl text-base leading-7 text-secondary-foreground">
            {pick(l, layer.body)}
          </p>
          <More href={layer.href}>{pick(l, layer.cta)}</More>
        </Band>
      ))}

      <Band>
        <Intro
          title={pick(l, { en: "Built on the platform", zh: "在平台上长出来的产品" })}
          lead={pick(l, {
            en: "Products we have built on Sailor along the way, each open to use.",
            zh: "我们一路在 Sailor 上做出来的产品，都可以直接用。",
          })}
          cn={zh ? undefined : "在平台上长出来的产品。"}
        />
        <ul className="mt-12 max-w-4xl divide-y divide-border border-y border-border">
          {PRODUCTS.map((p) => (
            <li key={p.id}>
              <a
                href={p.href}
                className="group grid grid-cols-1 gap-1 py-5 transition-colors duration-micro sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
              >
                <span className="text-base text-foreground">{p.name}</span>
                <span className="text-sm text-muted-foreground">{zh ? p.whatZh : p.what}</span>
                <span className="text-xs text-muted-foreground transition-colors duration-micro group-hover:text-foreground">
                  {p.domain} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/building"
          className="mt-8 inline-flex text-base text-secondary-foreground hover:text-foreground"
        >
          {pick(l, { en: "What we're building", zh: "我们正在造的" })} →
        </Link>
      </Band>
    </main>
  );
}
