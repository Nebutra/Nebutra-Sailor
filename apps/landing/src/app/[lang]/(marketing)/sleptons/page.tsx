import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
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
    body: "Write down what you wish existed, or what you need. The ideas and needs people post are where the network starts.",
    href: "/ideas",
    cta: "Post an idea",
  },
  {
    title: "Capital",
    zh: "资本",
    body: "The investor directory we keep today — Chinese and global funds, each with what they back.",
    href: "/solutions",
    cta: "Browse investors",
  },
  {
    title: "The network",
    zh: "网络",
    body: "Describe the person you wish existed; an AI-native network finds them. In development.",
    href: "/blog/sleptons-project",
    cta: "Read the plan",
  },
] as const;

export default async function SleptonsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main id="main-content">
      <section className="px-8 pt-28 pb-20 xl:px-16">
        <Intro
          level={1}
          title="Sleptons"
          lead="Where people, ideas, needs and capital find each other — earlier than they would have alone."
          cn="让潜能流动起来。"
        />
      </section>
      <Band>
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3">
          {PARTS.map((p) => (
            <div key={p.title} className="flex flex-col">
              <p className="font-heading text-3xl font-medium text-foreground">{p.title}</p>
              <p className="mt-1 text-base text-secondary-foreground">{p.zh}</p>
              <p className="mt-4 text-base text-muted-foreground">{p.body}</p>
              <Link
                href={p.href}
                className="mt-6 text-sm text-secondary-foreground hover:text-foreground"
              >
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </Band>
    </main>
  );
}
