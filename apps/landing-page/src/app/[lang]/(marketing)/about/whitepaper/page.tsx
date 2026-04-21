import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Compass,
  Layers,
  Network,
  ScrollText,
  Shield,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";

import {
  type Bilingual,
  CORE_QUOTE,
  META_UNICORN_THESIS,
  OMNI_FACTOR_GROUPS,
  ORGANIZATION_PRINCIPLES,
  PRODUCT_BUILDER_CORE,
  PRODUCT_SLEPTONS,
  pick,
} from "../_about-data";

// ─── Page-level labels (bilingual, strictly engineering-tone) ────────────────

const PAGE_META: Bilingual<{ title: string; description: string }> = {
  zh: {
    title: "商业白皮书 — Nebutra",
    description: "Nebutra 元独角兽生态与超级个体基建宣言 · 四章战略文档",
  },
  en: {
    title: "Business Whitepaper — Nebutra",
    description:
      "Nebutra Meta-Unicorn Ecosystem & Super-Individual Infrastructure — four-chapter strategy document",
  },
};

const HERO_LABELS: Bilingual<{
  eyebrow: string;
  title: string;
  readTime: string;
  tocKicker: string;
  updated: string;
  back: string;
}> = {
  zh: {
    eyebrow: "NEBUTRA BUSINESS WHITEPAPER / 商业白皮书",
    title: "Nebutra 商业白皮书与生态基建宣言",
    readTime: "全文约 15 分钟阅读",
    tocKicker: "目录",
    updated: "最后更新:2026-04-21",
    back: "返回 About",
  },
  en: {
    eyebrow: "NEBUTRA BUSINESS WHITEPAPER",
    title: "The Meta-Unicorn Ecosystem & Super-Individual Infrastructure",
    readTime: "Read 15 min",
    tocKicker: "Contents",
    updated: "Last updated: 2026-04-21",
    back: "Back to About",
  },
};

const CHAPTER_LABELS: Bilingual<{
  chapter: string;
  iTitle: string;
  iiTitle: string;
  iiiTitle: string;
  ivTitle: string;
}> = {
  zh: {
    chapter: "第",
    iTitle: "战略定位:元独角兽与无限裂变",
    iiTitle: "超级要素路由协议",
    iiiTitle: "全链路 AI 原生基建",
    ivTitle: "组织演进准则:AI 杠杆对抗人治腐化",
  },
  en: {
    chapter: "Chapter",
    iTitle: "Strategic Position: Meta-Unicorn & Infinite Fission",
    iiTitle: "Omni-Factor Routing Protocol",
    iiiTitle: "The AI-Native Convergence",
    ivTitle: "Organizational Principles: AI Leverage over Human Corrosion",
  },
};

const I_COPY: Bilingual<{
  goalsKicker: string;
  goals: ReadonlyArray<{ title: string; desc: string }>;
}> = {
  zh: {
    goalsKicker: "核心目标",
    goals: [
      {
        title: "让创业智能化",
        desc: "以 AI 原生基建降低创业的技术启动成本,让高质量工程产出不再依赖大团队。",
      },
      {
        title: "让创业轻量化",
        desc: "一人公司(OPC)即可构建具备多租户、计费与合规的高利润数字公司。",
      },
      {
        title: "让创业民主化",
        desc: "破除「大厂背书」与「名校标签」的权威壁垒,以可验证的工程产出替代身份标签。",
      },
    ],
  },
  en: {
    goalsKicker: "Core Objectives",
    goals: [
      {
        title: "Make entrepreneurship intelligent",
        desc: "Use AI-native infrastructure to lower the technical cost of starting up — so high-quality engineering output no longer depends on large teams.",
      },
      {
        title: "Make entrepreneurship lightweight",
        desc: "A one-person company (OPC) should be able to run a high-margin digital business with multi-tenancy, billing, and compliance built in.",
      },
      {
        title: "Make entrepreneurship democratic",
        desc: 'Dismantle the authority walls of "big-company pedigree" and "elite-school labels" — replace identity signals with verifiable engineering output.',
      },
    ],
  },
};

const II_COPY: Bilingual<{ intro: string }> = {
  zh: {
    intro:
      "现代商业运转的主要摩擦不在于资源不足,而在于中介低效、系统傲慢与标签偏见导致的资源错配。Nebutra 将自身定位为一条消除摩擦的数字神经网络,作为生产要素的终极路由引擎——让三类要素流向它们真正创造产出的节点。",
  },
  en: {
    intro:
      "The primary friction in modern commerce is not scarcity, but resource misallocation — caused by inefficient intermediaries, opaque systems, and identity-based bias. Nebutra positions itself as a friction-eliminating digital neural network, a terminal routing engine for factors of production — directing three classes of inputs to the nodes where they actually generate output.",
  },
};

const III_COPY: Bilingual<{
  intro: string;
  builderEyebrow: string;
  sleptonsEyebrow: string;
  overviewKicker: string;
  highlightsKicker: string;
}> = {
  zh: {
    intro:
      "Nebutra 不是碎片化工具的缝合,而是对商业孵化、代码托管、合伙人匹配、产品发布与风险投资逻辑进行本土化重构与 AI 原生集成,形成一条端到端的可验证链路。",
    builderEyebrow: "L0 · 工程底座",
    sleptonsEyebrow: "L1 · 信任与撮合",
    overviewKicker: "产品概述",
    highlightsKicker: "核心能力",
  },
  en: {
    intro:
      "Nebutra is not a patchwork of fragmented tools. It is a deep, localized reconstruction and AI-native integration of business incubation, code hosting, partner matching, product launch, and venture logic — assembled into one verifiable end-to-end path.",
    builderEyebrow: "L0 · Engineering Foundation",
    sleptonsEyebrow: "L1 · Trust & Matching",
    overviewKicker: "Overview",
    highlightsKicker: "Core Capabilities",
  },
};

const IV_COPY: Bilingual<{ intro: string }> = {
  zh: {
    intro:
      "伟大的组织不应在扩张过程中走向平庸与官僚化。当 Nebutra 生态及其孵化公司面临规模激增时,以下三条准则不可妥协——它们决定组织是继续复利,还是走向内耗。",
  },
  en: {
    intro:
      "Great organizations should not drift toward mediocrity and bureaucracy as they scale. When Nebutra's ecosystem and its portfolio companies face rapid growth, the following three principles are non-negotiable — they decide whether the organization continues to compound, or begins to erode from within.",
  },
};

// TOC anchors (stable IDs)
const TOC: Bilingual<ReadonlyArray<{ id: string; label: string; roman: string }>> = {
  zh: [
    { id: "section-i", label: "战略定位:元独角兽", roman: "Ⅰ" },
    { id: "section-ii", label: "超级要素路由协议", roman: "Ⅱ" },
    { id: "section-iii", label: "全链路 AI 原生基建", roman: "Ⅲ" },
    { id: "section-iv", label: "组织演进准则", roman: "Ⅳ" },
  ],
  en: [
    { id: "section-i", label: "Strategic Position", roman: "Ⅰ" },
    { id: "section-ii", label: "Omni-Factor Routing Protocol", roman: "Ⅱ" },
    { id: "section-iii", label: "AI-Native Convergence", roman: "Ⅲ" },
    { id: "section-iv", label: "Organizational Principles", roman: "Ⅳ" },
  ],
};

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const meta = pick(lang, PAGE_META);

  return {
    title: meta.title,
    description: meta.description,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function WhitepaperPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const hero = pick(lang, HERO_LABELS);
  const chapters = pick(lang, CHAPTER_LABELS);
  const thesis = pick(lang, META_UNICORN_THESIS);
  const iCopy = pick(lang, I_COPY);
  const iiCopy = pick(lang, II_COPY);
  const iiiCopy = pick(lang, III_COPY);
  const ivCopy = pick(lang, IV_COPY);
  const quote = pick(lang, CORE_QUOTE);
  const toc = pick(lang, TOC);
  const builder = pick(lang, PRODUCT_BUILDER_CORE);
  const sleptons = pick(lang, PRODUCT_SLEPTONS);

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-32 md:pt-48 pb-20 md:pb-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimateIn preset="fadeUp">
            <div className="flex items-center gap-4 mb-10">
              <span className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-muted-foreground">
                {hero.eyebrow}
              </span>
              <span className="h-px flex-1 bg-border/70" />
              <span className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {hero.readTime}
              </span>
            </div>
          </AnimateIn>

          <AnimateIn preset="emerge">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-balance leading-[1.05] text-foreground mb-14">
              {hero.title}
            </h1>
          </AnimateIn>

          <AnimateIn preset="fade">
            <figure className="border-l-2 border-foreground pl-6 md:pl-8 py-2 mb-16 md:mb-20">
              <blockquote className="text-xl md:text-2xl lg:text-[1.7rem] font-medium leading-relaxed text-foreground/90 text-balance">
                {quote.text}
              </blockquote>
              <figcaption className="mt-6 text-xs md:text-sm font-mono tracking-[0.2em] uppercase text-muted-foreground">
                {quote.attribution}
              </figcaption>
            </figure>
          </AnimateIn>

          {/* TOC */}
          <AnimateIn preset="fadeUp">
            <nav
              aria-label={hero.tocKicker}
              className="rounded-2xl border border-border/60 bg-muted/20 p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-5">
                <BookOpen className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {hero.tocKicker}
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
          </AnimateIn>
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
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-black leading-none tracking-tighter text-muted-foreground/10 select-none pointer-events-none"
            >
              Ⅰ
            </span>
            <AnimateIn preset="fadeUp">
              <div className="flex items-center gap-3 mb-6">
                <Compass className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {chapters.chapter} Ⅰ · {chapters.iTitle}
                </span>
              </div>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-balance leading-[1.08] text-foreground">
                {thesis.headline}
              </h2>
            </AnimateIn>
          </div>

          <div className="space-y-8 md:space-y-10 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            <AnimateIn preset="fade">
              <p>{thesis.thesis}</p>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p>{thesis.paradigm}</p>
            </AnimateIn>
          </div>

          {/* Core objectives */}
          <div className="mt-16 md:mt-20">
            <AnimateIn preset="fadeUp">
              <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
                {iCopy.goalsKicker}
              </span>
            </AnimateIn>
            <AnimateInGroup
              stagger="normal"
              className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
            >
              {iCopy.goals.map((goal, idx) => (
                <AnimateIn key={goal.title} preset="fadeUp">
                  <article className="h-full rounded-2xl border border-border/60 bg-background p-6 md:p-7">
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
                </AnimateIn>
              ))}
            </AnimateInGroup>
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
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-black leading-none tracking-tighter text-muted-foreground/10 select-none pointer-events-none"
            >
              Ⅱ
            </span>
            <AnimateIn preset="fadeUp">
              <div className="flex items-center gap-3 mb-6">
                <Network className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {chapters.chapter} Ⅱ · {chapters.iiTitle}
                </span>
              </div>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-balance leading-[1.08] text-foreground mb-8">
                {lang === "zh" ? "超级要素路由协议" : "Omni-Factor Routing Protocol"}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {iiCopy.intro}
              </p>
            </AnimateIn>
          </div>
        </div>

        {/* Three factor groups — wider container for grid */}
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
          >
            {OMNI_FACTOR_GROUPS.map((group, idx) => {
              const content = pick(lang, group);
              return (
                <AnimateIn key={content.subtitle} preset="fadeUp">
                  <article className="group h-full rounded-3xl border border-border/60 bg-muted/20 p-8 md:p-10 transition-all duration-500 hover:border-border hover:bg-muted/40">
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
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
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
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-black leading-none tracking-tighter text-muted-foreground/10 select-none pointer-events-none"
            >
              Ⅲ
            </span>
            <AnimateIn preset="fadeUp">
              <div className="flex items-center gap-3 mb-6">
                <Layers className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {chapters.chapter} Ⅲ · {chapters.iiiTitle}
                </span>
              </div>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-balance leading-[1.08] text-foreground mb-8">
                {lang === "zh" ? "全链路 AI 原生基建" : "The AI-Native Convergence"}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {iiiCopy.intro}
              </p>
            </AnimateIn>
          </div>
        </div>

        {/* Dual product deep-dive */}
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"
          >
            {/* Builder Core */}
            <AnimateIn preset="fadeUp">
              <article className="h-full rounded-3xl border border-border/60 bg-background p-8 md:p-10 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <Layers className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                    {iiiCopy.builderEyebrow}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground mb-4 leading-[1.1]">
                  {builder.name}
                </h3>
                <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed mb-6">
                  {builder.tagline}
                </p>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
                  {builder.description}
                </p>

                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                  {iiiCopy.highlightsKicker}
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                  {builder.highlights.map((h, idx) => (
                    <li
                      key={h.title}
                      className="rounded-xl border border-border/50 bg-muted/20 p-4"
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
            </AnimateIn>

            {/* Sleptons */}
            <AnimateIn preset="fadeUp">
              <article className="h-full rounded-3xl border border-border/60 bg-background p-8 md:p-10 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <Network className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                    {iiiCopy.sleptonsEyebrow}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground mb-4 leading-[1.1]">
                  {sleptons.name}
                </h3>
                <p className="text-base md:text-lg font-medium text-foreground/90 leading-relaxed mb-6">
                  {sleptons.tagline}
                </p>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
                  {sleptons.description}
                </p>

                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                  {iiiCopy.highlightsKicker}
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                  {sleptons.highlights.map((h, idx) => (
                    <li
                      key={h.title}
                      className="rounded-xl border border-border/50 bg-muted/20 p-4"
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
            </AnimateIn>
          </AnimateInGroup>
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
              className="absolute -top-10 md:-top-14 right-0 text-[8rem] md:text-[12rem] font-black leading-none tracking-tighter text-muted-foreground/10 select-none pointer-events-none"
            >
              Ⅳ
            </span>
            <AnimateIn preset="fadeUp">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-4 w-4 text-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                  {chapters.chapter} Ⅳ · {chapters.ivTitle}
                </span>
              </div>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-balance leading-[1.08] text-foreground mb-8">
                {lang === "zh"
                  ? "组织演进准则 · AI 杠杆对抗人治腐化"
                  : "Organizational Principles · AI Leverage over Human Corrosion"}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {ivCopy.intro}
              </p>
            </AnimateIn>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {ORGANIZATION_PRINCIPLES.map((principle) => {
              const content = pick(lang, principle);
              return (
                <AnimateIn key={content.number} preset="fadeUp">
                  <article className="relative h-full rounded-3xl border border-border/60 bg-muted/20 p-8 md:p-10 border-l-4 border-l-foreground overflow-hidden">
                    <span
                      aria-hidden="true"
                      className="absolute -top-4 right-4 text-[7rem] md:text-[8rem] font-black leading-none tracking-tighter text-muted-foreground/15 select-none pointer-events-none"
                    >
                      {content.number}
                    </span>
                    <span className="relative font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
                      PRINCIPLE {content.number}
                    </span>
                    <h3 className="relative text-xl md:text-2xl font-bold tracking-tight text-foreground mb-5 leading-snug">
                      {content.title}
                    </h3>
                    <p className="relative text-sm md:text-base text-muted-foreground leading-relaxed">
                      {content.description}
                    </p>
                  </article>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
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
                  {hero.updated}
                </p>
                <Link
                  href="/about"
                  className="group inline-flex items-center gap-2 text-sm md:text-base font-medium text-foreground hover:text-foreground/80 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="underline underline-offset-4 decoration-border">
                    {hero.back}
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

      <FooterMinimal />
    </main>
  );
}
