import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  return buildPageMetadata({
    title: "Credits",
    description: "The typefaces this site is set in, and who made them.",
    path: "/credits",
    locale: lang as Locale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

/*
 * Each specimen is set in the face it credits. MiSans is named directly
 * rather than through a token stack, so the specimen cannot fall back to
 * another CJK face and credit the wrong one. Its served subset is CJK only
 * (packages/design/fonts), which is why its specimen is Chinese.
 */
const MISANS: CSSProperties = { fontFamily: '"MiSans", sans-serif' };
const DM_SANS: CSSProperties = { fontFamily: "var(--font-heading)" };
const GEIST: CSSProperties = { fontFamily: "var(--font-sans)" };
const GEIST_MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

function Face({
  glyph,
  glyphStyle,
  name,
  maker,
  use,
  licence,
  sample,
  sampleStyle,
  href,
}: {
  glyph: string;
  glyphStyle: CSSProperties;
  name: string;
  maker: string;
  use: string;
  licence: string;
  sample: ReactNode;
  sampleStyle: CSSProperties;
  href: string;
}) {
  return (
    <section className="grid gap-8 border-t border-border py-12 md:grid-cols-[12rem_1fr]">
      <div
        aria-hidden="true"
        className="text-[8rem] leading-none text-foreground select-none"
        style={glyphStyle}
      >
        {glyph}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl text-foreground">{name}</h2>
          <p className="text-sm text-muted-foreground">
            {maker} · {use}
          </p>
        </div>
        <p className="text-xl leading-relaxed text-foreground" style={sampleStyle}>
          {sample}
        </p>
        <p className="text-sm text-muted-foreground">
          {licence} ·{" "}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            {href.replace(/^https:\/\//, "")}
          </a>
        </p>
      </div>
    </section>
  );
}

export default async function CreditsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <article className="flex flex-col">
      <header className="flex flex-col gap-4 pb-12">
        <p className="text-xs tracking-label text-muted-foreground uppercase">Credits</p>
        <h1 className="text-4xl text-foreground text-balance">The type on this site</h1>
        <p className="max-w-2xl text-muted-foreground">
          Three typefaces set every word here. Two are open source. The third, MiSans, is Xiaomi's,
          free for commercial use on the condition that we say so — gladly.
        </p>
      </header>

      {/* MiSans licence: the software must state that it uses MiSans. This
          page is that statement; it replaced the footer line on 2026-09-28. */}
      <Face
        glyph="永"
        glyphStyle={MISANS}
        name="MiSans"
        maker="小米科技有限责任公司 · Xiaomi"
        use="Chinese text"
        licence="本网站使用了 MiSans 字体 · MiSans Font License"
        sample="好的架构，意味着你能走很远。"
        sampleStyle={MISANS}
        href="https://hyperos.mi.com/font"
      />
      <Face
        glyph="Ag"
        glyphStyle={DM_SANS}
        name="DM Sans"
        maker="Colophon Foundry"
        use="Headings"
        licence="SIL Open Font License 1.1"
        sample="Build the company, not the platform under it."
        sampleStyle={DM_SANS}
        href="https://github.com/googlefonts/dm-fonts"
      />
      <Face
        glyph="Ag"
        glyphStyle={GEIST}
        name="Geist & Geist Mono"
        maker="Vercel"
        use="Interface, body and code"
        licence="SIL Open Font License 1.1"
        sample={
          <>
            Everything you read in the interface, and{" "}
            <span style={GEIST_MONO}>npx create-sailor</span> in code.
          </>
        }
        sampleStyle={GEIST}
        href="https://vercel.com/font"
      />
    </article>
  );
}
