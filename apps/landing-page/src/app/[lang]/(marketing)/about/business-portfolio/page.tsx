import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import { ArrowRight, Boxes, Cpu, Database, Shield } from "lucide-react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";
import { CAPABILITY_GROUPS, pick } from "../_about-data";

// ─── Static metadata (bilingual) ─────────────────────────────────────────────
const PAGE_META = {
  zh: {
    title: "核心能力布局 — 云毓智能",
    description:
      "19 项核心能力覆盖模态维度、技术能力、平台基础设施与数据治理四大层面，构筑 AI 原生数据智能全栈底座。",
  },
  en: {
    title: "Business Portfolio — Nebutra",
    description:
      "19 core capabilities spanning modality, technology, platform infrastructure, and data governance — the full-stack foundation for AI-native data intelligence.",
  },
} as const;

// ─── Page-level copy (bilingual) ─────────────────────────────────────────────
const HERO_COPY = {
  zh: {
    kicker: "核心能力布局",
    heading: "19 项核心能力，四重能力维度",
    lead: "从模态覆盖到技术底座、从平台基础设施到数据治理 — 我们以四组共 19 项能力，构建 AI 原生数据智能的全链路工程体系。",
  },
  en: {
    kicker: "Business Portfolio",
    heading: "19 core capabilities across 4 dimensions",
    lead: "From modality coverage to technology foundations, platform infrastructure, and data governance — 19 capabilities forming an end-to-end AI-native data intelligence stack.",
  },
} as const;

const SECTION_HEADINGS = {
  zh: {
    groupsKicker: "能力图谱",
    groupsHeading: "按层分解",
    matrixKicker: "能力矩阵",
    matrixHeading: "一图概览 19 项核心能力",
    matrixLead: "四组能力并列呈现，便于对照、编排与组合落地。",
    ctaKicker: "需要深入了解？",
    ctaHeading: "想针对某一项能力洽谈落地？",
    ctaLead: "告诉我们您的场景，我们会匹配专属架构师与工程团队为您做技术对齐。",
    ctaButton: "联系我们",
  },
  en: {
    groupsKicker: "Capability Map",
    groupsHeading: "Breakdown by layer",
    matrixKicker: "Capability Matrix",
    matrixHeading: "19 capabilities at a glance",
    matrixLead: "Four groups side by side — easy to compare, orchestrate, and compose.",
    ctaKicker: "Dive Deeper?",
    ctaHeading: "Want to go deeper on any capability?",
    ctaLead:
      "Tell us your scenario — we'll pair you with a dedicated architect and engineering team for technical alignment.",
    ctaButton: "Contact us",
  },
} as const;

// Map group keys to icons for a consistent visual anchor.
const GROUP_ICONS: Record<string, typeof Boxes> = {
  modality: Boxes,
  technology: Cpu,
  platform: Database,
  governance: Shield,
};

// ─── generateMetadata ────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const meta = lang === "zh" ? PAGE_META.zh : PAGE_META.en;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${lang}/about/business-portfolio` },
  };
}

// ─── Page component ──────────────────────────────────────────────────────────
export default async function BusinessPortfolioPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const hero = lang === "zh" ? HERO_COPY.zh : HERO_COPY.en;
  const copy = lang === "zh" ? SECTION_HEADINGS.zh : SECTION_HEADINGS.en;

  // Stats pulled directly from CAPABILITY_GROUPS — kept in-sync with source data.
  const stats = CAPABILITY_GROUPS.map((g) => {
    const meta = pick(lang, g.meta);
    return {
      key: g.key,
      count: g.items.length,
      label: meta.title,
    };
  });
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* ─── Section 1 · Hero ─────────────────────────────────────────────── */}
      <section className="pt-32 md:pt-48 pb-20 md:pb-24 border-b border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="emerge">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
              {hero.kicker}
            </span>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-8 max-w-5xl">
              {hero.heading}
            </h1>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-16">
              {hero.lead}
            </p>
          </AnimateIn>

          {/* Stats row — capability counts per group */}
          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-10 border-t border-border/50"
          >
            {stats.map((s) => (
              <AnimateIn key={s.key} preset="fadeUp">
                <div className="flex flex-col gap-2">
                  <span className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                    {s.count}
                  </span>
                  <span className="text-xs md:text-sm font-mono tracking-wider uppercase text-muted-foreground">
                    {s.label.replace(/^[A-D] · /, "")}
                  </span>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>

          <AnimateIn preset="fade">
            <p className="mt-10 text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
              {lang === "zh"
                ? `总计 ${totalCount} 项核心能力 · 四大维度`
                : `Total ${totalCount} capabilities · 4 dimensions`}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* ─── Section 2 · Group breakdown (one section per group) ──────────── */}
      {CAPABILITY_GROUPS.map((group, groupIdx) => {
        const meta = pick(lang, group.meta);
        const Icon = GROUP_ICONS[group.key] ?? Boxes;
        // Alternating bg for visual rhythm without introducing new tokens.
        const altBg = groupIdx % 2 === 1 ? "bg-muted/30" : "bg-background";
        // Tailwind grid — modality has 6 items (3-col), tech/platform have 4 (2x2 on md),
        // governance has 5; cap at 3 columns for readability.
        const gridCols =
          group.items.length >= 5
            ? "md:grid-cols-2 lg:grid-cols-3"
            : group.items.length === 4
              ? "md:grid-cols-2"
              : "md:grid-cols-2 lg:grid-cols-3";

        return (
          <section key={group.key} className={`py-24 md:py-32 ${altBg} border-b border-border/50`}>
            <div className="container mx-auto px-4 max-w-[1400px]">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 md:mb-20">
                <div className="max-w-2xl">
                  <AnimateIn preset="emerge">
                    <div className="inline-flex items-center gap-3 mb-6 px-3 py-1.5 rounded-full border border-border bg-background">
                      <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                      <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                        {`Group ${String.fromCharCode(65 + groupIdx)} · ${group.items.length} ${lang === "zh" ? "项" : "items"}`}
                      </span>
                    </div>
                  </AnimateIn>

                  <AnimateIn preset="fadeUp">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-balance mb-4">
                      {meta.title}
                    </h2>
                  </AnimateIn>

                  <AnimateIn preset="fadeUp">
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {meta.subtitle}
                    </p>
                  </AnimateIn>
                </div>

                <AnimateIn preset="fade">
                  <div className="hidden lg:flex items-end text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/60">
                    {String(groupIdx + 1).padStart(2, "0")} /{" "}
                    {String(CAPABILITY_GROUPS.length).padStart(2, "0")}
                  </div>
                </AnimateIn>
              </div>

              <AnimateInGroup
                stagger="normal"
                className={`grid grid-cols-1 ${gridCols} gap-5 md:gap-6`}
              >
                {group.items.map((item, idx) => {
                  const cap = pick(lang, item);
                  return (
                    <AnimateIn key={`${group.key}-${idx}`} preset="fadeUp">
                      <article className="group relative h-full flex flex-col gap-4 p-7 md:p-8 rounded-2xl border border-border bg-background hover:border-foreground/40 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
                            {String.fromCharCode(65 + groupIdx)}.{String(idx + 1).padStart(2, "0")}
                          </span>
                          <Icon
                            className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors"
                            aria-hidden="true"
                          />
                        </div>

                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-snug">
                          {cap.category}
                        </h3>

                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-auto">
                          {cap.description}
                        </p>
                      </article>
                    </AnimateIn>
                  );
                })}
              </AnimateInGroup>
            </div>
          </section>
        );
      })}

      {/* ─── Section 3 · Capability matrix overview ─────────────────────── */}
      <section className="py-24 md:py-32 bg-background border-b border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-16 md:mb-20 max-w-3xl">
            <AnimateIn preset="emerge">
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
                {copy.matrixKicker}
              </span>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-balance mb-6">
                {copy.matrixHeading}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {copy.matrixLead}
              </p>
            </AnimateIn>
          </div>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6"
          >
            {CAPABILITY_GROUPS.map((group, groupIdx) => {
              const meta = pick(lang, group.meta);
              const Icon = GROUP_ICONS[group.key] ?? Boxes;
              return (
                <AnimateIn key={group.key} preset="fadeUp">
                  <div className="h-full flex flex-col gap-5 p-6 md:p-7 rounded-2xl border border-border bg-muted/30">
                    <div className="flex items-center gap-3 pb-5 border-b border-border/60">
                      <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                      <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                        {String.fromCharCode(65 + groupIdx)} · {group.items.length}
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
                      {meta.title.replace(/^[A-D] · /, "")}
                    </h3>
                    <ul className="flex flex-col gap-2.5 mt-1">
                      {group.items.map((item, idx) => {
                        const cap = pick(lang, item);
                        return (
                          <li
                            key={`${group.key}-sum-${idx}`}
                            className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                          >
                            <span
                              className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-foreground/40"
                              aria-hidden="true"
                            />
                            <span>{cap.category}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </section>

      {/* ─── Section 4 · CTA ─────────────────────────────────────────────── */}
      <section className="py-32 md:py-40 bg-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <AnimateIn preset="emerge">
            <div className="inline-block mb-8 px-4 py-1.5 rounded-full border border-border bg-muted/30">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
                {copy.ctaKicker}
              </span>
            </div>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-balance mb-8">
              {copy.ctaHeading}
            </h2>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-12">
              {copy.ctaLead}
            </p>
          </AnimateIn>

          <AnimateIn preset="fade">
            <Link href="/contact">
              <Button
                size="lg"
                className="rounded-full h-14 px-8 text-base font-bold bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
              >
                {copy.ctaButton}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </AnimateIn>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
