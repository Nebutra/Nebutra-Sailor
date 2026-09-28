import { brand } from "@nebutra/brand/metadata";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PRODUCTS } from "@/nebutra/data/products";
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
    line: "Skip to production.",
    body: "The production layer for agent-built software: auth, billing for global and China rails, multi-tenancy and an AI gateway in one command, running locally with zero keys. You own the code.",
    cn: "给 AI 写出来的产品铺好上线的路。",
    href: "/sailor",
    cta: "Sailor",
    status: "Usable today",
  },
  {
    name: "Sleptons",
    line: "Where people, ideas, needs and capital find each other.",
    body: "The network around the platform: Ideas, the open board of ideas and needs, and the people and resources that pick them up.",
    cn: "人、想法、需求与资本彼此找到的地方。",
    href: "/sleptons",
    cta: "Sleptons",
    status: "Open",
  },
  {
    name: `${brand.name} OS`,
    line: "One sentence, a whole company.",
    body: "Brand, product, code and launch from one context, on your Mac. In development — there is nothing to show until there is something real.",
    cn: "一句话，一整家公司。",
    href: "/blog/why-we-build-nebutra",
    cta: "Why we are building it",
    status: "In development",
  },
] as const;

export default async function FounderOsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="The founder OS"
          lead={`Everything ${brand.name} makes is one system for starting a company: a production layer to build on, a network to find people and needs, and an OS that runs the company from one context.`}
          cn="创始人操作系统：一套从想法走到公司的系统。"
        />
      </section>

      {LAYERS.map((layer) => (
        <Band key={layer.name}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{layer.status}</p>
          <Intro title={layer.name} lead={layer.line} cn={layer.cn} />
          <p className="mt-6 max-w-2xl text-base leading-7 text-secondary-foreground">
            {layer.body}
          </p>
          <More href={layer.href}>{layer.cta}</More>
        </Band>
      ))}

      <Band>
        <Intro
          title="Built on the platform"
          lead="Products we have built on Sailor along the way, each open to use."
          cn="在平台上长出来的产品。"
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
        <Link
          href="/building"
          className="mt-8 inline-flex text-base text-secondary-foreground hover:text-foreground"
        >
          What we're building →
        </Link>
      </Band>
    </main>
  );
}
