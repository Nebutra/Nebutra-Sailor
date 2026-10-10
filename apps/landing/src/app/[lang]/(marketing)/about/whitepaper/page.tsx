import {
  ArrowLeft,
  BookOpen,
  Clock,
  Compass,
  Layers,
  NetworkDevice as Network,
  Notes as ScrollText,
  Shield,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { ORGANIZATION_PRINCIPLES } from "../_about-data";

// ─── Page-local data (copy lives in aboutPages.whitepaper.*) ─────────────────

/** Core objectives — `goals.<key>.title|desc`. */
const GOALS = ["standardize", "lightweight", "verifiable"] as const;

/** TOC anchors (stable IDs) — `toc.<key>`. */
const TOC = [
  { key: "i", roman: "Ⅰ" },
  { key: "ii", roman: "Ⅱ" },
  { key: "iii", roman: "Ⅲ" },
  { key: "iv", roman: "Ⅳ" },
] as const;

/** Omni-factor groups — `factors.<key>.category|subtitle|description`. */
const FACTORS = ["substance", "trust", "drive"] as const;

const BUILDER_HIGHLIGHTS = ["core", "services", "harness", "delivery"] as const;
const SLEPTONS_HIGHLIGHTS = ["proof", "equity", "identity", "launchpad"] as const;

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang, namespace: "aboutPages.whitepaper" });
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/about/whitepaper",
    locale: lang as Locale,
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function WhitepaperPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang, namespace: "aboutPages.whitepaper" });
  const tp = await getTranslations({ locale: lang, namespace: "aboutPages.principles" });
  const thesis = {
    headline: t("thesis.headline"),
    thesis: t("thesis.thesis"),
    paradigm: t("thesis.paradigm"),
  };
  const goals = GOALS.map((key) => ({
    key,
    title: t(`goals.${key}.title`),
    desc: t(`goals.${key}.desc`),
  }));
  const quote = { text: t("quote.text"), attribution: t("quote.attribution") };
  const toc = TOC.map((entry) => ({
    id: `section-${entry.key}`,
    roman: entry.roman,
    label: t(`toc.${entry.key}`),
  }));
  const builder = {
    name: t("products.builderCore.name"),
    tagline: t("products.builderCore.tagline"),
    description: t("products.builderCore.description"),
    highlights: BUILDER_HIGHLIGHTS.map((key) => ({
      title: t(`products.builderCore.highlights.${key}.title`),
      desc: t(`products.builderCore.highlights.${key}.desc`),
    })),
  };
  const sleptons = {
    name: t("products.sleptons.name"),
    tagline: t("products.sleptons.tagline"),
    description: t("products.sleptons.description"),
    highlights: SLEPTONS_HIGHLIGHTS.map((key) => ({
      title: t(`products.sleptons.highlights.${key}.title`),
      desc: t(`products.sleptons.highlights.${key}.desc`),
    })),
  };

  return (
    <main id="main-content" className="flex flex-col flex-1 bg-background">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-32 md:pt-48 pb-20 md:pb-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-4 mb-10">
            <span className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-muted-foreground">
              {t("hero.eyebrow")}
            </span>
            <span className="h-px flex-1 bg-border/70" />
            <span className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t("hero.readTime")}
            </span>
          </div>

          <AnimateIn preset="emerge">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance text-foreground mb-14"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("hero.title")}
            </h1>
          </AnimateIn>

          <figure className="border-l-2 border-foreground pl-6 md:pl-8 py-2 mb-16 md:mb-20">
            <blockquote className="text-xl md:text-2xl lg:text-[1.7rem] font-medium leading-relaxed text-foreground/90 text-balance">
              {quote.text}
            </blockquote>
            <figcaption className="mt-6 text-xs md:text-sm font-mono tracking-[0.2em] uppercase text-muted-foreground">
              {quote.attribution}
            </figcaption>
          </figure>

          {/* TOC */}
          <nav
            aria-label={t("hero.tocKicker")}
            className="rounded-[var(--radius-2xl)] border border-border/60 bg-muted/20 p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <BookOpen className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                {t("hero.tocKicker")}
              </span>
            </div>
            <ol className="flex flex-col gap-3">
              {toc.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="group flex items-baseline gap-4 text-foreground/90 hover:text-foreground transition-colors"
                  >
                    <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground w-8 shrink-0">
                      {entry.roman}
                    </span>
                    <span className="text-base md:text-lg font-medium group-hover:underline underline-offset-4 decoration-border">
                      {entry.label}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* ─── Ⅰ. Strategic Position ──────────────────────────────────── */}
      <section
        id="section-i"
        className="py-24 md:py-32 border-t border-border/50 bg-muted/20 scroll-mt-28"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative mb-14 md:mb-20">
            <span
              aria-hidden="true"
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-semibold leading-none text-muted-foreground/10 select-none pointer-events-none"
              style={{ letterSpacing: "var(--tracking-display)" }}
            >
              Ⅰ
            </span>
            <div className="flex items-center gap-3 mb-6">
              <Compass className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                {t("chapters.chapter")} Ⅰ · {t("chapters.iTitle")}
              </span>
            </div>
            <AnimateIn preset="emerge">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance text-foreground"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {thesis.headline}
              </h2>
            </AnimateIn>
          </div>

          <div className="space-y-8 md:space-y-10 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            <p>{thesis.thesis}</p>
            <p>{thesis.paradigm}</p>
          </div>

          {/* Core objectives */}
          <div className="mt-16 md:mt-20">
            <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
              {t("goalsKicker")}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {goals.map((goal, idx) => (
                <article
                  key={goal.key}
                  className="h-full rounded-[var(--radius-2xl)] border border-border/60 bg-background p-6 md:p-7"
                >
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4 block">
                    0{idx + 1}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold tracking-tight text-foreground mb-3">
                    {goal.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {goal.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ⅱ. Omni-Factor Routing Protocol ─────────────────────────── */}
      <section
        id="section-ii"
        className="py-24 md:py-32 border-t border-border/50 bg-background scroll-mt-28"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative mb-14 md:mb-20">
            <span
              aria-hidden="true"
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-semibold leading-none text-muted-foreground/10 select-none pointer-events-none"
              style={{ letterSpacing: "var(--tracking-display)" }}
            >
              Ⅱ
            </span>
            <div className="flex items-center gap-3 mb-6">
              <Network className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                {t("chapters.chapter")} Ⅱ · {t("chapters.iiTitle")}
              </span>
            </div>
            <AnimateIn preset="emerge">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance text-foreground mb-8"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("sectionII.heading")}
              </h2>
            </AnimateIn>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {t("sectionII.intro")}
            </p>
          </div>
        </div>

        {/* Three factor groups — wider container for grid */}
        <div className="container mx-auto px-4 max-w-wide">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {FACTORS.map((key, idx) => {
              const content = {
                category: t(`factors.${key}.category`),
                subtitle: t(`factors.${key}.subtitle`),
                description: t(`factors.${key}.description`),
              };
              return (
                <article
                  key={key}
                  className="group h-full rounded-[var(--radius-card)] border border-border/60 bg-muted/20 p-8 md:p-10 transition-colors duration-500 hover:border-border hover:bg-muted/40"
                >
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
                    0{idx + 1} / 03
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
                    {content.category}
                  </h3>
                  <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-6">
                    {content.subtitle}
                  </p>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {content.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Ⅲ. AI-Native Convergence ────────────────────────────────── */}
      <section
        id="section-iii"
        className="py-24 md:py-32 border-t border-border/50 bg-muted/20 scroll-mt-28"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative mb-14 md:mb-20">
            <span
              aria-hidden="true"
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-semibold leading-none text-muted-foreground/10 select-none pointer-events-none"
              style={{ letterSpacing: "var(--tracking-display)" }}
            >
              Ⅲ
            </span>
            <div className="flex items-center gap-3 mb-6">
              <Layers className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                {t("chapters.chapter")} Ⅲ · {t("chapters.iiiTitle")}
              </span>
            </div>
            <AnimateIn preset="emerge">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance text-foreground mb-8"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("sectionIII.heading")}
              </h2>
            </AnimateIn>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {t("sectionIII.intro")}
            </p>
          </div>
        </div>

        {/* Dual product deep-dive */}
        <div className="container mx-auto px-4 max-w-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Builder Core */}
            <article className="h-full rounded-[var(--radius-card)] border border-border/60 bg-background p-8 md:p-10 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Layers className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {t("sectionIII.builderEyebrow")}
                </span>
              </div>
              <h3
                className="text-2xl md:text-3xl font-semibold text-foreground mb-4"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {builder.name}
              </h3>
              <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed mb-6">
                {builder.tagline}
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
                {builder.description}
              </p>

              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                {t("sectionIII.highlightsKicker")}
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                {builder.highlights.map((h, idx) => (
                  <li
                    key={h.title}
                    className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        B{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h4 className="text-sm md:text-base font-bold text-foreground mb-1.5">
                      {h.title}
                    </h4>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {h.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </article>

            {/* Sleptons */}
            <article className="h-full rounded-[var(--radius-card)] border border-border/60 bg-background p-8 md:p-10 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Network className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {t("sectionIII.sleptonsEyebrow")}
                </span>
              </div>
              <h3
                className="text-2xl md:text-3xl font-semibold text-foreground mb-4"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {sleptons.name}
              </h3>
              <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed mb-6">
                {sleptons.tagline}
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
                {sleptons.description}
              </p>

              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                {t("sectionIII.highlightsKicker")}
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                {sleptons.highlights.map((h, idx) => (
                  <li
                    key={h.title}
                    className="rounded-[var(--radius-xl)] border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                        S{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h4 className="text-sm md:text-base font-bold text-foreground mb-1.5">
                      {h.title}
                    </h4>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {h.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ─── Ⅳ. Organizational Principles ────────────────────────────── */}
      <section
        id="section-iv"
        className="py-24 md:py-32 border-t border-border/50 bg-background scroll-mt-28"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative mb-14 md:mb-20">
            <span
              aria-hidden="true"
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-semibold leading-none text-muted-foreground/10 select-none pointer-events-none"
              style={{ letterSpacing: "var(--tracking-display)" }}
            >
              Ⅳ
            </span>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                {t("chapters.chapter")} Ⅳ · {t("chapters.ivTitle")}
              </span>
            </div>
            <AnimateIn preset="emerge">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance text-foreground mb-8"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("sectionIV.heading")}
              </h2>
            </AnimateIn>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {t("sectionIV.intro")}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-wide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {ORGANIZATION_PRINCIPLES.map((principle) => {
              const content = {
                number: principle.number,
                title: tp(`items.${principle.key}.title`),
                description: tp(`items.${principle.key}.description`),
              };
              return (
                <article
                  key={content.number}
                  className="relative h-full rounded-[var(--radius-card)] border border-border/60 bg-muted/20 p-8 md:p-10 border-l-4 border-l-foreground overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-4 right-4 text-[7rem] md:text-[8rem] font-semibold leading-none text-muted-foreground/15 select-none pointer-events-none"
                    style={{ letterSpacing: "var(--tracking-display)" }}
                  >
                    {content.number}
                  </span>
                  <span className="relative font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
                    {tp("label", { number: content.number })}
                  </span>
                  <h3 className="relative text-xl md:text-2xl font-bold tracking-tight text-foreground mb-5 leading-snug">
                    {content.title}
                  </h3>
                  <p className="relative text-sm md:text-base text-muted-foreground leading-relaxed">
                    {content.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Footer Signature ─────────────────────────────────────────── */}
      <section className="py-20 md:py-28 border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="flex items-start gap-3">
              <ScrollText
                className="h-4 w-4 text-muted-foreground mt-1"
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  {t("hero.updated")}
                </p>
                <Link
                  href="/about"
                  className="group inline-flex items-center gap-2 text-sm md:text-base font-medium text-foreground hover:text-foreground/80 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="underline underline-offset-4 decoration-border">
                    {t("hero.back")}
                  </span>
                </Link>
              </div>
            </div>
            <p className="text-sm md:text-base font-mono tracking-[0.15em] text-muted-foreground md:text-right">
              {quote.attribution}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
