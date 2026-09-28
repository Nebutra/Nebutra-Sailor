import { brand } from "@nebutra/brand/metadata";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/about"));
}

const NAME = [
  { word: "Nebula", meaning: "every idea before it has a shape" },
  { word: "Nurture", meaning: "we grow it with you, not for you" },
  { word: "Ultra", meaning: "a fifty-person agency's output from one person" },
  { word: "Future", meaning: "the company form being rewritten now" },
] as const;

export default async function CompanyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="Where chaos becomes a company."
          lead={`${brand.name} is an AI-native company builder. We exist because founders rarely die of bad ideas — they die of the Founder Tax: a dozen brilliant tools, each seeing one slice, none knowing you are building a company.`}
          cn="让世界上没有难创的业。"
        />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          Why we are building {brand.name} →
        </Link>
      </section>

      <Band>
        <Intro
          title="The name"
          lead="Four words, compressed into one: nurture the nebula into an ultra future."
        />
        <dl className="mt-12 grid max-w-content grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-4">
          {NAME.map((n) => (
            <div key={n.word}>
              <dt className="font-heading text-3xl font-medium text-foreground">{n.word}</dt>
              <dd className="mt-2 text-base text-muted-foreground">{n.meaning}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band>
        <Intro
          title="How we work"
          lead="We don't hire a company. We orchestrate one. The founder sets direction and makes the calls that are hard to reverse; agents write, review and ship; the architecture decides what is allowed to merge — so speed never buys drift."
          cn="人定方向，agent 执行，架构把关。"
        />
        <p className="mt-10 font-heading text-2xl text-secondary-foreground">
          好的架构，意味着你能走很远。
        </p>
      </Band>

      <Band>
        <div className="grid max-w-content grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <p className="font-heading text-2xl font-medium text-foreground">
              Write to the founder
            </p>
            <a
              href={`mailto:tseka@${brand.domains.landing}`}
              className="mt-3 inline-block text-lg text-secondary-foreground hover:text-foreground"
            >
              tseka@{brand.domains.landing}
            </a>
          </div>
          <div>
            <p className="font-heading text-2xl font-medium text-foreground">The company</p>
            <p className="mt-3 text-base text-muted-foreground">
              {brand.nameFullEn}
              <br />
              {brand.nameFull}
            </p>
          </div>
        </div>
      </Band>
    </main>
  );
}
