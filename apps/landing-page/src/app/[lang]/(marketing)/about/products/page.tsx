import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Github,
  Layers,
  Network,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";

import {
  type Bilingual,
  PILLARS,
  PRODUCT_BUILDER_CORE,
  PRODUCT_SLEPTONS,
  pick,
} from "../_about-data";

// ─── Metadata (bilingual) ─────────────────────────────────────────────────────

const PAGE_META: Bilingual<{ title: string; description: string }> = {
  zh: {
    title: "平台层产品 — Builder Core × Sleptons | 云毓智能",
    description:
      "Nebutra 以 Builder Core 与 Sleptons 两个平台层产品构成其交付表面。前者沉淀工程基线,后者承接协作与机会匹配;两者共同强调可验证、可审计、可交付。",
  },
  en: {
    title: "Platform Layers — Builder Core × Sleptons | Nebutra",
    description:
      "Nebutra presents Builder Core and Sleptons as two platform layers: one for governed product delivery, one for operator and opportunity coordination. Both are framed around verifiable, auditable, deliverable execution.",
  },
};

// ─── Hero copy ────────────────────────────────────────────────────────────────

const HERO: Bilingual<{
  eyebrow: string;
  heading: string;
  sublead: string;
  builderLabel: string;
  sleptonsLabel: string;
  builderCaption: string;
  sleptonsCaption: string;
}> = {
  zh: {
    eyebrow: "FLAGSHIP PRODUCTS / 旗舰产品",
    heading: "两层产品,一个平台",
    sublead:
      "Builder Core 以开源 Sailor 为技术内核,沉淀多租户、权限、计费、合规与 AI 集成的工程基线; Sleptons 承接协作、机会与资源匹配,其子模块 The Launchpad 提供更结构化的信号路由。两者共同服务于可验证、可审计、可交付的平台运营。",
    builderLabel: "L0 · ENTERPRISE R&D FOUNDATION",
    sleptonsLabel: "L1 · COORDINATION LAYER",
    builderCaption: "企业级研发基座 · 含开源 Sailor 技术内核 · 跨越研发工程鸿沟",
    sleptonsCaption: "协作与机会协调层 · 含 The Launchpad 子模块 · 让匹配过程更可观测",
  },
  en: {
    eyebrow: "FLAGSHIP PRODUCTS",
    heading: "Two Layers, One Platform",
    sublead:
      "Builder Core, powered by the open-source Sailor core, captures the governed engineering baseline for multi-tenancy, auth, billing, compliance, and AI integrations. Sleptons handles coordination, opportunity matching, and signal routing, with The Launchpad as its operator-facing submodule. Together they describe a verifiable, auditable, deliverable platform surface.",
    builderLabel: "L0 · ENTERPRISE R&D FOUNDATION",
    sleptonsLabel: "L1 · COORDINATION LAYER",
    builderCaption:
      "Enterprise R&D foundation · Open-source Sailor at its core · Crossing the engineering chasm",
    sleptonsCaption:
      "Coordination and opportunity layer · Includes The Launchpad submodule · Making matching more observable",
  },
};

// ─── Section labels (bilingual) ───────────────────────────────────────────────

const LABELS: Bilingual<{
  builderEyebrow: string;
  sleptonsEyebrow: string;
  overviewKicker: string;
  highlightsKicker: string;
  builderCoreRelationKicker: string;
  builderCoreRelationTitle: string;
  builderCoreRelationBody: string;
  docsLabel: string;
  githubLabel: string;
  exploreLabel: string;
  launchpadKicker: string;
  launchpadTitle: string;
  launchpadBody: string;
  launchpadBullets: ReadonlyArray<{ metric: string; note: string }>;
  whyTitle: string;
  whySubtitle: string;
  whyBody: string;
  whyBuilderHead: string;
  whyBuilderTagline: string;
  whyBuilderText: string;
  whySleptonsHead: string;
  whySleptonsTagline: string;
  whySleptonsText: string;
  whyCloser: string;
  pillarsKicker: string;
  pillarsTitle: string;
  pillarsSubtitle: string;
  ctaKicker: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaDocs: string;
  ctaSleptons: string;
  ctaWhitepaper: string;
}> = {
  zh: {
    builderEyebrow: "L0 · ENTERPRISE R&D FOUNDATION / 企业级研发基座",
    sleptonsEyebrow: "L1 · MATCHING ENGINE / 人力与资源撮合引擎",
    overviewKicker: "产品概述",
    highlightsKicker: "核心能力",
    builderCoreRelationKicker: "BUILDER CORE × SAILOR",
    builderCoreRelationTitle: "商业化产品与开源内核的一体两面",
    builderCoreRelationBody:
      "Builder Core 是面向企业交付的商业化产品形态,Sailor(Nebutra Sailor)则是其开源技术内核。两者是同一件事的两个身份:Sailor 开源保证技术可审计、社区可验证;Builder Core 在此之上补齐多租户、权限、计费、合规与 SLA 交付能力,形成可签约的企业级产出。采用 Builder Core 即同时获得 Sailor 开源生态的长期演进红利。",
    docsLabel: "查看 Builder Core 文档",
    githubLabel: "Sailor on GitHub",
    exploreLabel: "了解 Sleptons",
    launchpadKicker: "SUBMODULE · THE LAUNCHPAD",
    launchpadTitle: "The Launchpad 子模块:以业务信号驱动机会路由",
    launchpadBody:
      "The Launchpad 是 Sleptons 内嵌的机会与资源路由子模块。它以 MRR(月度经常性收入)、代码迭代密度、冷启动验证指标等客观业务数据为输入,对合作线索、算力配额与优先级资源做结构化分发。目标不是制造神话,而是让机会流转回到可度量、可验证、可审计的轨道上。",
    launchpadBullets: [
      { metric: "MRR · 月度经常性收入", note: "真实付费曲线作为优先输入" },
      { metric: "代码迭代密度", note: "提交频次 · PR 合并率 · 线上稳定性" },
      { metric: "冷启动验证", note: "早期留存 · 激活转化 · 客户访谈结构化结果" },
    ],
    whyTitle: "为什么是两款旗舰?",
    whySubtitle: "WHY TWO FLAGSHIPS",
    whyBody:
      "早期团队最容易失速的地方,往往不是写不出功能,而是平台层缺少统一基线,协作与机会流转又缺少稳定机制。Builder Core 负责工程底座,Sleptons 负责协作与匹配,两者并行运作。",
    whyBuilderHead: "Builder Core · 跨越研发工程鸿沟",
    whyBuilderTagline: "工程复杂性的工业化标准件",
    whyBuilderText:
      "将多租户隔离、权限体系、计费结算、合规审计,以及 AI Agent 结对编程与 Harness 工程(MCP/SKILL、A2A、Workflow Graphs、AI Gateway),沉淀为标准化微服务与可复用组件。企业级交付从「数月」压缩到「周级」,产出可验证、过程可审计。",
    whySleptonsHead: "Sleptons · 让协作与机会更可治理",
    whySleptonsTagline: "协作信号的路由层",
    whySleptonsText:
      "通过更结构化的协作信号、身份上下文与 The Launchpad 的运营分发能力,减少机会流转对模糊背书和线下关系的依赖。让协作、匹配与资源流转回到可追溯、可审计的轨道。",
    whyCloser:
      "两道鸿沟同时跨越,才是「创业智能化、轻量化、民主化」的工程实现路径。两款旗舰并非独立产品,而是同一套创业操作系统的两个正交维度。",
    pillarsKicker: "业务版图",
    pillarsTitle: "三大业务闭环",
    pillarsSubtitle: "从底座交付到联合孵化,再到深度定制 — 覆盖商业增长的全链路",
    ctaKicker: "NEXT STEP",
    ctaTitle: "准备好深入了解?",
    ctaSubtitle:
      "查看 Builder Core 的架构蓝图、API 文档与部署指南,或探索 Sleptons 的协作协议与 The Launchpad 的信号路由规则。完整的技术与制度说明,可阅读白皮书。",
    ctaDocs: "查看 Builder Core / Sailor 文档",
    ctaSleptons: "了解 Sleptons",
    ctaWhitepaper: "阅读白皮书",
  },
  en: {
    builderEyebrow: "L0 · ENTERPRISE R&D FOUNDATION",
    sleptonsEyebrow: "L1 · MATCHING ENGINE",
    overviewKicker: "Overview",
    highlightsKicker: "Core Capabilities",
    builderCoreRelationKicker: "BUILDER CORE × SAILOR",
    builderCoreRelationTitle:
      "Two faces of the same thing — commercial product and open-source core",
    builderCoreRelationBody:
      "Builder Core is the commercial product shape shipped to enterprises. Sailor (Nebutra Sailor) is its open-source technical core. They are two identities of the same engineering effort: Sailor's open-source form keeps the technical base auditable and community-verifiable; Builder Core layers on multi-tenancy, permissions, billing, compliance, and SLA-backed delivery to form a contractable enterprise deliverable. Adopting Builder Core means inheriting the long-term compounding of the Sailor open-source ecosystem.",
    docsLabel: "View Builder Core Docs",
    githubLabel: "Sailor on GitHub",
    exploreLabel: "Explore Sleptons",
    launchpadKicker: "SUBMODULE · THE LAUNCHPAD",
    launchpadTitle: "The Launchpad: routing opportunities through operating signals",
    launchpadBody:
      "The Launchpad is the opportunity- and resource-routing submodule embedded in Sleptons. It uses objective operating signals — MRR, code iteration density, and cold-start validation metrics — to prioritize partnership opportunities, compute quotas, and other constrained resources. The goal is not mythology; it is measurable, verifiable allocation.",
    launchpadBullets: [
      { metric: "MRR · Monthly Recurring Revenue", note: "Real payment curves as primary input" },
      {
        metric: "Code Iteration Density",
        note: "Commit cadence · PR merge rate · production stability",
      },
      {
        metric: "Cold-start Validation",
        note: "Early retention · activation funnel · structured customer interviews",
      },
    ],
    whyTitle: "Why Two Flagships?",
    whySubtitle: "WHY TWO FLAGSHIPS",
    whyBody:
      "Early-stage teams rarely slow down because they cannot write features. They slow down because they lack a governed baseline for delivery and a durable mechanism for coordination. Builder Core handles the engineering layer; Sleptons handles the coordination layer.",
    whyBuilderHead: "Builder Core — Crossing the engineering chasm",
    whyBuilderTagline: "Industrialized standard parts for engineering complexity",
    whyBuilderText:
      "Multi-tenant isolation, permission systems, billing, compliance auditing, plus AI-agent pair programming and Harness engineering (MCP/Skill, A2A, Workflow Graphs, AI Gateway) — all crystallized into standardized microservices and reusable components. Enterprise delivery compresses from months to weeks; output is verifiable, process is auditable.",
    whySleptonsHead: "Sleptons — Governing coordination and opportunity flow",
    whySleptonsTagline: "A routing layer for collaboration signals",
    whySleptonsText:
      "Use stronger collaboration signals, contextual identity, and The Launchpad's operator-facing routing to reduce dependence on vague prestige proxies and opaque handoffs. Coordination, matching, and resource flow return to a traceable, auditable track.",
    whyCloser:
      "Crossing both chasms in parallel is the engineering path toward entrepreneurship that is intelligent, lightweight, and democratic. The two flagships are not separate products — they are two orthogonal dimensions of a single founder operating system.",
    pillarsKicker: "Portfolio",
    pillarsTitle: "Three Business Pillars",
    pillarsSubtitle:
      "From foundation delivery to co-incubation to deep customization — covering the full commercial growth chain.",
    ctaKicker: "NEXT STEP",
    ctaTitle: "Ready to explore?",
    ctaSubtitle:
      "Review the Builder Core architecture blueprint, API reference, and deployment guide — or explore Sleptons' coordination model and the Launchpad's signal-routing rules. For the full technical and institutional account, read the whitepaper.",
    ctaDocs: "View Builder Core / Sailor Docs",
    ctaSleptons: "Explore Sleptons",
    ctaWhitepaper: "Read Whitepaper",
  },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const builderCore = pick(lang, PRODUCT_BUILDER_CORE);
  const sleptons = pick(lang, PRODUCT_SLEPTONS);
  const hero = pick(lang, HERO);
  const labels = pick(lang, LABELS);

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* ─── 1. Hero — Dual Flagship ───────────────────────────────────── */}
      <section className="relative pt-32 md:pt-48 pb-20 md:pb-28 overflow-hidden">
        <AuroraBackground variant="subtle" position="top" intensity={0.5} />
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp">
            <span className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-muted-foreground mb-8 block">
              {hero.eyebrow}
            </span>
          </AnimateIn>

          <AnimateIn preset="emerge">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-10 text-foreground max-w-4xl"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {hero.heading}
            </h1>
          </AnimateIn>

          <AnimateIn preset="fade">
            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-16 md:mb-20">
              {hero.sublead}
            </p>
          </AnimateIn>

          {/* Dual product split preview */}
          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"
          >
            <AnimateIn preset="fadeUp">
              <article
                className="group relative h-full rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-muted/20 p-10 md:p-12 hover:border-border hover:bg-muted/40 hover:-translate-y-px transition-transform duration-150 overflow-hidden"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <Layers className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                    {hero.builderLabel}
                  </span>
                </div>
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6"
                  style={{
                    letterSpacing: "var(--tracking-heading)",
                    lineHeight: "var(--leading-heading)",
                  }}
                >
                  {builderCore.name}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {hero.builderCaption}
                </p>
                <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-foreground" />
                </div>
              </article>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <article
                className="group relative h-full rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-muted/20 p-10 md:p-12 hover:border-border hover:bg-muted/40 hover:-translate-y-px transition-transform duration-150 overflow-hidden"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <Network className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                    {hero.sleptonsLabel}
                  </span>
                </div>
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6"
                  style={{
                    letterSpacing: "var(--tracking-heading)",
                    lineHeight: "var(--leading-heading)",
                  }}
                >
                  {sleptons.name}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {hero.sleptonsCaption}
                </p>
                <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-foreground" />
                </div>
              </article>
            </AnimateIn>
          </AnimateInGroup>
        </div>
      </section>

      {/* ─── 2. Builder Core Deep Dive ─────────────────────────────────── */}
      <section id="builder-core" className="py-24 md:py-32 border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-16 md:mb-20 max-w-4xl">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
                {labels.builderEyebrow}
              </span>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-8 text-foreground"
                style={{
                  letterSpacing: "var(--tracking-display)",
                  lineHeight: "var(--leading-display)",
                }}
              >
                {builderCore.name}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-xl md:text-3xl text-foreground/90 font-medium leading-relaxed text-balance max-w-3xl">
                {builderCore.tagline}
              </p>
            </AnimateIn>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Description */}
            <div className="lg:col-span-5">
              <AnimateIn preset="fadeUp">
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-5 block">
                  {labels.overviewKicker}
                </span>
              </AnimateIn>
              <AnimateIn preset="fade">
                <p className="max-w-3xl text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
                  {builderCore.description}
                </p>
              </AnimateIn>
              <AnimateIn preset="fadeUp">
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="ink" size="lg">
                    <Link href="#">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {labels.docsLabel}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="#">
                      <Github className="mr-2 h-4 w-4" />
                      {labels.githubLabel}
                    </Link>
                  </Button>
                </div>
              </AnimateIn>
            </div>

            {/* Highlights 2x2 */}
            <div className="lg:col-span-7">
              <AnimateIn preset="fadeUp">
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-5 block">
                  {labels.highlightsKicker}
                </span>
              </AnimateIn>
              <AnimateInGroup
                stagger="normal"
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
              >
                {builderCore.highlights.map((highlight, index) => (
                  <AnimateIn key={highlight.title} preset="fadeUp">
                    <article
                      className="group h-full rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background p-6 md:p-7 hover:border-border hover:-translate-y-px transition-transform duration-150"
                      style={{ boxShadow: "var(--ring-hairline)" }}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                          S{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 ml-4 bg-border/70" />
                      </div>
                      <h3
                        className="text-lg md:text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors"
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {highlight.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {highlight.desc}
                      </p>
                    </article>
                  </AnimateIn>
                ))}
              </AnimateInGroup>
            </div>
          </div>

          {/* Builder Core × Sailor relationship — one-face-of-two-identities block */}
          <AnimateIn preset="fadeUp">
            <div
              className="mt-16 md:mt-20 rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background p-8 md:p-12"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-4">
                  <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                    {labels.builderCoreRelationKicker}
                  </span>
                  <h3
                    className="text-2xl md:text-3xl font-semibold text-foreground leading-tight"
                    style={{ letterSpacing: "var(--tracking-heading)" }}
                  >
                    {labels.builderCoreRelationTitle}
                  </h3>
                </div>
                <div className="lg:col-span-8">
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
                    {labels.builderCoreRelationBody}
                  </p>
                  <Link href="#">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      <Github className="h-4 w-4" />
                      {labels.githubLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ─── 3. Sleptons Deep Dive + Launchpad submodule ───────────────── */}
      <section id="sleptons" className="py-24 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-16 md:mb-20 max-w-4xl">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
                {labels.sleptonsEyebrow}
              </span>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-8 text-foreground"
                style={{
                  letterSpacing: "var(--tracking-display)",
                  lineHeight: "var(--leading-display)",
                }}
              >
                {sleptons.name}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-xl md:text-3xl text-foreground/90 font-medium leading-relaxed text-balance max-w-3xl">
                {sleptons.tagline}
              </p>
            </AnimateIn>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Highlights 2x2 — left on desktop for layout alternation */}
            <div className="lg:col-span-7 lg:order-1">
              <AnimateIn preset="fadeUp">
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-5 block">
                  {labels.highlightsKicker}
                </span>
              </AnimateIn>
              <AnimateInGroup
                stagger="normal"
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
              >
                {sleptons.highlights.map((highlight, index) => (
                  <AnimateIn key={highlight.title} preset="fadeUp">
                    <article
                      className="group h-full rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-muted/20 p-6 md:p-7 hover:border-border hover:bg-muted/40 hover:-translate-y-px transition-transform duration-150"
                      style={{ boxShadow: "var(--ring-hairline)" }}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                          L{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 ml-4 bg-border/70" />
                      </div>
                      <h3
                        className="text-lg md:text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors"
                        style={{ letterSpacing: "var(--tracking-tight)" }}
                      >
                        {highlight.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {highlight.desc}
                      </p>
                    </article>
                  </AnimateIn>
                ))}
              </AnimateInGroup>
            </div>

            {/* Description — right on desktop */}
            <div className="lg:col-span-5 lg:order-2">
              <AnimateIn preset="fadeUp">
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground mb-5 block">
                  {labels.overviewKicker}
                </span>
              </AnimateIn>
              <AnimateIn preset="fade">
                <p className="max-w-3xl text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
                  {sleptons.description}
                </p>
              </AnimateIn>
              <AnimateIn preset="fadeUp">
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="ink" size="lg">
                    <Link href="#">
                      <Users className="mr-2 h-4 w-4" />
                      {labels.exploreLabel}
                    </Link>
                  </Button>
                </div>
              </AnimateIn>
            </div>
          </div>

          {/* The Launchpad submodule — explicit expansion */}
          <AnimateIn preset="fadeUp">
            <div
              className="mt-16 md:mt-20 rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-muted/20 p-8 md:p-12"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-5">
                  <div className="flex items-center gap-3 mb-5">
                    <Rocket className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                    <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                      {labels.launchpadKicker}
                    </span>
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-semibold text-foreground leading-tight mb-5"
                    style={{ letterSpacing: "var(--tracking-heading)" }}
                  >
                    {labels.launchpadTitle}
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {labels.launchpadBody}
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <AnimateInGroup stagger="normal" className="grid grid-cols-1 gap-3 md:gap-4">
                    {labels.launchpadBullets.map((bullet, index) => (
                      <AnimateIn key={bullet.metric} preset="fadeUp">
                        <article
                          className="flex items-start gap-5 rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background p-5 md:p-6 hover:border-border hover:-translate-y-px transition-transform duration-150"
                          style={{ boxShadow: "var(--ring-hairline)" }}
                        >
                          <span className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">
                            LP-{String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1">
                            <h4
                              className="text-base md:text-lg font-semibold text-foreground mb-1.5"
                              style={{ letterSpacing: "var(--tracking-tight)" }}
                            >
                              {bullet.metric}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {bullet.note}
                            </p>
                          </div>
                        </article>
                      </AnimateIn>
                    ))}
                  </AnimateInGroup>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ─── 4. Why Two Flagships? ──────────────────────────────────────── */}
      <section className="py-24 md:py-32 border-t border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-16 md:mb-20 max-w-4xl">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground mb-6 block">
                {labels.whySubtitle}
              </span>
            </AnimateIn>
            <AnimateIn preset="emerge">
              <h2
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-10 text-foreground"
                style={{
                  letterSpacing: "var(--tracking-display)",
                  lineHeight: "var(--leading-display)",
                }}
              >
                {labels.whyTitle}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
                {labels.whyBody}
              </p>
            </AnimateIn>
          </div>

          {/* Dual-column comparison */}
          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12"
          >
            <AnimateIn preset="fadeUp">
              <article
                className="group h-full rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background p-10 md:p-12 hover:border-border hover:-translate-y-px transition-transform duration-150"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Layers className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                    BUILDER CORE / L0
                  </span>
                </div>
                <h3
                  className="text-2xl md:text-3xl font-semibold mb-3 text-foreground"
                  style={{ letterSpacing: "var(--tracking-heading)" }}
                >
                  {labels.whyBuilderHead}
                </h3>
                <p className="text-sm md:text-base font-mono tracking-tight text-primary mb-5">
                  {labels.whyBuilderTagline}
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {labels.whyBuilderText}
                </p>
              </article>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <article
                className="group h-full rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-background p-10 md:p-12 hover:border-border hover:-translate-y-px transition-transform duration-150"
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Network className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                    SLEPTONS / L1
                  </span>
                </div>
                <h3
                  className="text-2xl md:text-3xl font-semibold mb-3 text-foreground"
                  style={{ letterSpacing: "var(--tracking-heading)" }}
                >
                  {labels.whySleptonsHead}
                </h3>
                <p className="text-sm md:text-base font-mono tracking-tight text-primary mb-5">
                  {labels.whySleptonsTagline}
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {labels.whySleptonsText}
                </p>
              </article>
            </AnimateIn>
          </AnimateInGroup>

          <AnimateIn preset="fade">
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed border-l-2 border-foreground pl-6 max-w-4xl">
              {labels.whyCloser}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* ─── 5. Three Business Pillars ──────────────────────────────────── */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-16 md:mb-20 max-w-3xl">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                {labels.pillarsKicker}
              </span>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-foreground"
                style={{
                  letterSpacing: "var(--tracking-heading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {labels.pillarsTitle}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {labels.pillarsSubtitle}
              </p>
            </AnimateIn>
          </div>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {PILLARS.map((pillar) => {
              const content = pick(lang, pillar);
              return (
                <AnimateIn key={content.number} preset="fadeUp">
                  <article
                    className="group h-full flex flex-col rounded-[var(--radius-card)] border border-[var(--neutral-6)] bg-muted/20 p-8 md:p-10 hover:border-border hover:bg-muted/40 hover:-translate-y-px transition-transform duration-150"
                    style={{ boxShadow: "var(--ring-hairline)" }}
                  >
                    <span
                      className="text-2xl md:text-3xl font-semibold text-foreground/30 mb-6 leading-none select-none group-hover:text-foreground/50 transition-colors"
                      style={{ letterSpacing: "var(--tracking-tight)" }}
                      aria-hidden="true"
                    >
                      {content.number}
                    </span>
                    <h3
                      className="text-2xl md:text-3xl font-semibold mb-5 text-foreground"
                      style={{ letterSpacing: "var(--tracking-heading)" }}
                    >
                      {content.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {content.description}
                    </p>
                  </article>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </section>

      {/* ─── 6. Closing CTA ─────────────────────────────────────────────── */}
      <section className="relative py-32 md:py-48 border-t border-border/50 bg-background overflow-hidden">
        <AuroraBackground variant="vivid" position="center" intensity={0.4} />
        <div className="container mx-auto px-4 max-w-4xl text-center relative">
          <AnimateIn preset="fadeUp">
            <div className="inline-block mb-8 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-primary">
                {labels.ctaKicker}
              </span>
            </div>
          </AnimateIn>
          <AnimateIn preset="emerge">
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance mb-8 text-foreground"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {labels.ctaTitle}
            </h2>
          </AnimateIn>
          <AnimateIn preset="fade">
            <p className="text-lg md:text-xl text-muted-foreground mb-12 text-balance max-w-2xl mx-auto leading-relaxed">
              {labels.ctaSubtitle}
            </p>
          </AnimateIn>
          <AnimateIn preset="fadeUp">
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild variant="ink" size="lg">
                <Link href="#">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {labels.ctaDocs}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#">
                  {labels.ctaSleptons}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/about/whitepaper">
                  <FileText className="mr-2 h-4 w-4" />
                  {labels.ctaWhitepaper}
                </Link>
              </Button>
            </div>
          </AnimateIn>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
