import { brand } from "@nebutra/brand/metadata";
import { Button, Heading } from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { REPO_URL } from "@/nebutra/data/repo";
import { SailorCli } from "@/nebutra/home/sailor-cli";
import { BrowserFrame } from "@/nebutra/investors/browser-frame";
import { EcosystemMap } from "@/nebutra/investors/ecosystem-map";
import { FirstYear } from "@/nebutra/investors/first-year";
import { Practice } from "@/nebutra/investors/practice";
import { ProductGallery } from "@/nebutra/investors/product-gallery";
import { ACME_SHOT, SHOWCASE } from "@/nebutra/investors/showcase";
import { type TalkCopy, TalkForm } from "@/nebutra/investors/talk-form";
import { ACME_SITE, ROUTES } from "@/nebutra/routes";
import { sitePageMeta } from "@/nebutra/seo";
import { Band, Intro } from "@/nebutra/ui/page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/investors", { description: t("metaDescription") }),
  );
}

/** The chapters, in the order the page tells them. Each is a Band id. */
const CHAPTERS = ["why", "built", "practice", "work", "next", "talk"] as const;
const SHIFTS = ["code", "solo", "global"] as const;
const PRINCIPLES = ["architecture", "rules", "tools", "open"] as const;

const signature = (chunks: ReactNode) => <span className="signature">{chunks}</span>;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * nebutra.com/investors — the story told to a VC or a strategic partner, so
 * that they ask for the deck. Marketing, not disclosure: the round size,
 * valuation, use of funds and projections live in the deck only, and every
 * product shown is a live site. Sequoia's spine, compressed: purpose, why now,
 * what is built, how we work, vision, the ask.
 */
export default async function InvestorsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors" });
  const f = await getTranslations({ locale: lang, namespace: "sitePages.investors.talk.form" });
  const talkCopy: TalkCopy = {
    intent: f("intent"),
    intents: {
      deck: { title: f("deck.title"), description: f("deck.description") },
      call: { title: f("call.title"), description: f("call.description") },
      partner: { title: f("partner.title"), description: f("partner.description") },
    },
    name: f("name"),
    email: f("email"),
    firm: f("firm"),
    message: f("message"),
    optional: f("optional"),
    submit: f("submit"),
    sending: f("sending"),
    success: f("success"),
    error: f("error"),
    note: f("note"),
  };
  const founderMail = `tseka@${brand.domains.landing}`;
  const reel = [
    { domain: new URL(ACME_SITE).host, shot: ACME_SHOT, alt: "Sailor template" },
    ...SHOWCASE.map((p) => ({ domain: p.domain, shot: p.shot, alt: p.name })),
  ];

  return (
    <main id="main-content">
      {/* Purpose — one sentence, the stage, one action. */}
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-16 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <p className="text-sm text-muted-foreground">{t("hero.kicker")}</p>
          <Intro
            level={1}
            className="mt-6 max-w-4xl"
            title={t.rich("hero.title", { signature })}
            lead={t("hero.lead")}
          />
          <p className="mt-6 max-w-2xl text-base text-secondary-foreground">{t("hero.stage")}</p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href="#talk-deck">{t("hero.primary")}</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#talk-call">{t("hero.secondary")}</a>
            </Button>
          </div>
          <nav aria-label={t("chapters.label")} className="mt-16">
            <ol className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {CHAPTERS.map((c, i) => (
                <li key={c}>
                  <a
                    href={`#${c}`}
                    className="text-muted-foreground transition-colors duration-micro hover:text-foreground"
                  >
                    <span className="font-mono tabular-nums">{pad(i + 1)}</span>{" "}
                    {t(`chapters.${c}`)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* The products, drifting — the site's hero reel, pausing on hover, still under reduced motion. */}
      <section aria-label={t("hero.reelLabel")} className="site-reel overflow-hidden pb-24">
        <ul className="site-reel-track flex w-max gap-6 px-3">
          {[0, 1].map((copy) =>
            reel.map((r) => (
              <li
                key={`${copy}-${r.domain}`}
                aria-hidden={copy === 1 || undefined}
                className="w-80 shrink-0 md:w-[26rem]"
              >
                <BrowserFrame
                  domain={r.domain}
                  shot={r.shot}
                  alt={copy === 1 ? "" : r.alt}
                  sizes="(min-width: 768px) 26rem, 20rem"
                  priority={copy === 0}
                />
              </li>
            )),
          )}
        </ul>
      </section>

      {/* 01 — Why now. */}
      <Band id="why" className="scroll-mt-8">
        <Intro title={t("why.title")} lead={t("why.lead")} />
        <FirstYear lang={lang} />
        <ol className="mt-20 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {SHIFTS.map((k, i) => (
            <li key={k} className="border-t border-border pt-6">
              <p className="font-mono text-sm tabular-nums text-muted-foreground">{pad(i + 1)}</p>
              <Heading level={3} className="mt-3 text-balance">
                {t(`why.shifts.${k}.title`)}
              </Heading>
              <p className="mt-3 text-base text-muted-foreground text-pretty">
                {t(`why.shifts.${k}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </Band>

      {/* 02 — What we've built: the structure, the platform, the products. */}
      <Band id="built" className="scroll-mt-8">
        <Intro title={t("built.title")} lead={t("built.lead")} />
        <EcosystemMap lang={lang} />

        <div className="mt-28 grid grid-cols-1 items-start gap-12 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <Heading level={3} className="max-w-3xl text-balance">
              {t("sailor.title")}
            </Heading>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
              {t("sailor.lead")}
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              <a
                href={REPO_URL}
                className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("sailor.source")}
              </a>{" "}
              ·{" "}
              <Link
                href={ROUTES.sailor}
                className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("sailor.more")}
              </Link>
            </p>
          </div>
          <SailorCli />
          <figure>
            <a href={ACME_SITE} target="_blank" rel="noopener noreferrer" className="group block">
              <BrowserFrame
                domain={new URL(ACME_SITE).host}
                shot={ACME_SHOT}
                alt="Sailor template"
                sizes="(min-width: 1280px) 45vw, 100vw"
              />
            </a>
            <figcaption className="mt-4 text-sm text-muted-foreground">
              {t("sailor.acme")}
            </figcaption>
          </figure>
        </div>
      </Band>

      <Band>
        <Intro title={t("products.title")} lead={t("products.lead")} />
        <ProductGallery lang={lang} />
      </Band>

      {/* 03 — Going global: the second line of business. */}
      <Band id="practice" className="scroll-mt-8">
        <Practice lang={lang} />
      </Band>

      {/* 04 — How we work: beliefs, stated as sentences someone could repeat. */}
      <Band id="work" className="scroll-mt-8">
        <Intro title={t("work.title")} />
        <ol className="mt-14 grid grid-cols-1 gap-x-16 gap-y-14 lg:grid-cols-2">
          {PRINCIPLES.map((k, i) => (
            <li key={k} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4">
              <span className="pt-2 font-mono text-sm tabular-nums text-muted-foreground">
                {pad(i + 1)}
              </span>
              <div>
                <Heading level={2} as="h3" className="text-balance">
                  {t(`work.${k}.title`)}
                </Heading>
                <p className="mt-4 max-w-xl text-base text-muted-foreground text-pretty">
                  {t(`work.${k}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Band>

      {/* 05 — Where it goes. The vision, named as in development. */}
      <Band id="next" className="relative isolate scroll-mt-8 overflow-hidden py-32">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Heading level={2} display className="text-balance">
            {t.rich("next.title", { signature })}
          </Heading>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground text-pretty">
            {t("next.lead")}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground text-pretty">
            {t("next.vision")}
          </p>
        </div>
      </Band>

      {/* 06 — The ask. The deck goes out after an intro; it is never on the page. */}
      <Band id="talk" className="scroll-mt-8">
        <span id="talk-deck" aria-hidden className="block scroll-mt-8" />
        <span id="talk-call" aria-hidden className="block scroll-mt-8" />
        <span id="talk-partner" aria-hidden className="block scroll-mt-8" />
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <Intro title={t("talk.title")} lead={t("talk.lead")} />
            <dl className="mt-12 flex flex-col gap-8">
              {(["investors", "partners"] as const).map((k) => (
                <div key={k} className="border-t border-border pt-5">
                  <dt className="text-base text-foreground">{t(`talk.${k}.title`)}</dt>
                  <dd className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
                    {t(`talk.${k}.body`)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 text-sm text-muted-foreground">
              {t("talk.direct")}{" "}
              <a
                href={`mailto:${founderMail}`}
                className="text-foreground underline-offset-4 hover:underline"
                translate="no"
              >
                {founderMail}
              </a>
            </p>
          </div>
          <TalkForm copy={talkCopy} />
        </div>
      </Band>
    </main>
  );
}
