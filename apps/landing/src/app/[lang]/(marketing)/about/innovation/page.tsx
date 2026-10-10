import {
  ArrowRight,
  type Code,
  Cpu,
  GitBranch,
  Layers,
  NetworkDevice as Network,
  Route,
  Shield,
  Sparkles,
  Terminal,
  Workflow,
  Lightning as Zap,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HARNESS_TIMELINE, ORGANIZATION_PRINCIPLES } from "../_about-data";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang, namespace: "aboutPages.innovation" });
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/about/innovation",
    locale: lang as Locale,
  });
}

// ─── Page-local data (copy lives in aboutPages.innovation.*) ─────────────────

// Pillar 2A — AI-Native Architecture (Harness layer sub-items):
// `aiNativeItems.<key>.name|desc`.
const AI_NATIVE_ITEMS = [
  { key: "mcp", icon: Workflow },
  { key: "a2a", icon: Network },
  { key: "workflowGraphs", icon: GitBranch },
  { key: "aiGateway", icon: Route },
] as const satisfies ReadonlyArray<{ key: string; icon: typeof Code }>;

// `ossStats.<key>.label`; the values are figures.
const OSS_STATS = [
  { key: "stars", value: "1,500+" },
  { key: "contributors", value: "300+" },
  { key: "packages", value: "42" },
  { key: "license", value: "MIT" },
] as const;

// Pillar 2C — Engineering principles: `practices.<key>.name|desc`.
const ENGINEERING_PRINCIPLES = [
  { key: "tdd", icon: Terminal },
  { key: "ppr", icon: Zap },
  { key: "edgeFirst", icon: Cpu },
  { key: "typeSafety", icon: Layers },
  { key: "observability", icon: Sparkles },
  { key: "monorepo", icon: GitBranch },
  { key: "review", icon: Shield },
] as const satisfies ReadonlyArray<{ key: string; icon: typeof Code }>;

// Innovation timeline: `milestones.<key>.title|desc`.
const MILESTONES = [
  { key: "inception", date: "2025 Q3" },
  { key: "openSource", date: "2025 Q4" },
  { key: "harness", date: "2026 Q1" },
  { key: "multimodal", date: "2026 Q2" },
  { key: "global", date: "2026 Q3" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InnovationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "aboutPages.innovation" });

  const tp = await getTranslations({ locale: lang, namespace: "aboutPages.principles" });

  const pillar = (key: "aiNative" | "oss" | "practices") => ({
    title: t(`pillarItems.${key}.title`),
    description: t(`pillarItems.${key}.description`),
  });
  const aiNativePillar = pillar("aiNative");
  const ossPillar = pillar("oss");
  const bestPracticesPillar = pillar("practices");

  return (
    <main id="main-content" className="flex flex-col flex-1 bg-background">
      {/* 1. Hero — R&D Manifesto */}
      <section className="relative pt-32 md:pt-48 pb-24 md:pb-32 overflow-hidden">
        <AuroraBackground variant="vivid" position="top" intensity={0.6} />
        <div className="relative container mx-auto px-4 max-w-wide">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
            {t("hero.eyebrow")}
          </span>
          <AnimateIn preset="fadeUp">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-10 max-w-4xl"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("hero.heading")}
            </h1>
          </AnimateIn>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-8">
            {t("hero.manifesto")}
          </p>
          <p className="text-base md:text-lg text-foreground/90 leading-relaxed max-w-3xl border-l-2 border-foreground pl-4 font-medium">
            {t("hero.battlefield")}
          </p>
        </div>
      </section>

      {/* 2. Harness Timeline — AI Stack 三层演化 (Russian-doll nested layers) */}
      <section className="relative py-24 md:py-32 border-y border-border/50 bg-muted/10 overflow-hidden">
        <AuroraBackground variant="subtle" position="center" intensity={0.4} />
        <div className="relative container mx-auto px-4 max-w-wide">
          <div className="max-w-3xl mb-16 md:mb-20">
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
              {t("harness.eyebrow")}
            </span>
            <AnimateIn preset="fadeUp">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("harness.heading")}
              </h2>
            </AnimateIn>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("harness.intro")}
            </p>
          </div>

          {/* Nested "Russian doll" — Harness wraps Context wraps Weights.
              HARNESS_TIMELINE is ordered [Weights, Context, Harness] → we render from outside in. */}
          {(() => {
            const [weightsLayer, contextLayer, harnessLayer] = HARNESS_TIMELINE.map((layer) => ({
              ...layer,
              layer: t(`layers.${layer.key}`),
            }));

            return (
              <div
                className="relative rounded-[var(--radius-panel)] bg-background p-6 md:p-10 lg:p-14"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                {/* Harness (outermost, highlighted) */}
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                      {t("layerLabel", { number: "03" })} · {harnessLayer.year}
                    </span>
                    <span className="text-[10px] font-mono tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background px-2.5 py-1">
                      {t("harness.currentTag")}
                    </span>
                  </div>
                  <span className="text-xs md:text-sm font-semibold tracking-tight text-foreground">
                    {t("harness.battlefieldTag")}
                  </span>
                </div>
                <h3
                  className="text-2xl md:text-3xl font-semibold text-foreground mb-5"
                  style={{
                    letterSpacing: "var(--tracking-heading)",
                    lineHeight: "var(--leading-heading)",
                  }}
                >
                  {harnessLayer.layer}
                </h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {harnessLayer.themes.map((theme) => (
                    <span
                      key={theme}
                      className="text-xs md:text-sm font-mono tracking-tight rounded-full border border-foreground bg-foreground text-background px-3 py-1.5"
                    >
                      {theme}
                    </span>
                  ))}
                </div>

                {/* Context (middle) */}
                <div className="rounded-[var(--radius-card)] border border-border bg-muted/30 p-5 md:p-8 lg:p-10">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                    <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                      {t("layerLabel", { number: "02" })} · {contextLayer.year}
                    </span>
                  </div>
                  <h3
                    className="text-xl md:text-2xl font-semibold text-foreground/90 mb-4"
                    style={{
                      letterSpacing: "var(--tracking-heading)",
                      lineHeight: "var(--leading-heading)",
                    }}
                  >
                    {contextLayer.layer}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {contextLayer.themes.map((theme) => (
                      <span
                        key={theme}
                        className="text-xs font-mono tracking-tight rounded-full border border-border bg-background text-foreground/80 px-2.5 py-1"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>

                  {/* Weights (innermost) */}
                  <div className="rounded-[var(--radius-card)] border border-border/70 bg-background p-4 md:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
                      <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                        {t("layerLabel", { number: "01" })} · {weightsLayer.year}
                      </span>
                    </div>
                    <h3
                      className="text-lg md:text-xl font-semibold text-foreground/70 mb-3"
                      style={{ letterSpacing: "var(--tracking-tight)" }}
                    >
                      {weightsLayer.layer}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {weightsLayer.themes.map((theme) => (
                        <span
                          key={theme}
                          className="text-[11px] font-mono tracking-tight rounded-full border border-border/60 bg-muted/40 text-muted-foreground px-2 py-0.5"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <p className="mt-10 md:mt-12 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t("harness.outro")}
          </p>
        </div>
      </section>

      {/* 3. Pillar 01 — AI-Native Architecture (Harness stack) */}
      <section className="py-24 md:py-32 border-b border-border/50">
        <div className="container mx-auto px-4 max-w-wide">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5">
              <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                {t("pillarLabel", { number: "01" })}
              </span>
              <AnimateIn preset="fadeUp">
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
                  style={{
                    letterSpacing: "var(--tracking-heading)",
                    lineHeight: "var(--leading-heading)",
                  }}
                >
                  {aiNativePillar.title}
                </h2>
              </AnimateIn>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {aiNativePillar.description}
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AI_NATIVE_ITEMS.map((entry, i) => {
                  const item = {
                    name: t(`aiNativeItems.${entry.key}.name`),
                    desc: t(`aiNativeItems.${entry.key}.desc`),
                  };
                  const Icon = entry.icon;
                  return (
                    <div
                      key={entry.key}
                      className="h-full rounded-[var(--radius-card)] bg-muted/20 p-6 hover:bg-muted/40 hover:-translate-y-px transition-[background-color,transform] duration-150 motion-reduce:hover:translate-y-0"
                      style={{ boxShadow: "var(--ring-hairline)" }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                        <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                          H{(i + 1).toString().padStart(2, "0")}
                        </span>
                      </div>
                      <h3
                        className="text-lg font-semibold text-foreground mb-2"
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pillar 02 — Open-Source Infrastructure */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-wide">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5 lg:order-2">
              <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                {t("pillarLabel", { number: "02" })}
              </span>
              <AnimateIn preset="fadeUp">
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
                  style={{
                    letterSpacing: "var(--tracking-heading)",
                    lineHeight: "var(--leading-heading)",
                  }}
                >
                  {ossPillar.title}
                </h2>
              </AnimateIn>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                {ossPillar.description}
              </p>
              <p className="text-base text-muted-foreground/90 leading-relaxed border-l-2 border-border pl-4">
                {t("pillars.ossSupplement")}
              </p>
            </div>

            <div className="lg:col-span-7 lg:order-1">
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                {OSS_STATS.map((entry) => {
                  const stat = { value: entry.value, label: t(`ossStats.${entry.key}.label`) };
                  return (
                    <div
                      key={entry.key}
                      className="rounded-[var(--radius-card)] bg-muted/10 p-8 md:p-10 h-full flex flex-col justify-between"
                      style={{ boxShadow: "var(--ring-hairline)" }}
                    >
                      <span
                        className="text-2xl md:text-3xl font-semibold text-foreground"
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {stat.value}
                      </span>
                      <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mt-6">
                        {stat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pillar 03 — Engineering Best Practices */}
      <section className="py-24 md:py-32 border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 max-w-wide">
          <div className="max-w-3xl mb-16 md:mb-20">
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
              {t("pillarLabel", { number: "03" })}
            </span>
            <AnimateIn preset="fadeUp">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {bestPracticesPillar.title}
              </h2>
            </AnimateIn>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {bestPracticesPillar.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {ENGINEERING_PRINCIPLES.map((entry, i) => {
              const principle = {
                name: t(`practices.${entry.key}.name`),
                desc: t(`practices.${entry.key}.desc`),
              };
              const Icon = entry.icon;
              return (
                <div
                  key={entry.key}
                  className="h-full rounded-[var(--radius-card)] bg-background p-7 hover:-translate-y-px transition-transform duration-150 motion-reduce:hover:translate-y-0"
                  style={{ boxShadow: "var(--ring-hairline)" }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                    <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                      P{(i + 1).toString().padStart(2, "0")}
                    </span>
                  </div>
                  <h3
                    className="text-xl font-semibold text-foreground mb-2"
                    style={{ letterSpacing: "var(--tracking-tight)" }}
                  >
                    {principle.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{principle.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Organizational Principles — Whitepaper Ⅳ */}
      <section className="py-24 md:py-32 border-b border-border/50 bg-background">
        <div className="container mx-auto px-4 max-w-wide">
          <div className="max-w-3xl mb-16 md:mb-20">
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
              {t("orgPrinciples.eyebrow")}
            </span>
            <AnimateIn preset="fadeUp">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance mb-8"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("orgPrinciples.heading")}
              </h2>
            </AnimateIn>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("orgPrinciples.intro")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {ORGANIZATION_PRINCIPLES.map((entry) => {
              const principle = {
                number: entry.number,
                title: tp(`items.${entry.key}.title`),
                description: tp(`items.${entry.key}.description`),
              };
              return (
                <article
                  key={principle.number}
                  className="relative h-full border-l-2 border-foreground bg-muted/20 pl-6 md:pl-8 pr-6 py-8 md:py-10 overflow-hidden"
                >
                  <span
                    aria-hidden
                    className="absolute right-4 top-2 text-[5rem] md:text-[7rem] font-semibold text-foreground/5 select-none pointer-events-none"
                    style={{ letterSpacing: "var(--tracking-display)", lineHeight: "1" }}
                  >
                    {principle.number}
                  </span>
                  <div className="relative">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                      {tp("label", { number: principle.number })}
                    </span>
                    <h3
                      className="text-xl md:text-2xl font-semibold text-foreground mb-4 text-balance"
                      style={{ letterSpacing: "var(--tracking-heading)" }}
                    >
                      {principle.title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Innovation Timeline */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-wide">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
              {t("timeline.eyebrow")}
            </span>
            <AnimateIn preset="fadeUp">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold text-balance"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {t("timeline.heading")}
              </h2>
            </AnimateIn>
          </div>

          <div className="relative">
            {/* vertical rail */}
            <div
              className="absolute left-0 md:left-[11.5rem] top-2 bottom-2 w-px bg-border"
              aria-hidden
            />

            <div className="flex flex-col gap-10 md:gap-14">
              {MILESTONES.map((entry) => {
                const ms = {
                  date: entry.date,
                  title: t(`milestones.${entry.key}.title`),
                  desc: t(`milestones.${entry.key}.desc`),
                };
                return (
                  <div
                    key={ms.date}
                    className="relative flex flex-col md:flex-row md:items-start gap-3 md:gap-10 pl-6 md:pl-0"
                  >
                    {/* dot */}
                    <span
                      className="absolute left-[-4px] md:left-[11.5rem] top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-foreground"
                      aria-hidden
                    />
                    <span className="w-full md:w-[11rem] text-sm font-mono tracking-widest uppercase text-muted-foreground md:pr-4">
                      {ms.date}
                    </span>
                    <div className="md:pl-8 flex-1">
                      <h3
                        className="text-xl md:text-2xl font-semibold text-foreground mb-2"
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {ms.title}
                      </h3>
                      <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                        {ms.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA */}
      <section className="relative py-32 md:py-48 border-t border-border/50 overflow-hidden">
        <AuroraBackground variant="vivid" position="bottom" intensity={0.7} />
        <div className="relative container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-semibold tracking-widest uppercase text-primary">
              {t("cta.eyebrow")}
            </span>
          </div>
          <AnimateIn preset="fadeUp">
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-12"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("cta.heading")}
            </h2>
          </AnimateIn>
          <Button asChild variant="ink" size="lg">
            <Link href="mailto:careers@nebutra.com">
              {t("cta.button")} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
