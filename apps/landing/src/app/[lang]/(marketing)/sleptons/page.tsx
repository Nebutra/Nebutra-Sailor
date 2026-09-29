import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { pick, siteLang } from "@/nebutra/i18n";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildPageMetadata(sitePageMeta(lang, "/sleptons"));
}

const PARTS = [
  {
    title: "Ideas",
    zh: "创意与需求",
    body: {
      en: "Write down what you wish existed, or what you need. The ideas and needs people post are where the network starts.",
      zh: "写下你希望存在的东西，或者你需要的东西。大家发的创意和需求，就是网络的起点。",
    },
    href: "/ideas",
    cta: { en: "Post an idea", zh: "发一个创意" },
  },
  {
    title: "Capital",
    zh: "资本",
    body: {
      en: "The investor directory we keep today — Chinese and global funds, each with what they back.",
      zh: "我们维护的投资人名录：国内与全球的基金，各自投什么，一目了然。",
    },
    href: "/solutions",
    cta: { en: "Browse investors", zh: "浏览投资人" },
  },
  {
    title: "The network",
    zh: "网络",
    body: {
      en: "Describe the person you wish existed; an AI-native network finds them. In development.",
      zh: "描述你想找的那个人，由 AI 原生的网络替你找到。开发中。",
    },
    href: "/blog/sleptons-project",
    cta: { en: "Read the plan", zh: "看看计划" },
  },
] as const;

export default async function SleptonsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const l = siteLang(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="Sleptons"
          lead={pick(l, {
            en: "Where people, ideas, needs and capital find each other — earlier than they would have alone.",
            zh: "让人、创意、需求与资本更早地找到彼此。",
          })}
          cn="让潜能流动起来。"
        />
      </section>
      <Band>
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3">
          {PARTS.map((p) => (
            <div key={p.title} className="flex flex-col">
              <p className="font-heading text-3xl font-medium text-foreground">
                {l === "zh" ? p.zh : p.title}
              </p>
              {l === "zh" ? null : (
                <p className="mt-1 text-base text-secondary-foreground">{p.zh}</p>
              )}
              <p className="mt-4 text-base text-muted-foreground">{pick(l, p.body)}</p>
              <Link
                href={p.href}
                className="mt-6 text-sm text-secondary-foreground hover:text-foreground"
              >
                {pick(l, p.cta)} →
              </Link>
            </div>
          ))}
        </div>
      </Band>
    </main>
  );
}
