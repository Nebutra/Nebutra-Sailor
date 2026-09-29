import { brand } from "@nebutra/brand/metadata";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { pick, siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/about"));
}

const NAME = [
  {
    word: "Nebula",
    meaning: { en: "every idea before it has a shape", zh: "每个想法成形之前的样子" },
  },
  {
    word: "Nurture",
    meaning: { en: "we grow it with you, not for you", zh: "和你一起养大，而不是替你养" },
  },
  {
    word: "Ultra",
    meaning: {
      en: "a fifty-person agency's output from one person",
      zh: "一个人做出五十人团队的产出",
    },
  },
  {
    word: "Future",
    meaning: { en: "the company form being rewritten now", zh: "正在被重写的公司形态" },
  },
] as const;

export default async function CompanyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = siteLang(lang);
  const zh = l === "zh";
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title={pick(l, { en: "Where chaos becomes a company.", zh: "让混沌长成一家公司。" })}
          lead={pick(l, {
            en: `${brand.name} is an AI-native company builder. We exist because founders rarely die of bad ideas — they die of the Founder Tax: a dozen brilliant tools, each seeing one slice, none knowing you are building a company.`,
            zh: `${brand.name} 是一家 AI 原生的公司建造者。我们存在，是因为创业者很少死于坏点子——他们死于“创始人税”：十几个出色的工具，每个只看到一小块，没有一个知道你在建一家公司。`,
          })}
          cn="让世界上没有难创的业。"
        />
        <Link
          href="/blog/why-we-build-nebutra"
          className="mt-10 inline-flex text-sm text-secondary-foreground hover:text-foreground"
        >
          {pick(l, { en: `Why we are building ${brand.name}`, zh: `我们为什么造 ${brand.name}` })} →
        </Link>
      </section>

      <Band>
        <Intro
          title={pick(l, { en: "The name", zh: "名字的由来" })}
          lead={pick(l, {
            en: "Four words, compressed into one: nurture the nebula into an ultra future.",
            zh: "四个词压成一个：把星云养成一个极致的未来。",
          })}
        />
        <dl className="mt-12 grid max-w-content grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-4">
          {NAME.map((n) => (
            <div key={n.word}>
              <dt className="font-heading text-3xl font-medium text-foreground">{n.word}</dt>
              <dd className="mt-2 text-base text-muted-foreground">{pick(l, n.meaning)}</dd>
            </div>
          ))}
        </dl>
      </Band>

      <Band>
        <Intro
          title={pick(l, { en: "How we work", zh: "我们怎么工作" })}
          lead={pick(l, {
            en: "We don't hire a company. We orchestrate one. The founder sets direction and makes the calls that are hard to reverse; agents write, review and ship; the architecture decides what is allowed to merge — so speed never buys drift.",
            zh: "我们不是招出一家公司，而是编排出一家公司。创始人定方向、做难以回头的决定；agent 负责写、审、发；架构决定什么能合进来——速度永远换不来走样。",
          })}
          cn={zh ? undefined : "人定方向，agent 执行，架构把关。"}
        />
        <p className="mt-10 font-heading text-2xl text-secondary-foreground">
          好的架构，意味着你能走很远。
        </p>
      </Band>

      <Band>
        <div className="grid max-w-content grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <p className="font-heading text-2xl font-medium text-foreground">
              {pick(l, { en: "Write to the founder", zh: "写信给创始人" })}
            </p>
            <a
              href={`mailto:tseka@${brand.domains.landing}`}
              className="mt-3 inline-block text-lg text-secondary-foreground hover:text-foreground"
            >
              tseka@{brand.domains.landing}
            </a>
          </div>
          <div>
            <p className="font-heading text-2xl font-medium text-foreground">
              {pick(l, { en: "The company", zh: "公司主体" })}
            </p>
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
