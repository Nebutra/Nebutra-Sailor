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
import { RevealGroup } from "@/shared/animation/reveal-group";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors" });
  return buildPageMetadata(
    await sitePageMeta(lang, "/investors", { description: t("metaDescription") }),
  );
}

const SHIFTS = ["code", "solo", "global"] as const;
const PRINCIPLES = ["architecture", "rules", "tools", "open"] as const;

const signature = (chunks: ReactNode) => <span className="signature">{chunks}</span>;

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
      {/* Purpose — one sentence, the stage, two actions, one visual. Nothing above the headline. */}
      <section className="relative isolate overflow-hidden px-8 pt-28 pb-16 xl:px-16">
        <div aria-hidden className="site-hero-glow" />
        <div className="relative z-10">
          <Intro
            level={1}
            lang={lang}
            className="max-w-4xl"
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
        </div>
      </section>

      {/* The hero's one visual: the live products in a row that holds still. It
          scrolls sideways by hand (snap, keyboard-focusable); nothing drifts. */}
      <section aria-label={t("hero.reelLabel")} className="site-reel pb-16 md:pb-28">
        <ul
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard (WCAG 2.1.1).
          tabIndex={0}
          aria-label={t("hero.reelLabel")}
          className="flex snap-x snap-mandatory scroll-px-8 gap-6 overflow-x-auto px-8 [scrollbar-width:none] xl:scroll-px-16 xl:px-16"
        >
          {reel.map((r, i) => (
            <li key={r.domain} className="w-80 shrink-0 snap-start md:w-[26rem]">
              <BrowserFrame
                domain={r.domain}
                shot={r.shot}
                alt={r.alt}
                sizes="(min-width: 768px) 26rem, 20rem"
                priority={i < 2}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 01 — Why now. */}
      <Band id="why">
        <Intro title={t("why.title")} lead={t("why.lead")} />
        <FirstYear lang={lang} />
        <RevealGroup as="ol" className="mt-20 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {SHIFTS.map((k) => (
            <li key={k} className="border-t border-border pt-6">
              <Heading level={3} className="text-balance">
                {t(`why.shifts.${k}.title`)}
              </Heading>
              <p className="mt-3 text-base text-muted-foreground text-pretty">
                {t(`why.shifts.${k}.body`)}
              </p>
            </li>
          ))}
        </RevealGroup>
      </Band>

      {/* 02 — What we've built: the structure, the platform, the products. */}
      <Band id="built">
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
        <Intro title={t("products.title")} />
        <ProductGallery lang={lang} />
      </Band>

      {/* 03 — Going global: the second line of business. */}
      <Band id="practice">
        <Practice lang={lang} />
      </Band>

      {/* 04 — How we work: beliefs, stated as sentences someone could repeat. */}
      <Band id="work">
        <Intro title={t("work.title")} />
        <RevealGroup as="ol" className="mt-14 grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-2">
          {PRINCIPLES.map((k) => (
            <li key={k} className="border-t border-border pt-6">
              <Heading level={3} className="text-balance">
                {t(`work.${k}.title`)}
              </Heading>
              <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
                {t(`work.${k}.body`)}
              </p>
            </li>
          ))}
        </RevealGroup>
      </Band>

      {/* 05 — Where it goes. The vision, named as in development. */}
      <Band id="next" className="relative isolate overflow-hidden">
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
      <Band id="talk">
        <span id="talk-deck" aria-hidden className="block scroll-mt-16" />
        <span id="talk-call" aria-hidden className="block scroll-mt-16" />
        <span id="talk-partner" aria-hidden className="block scroll-mt-16" />
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
