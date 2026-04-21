import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
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
    title: "双旗舰产品 — Builder Core × Sleptons | 云毓智能",
    description:
      "云毓战略由两款旗舰构成:Builder Core(以开源 Sailor 为技术内核)解决企业级研发工程鸿沟,Sleptons(含 The Launchpad 子模块)解决人力与资源撮合鸿沟。两者共同覆盖从 0 到 1 创业的完整链路,可验证、可审计、可交付。",
  },
  en: {
    title: "Flagship Products — Builder Core × Sleptons | Nebutra",
    description:
      "Nebutra's strategy rests on two flagships. Builder Core — powered by the open-source Sailor core — bridges the enterprise R&D engineering chasm. Sleptons — with its Launchpad submodule — bridges the talent and resource matching chasm. Verifiable, auditable, deliverable end-to-end coverage of the 0-to-1 founder journey.",
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
    heading: "两个答案,一个愿景",
    sublead:
      "Builder Core 是企业级研发基座,以开源项目 Sailor 为技术内核,跨越研发工程鸿沟;Sleptons 是人力与资源撮合引擎,以工作量证明与动态权益为基座,其子模块 The Launchpad 进一步跨越信任与资源错配的鸿沟。两款旗舰覆盖的正是「从 0 到 1 创业」完整链路中最难自动化的两段——可验证、可审计、可交付。",
    builderLabel: "L0 · ENTERPRISE R&D FOUNDATION",
    sleptonsLabel: "L1 · MATCHING ENGINE",
    builderCaption: "企业级研发基座 · 含开源 Sailor 技术内核 · 跨越研发工程鸿沟",
    sleptonsCaption: "人力与资源撮合引擎 · 含 The Launchpad 子模块 · 跨越信任与资源鸿沟",
  },
  en: {
    eyebrow: "FLAGSHIP PRODUCTS",
    heading: "Two Answers, One Vision",
    sublead:
      "Builder Core is the enterprise R&D foundation, powered by the open-source Sailor core — it bridges the engineering chasm. Sleptons is the talent and resource matching engine, grounded in Proof-of-Contribution and dynamic equity — its Launchpad submodule further closes the trust and resource-misallocation gap. Together, the two flagships cover the two hardest-to-automate segments of the 0-to-1 founder journey: verifiable, auditable, deliverable.",
    builderLabel: "L0 · ENTERPRISE R&D FOUNDATION",
    sleptonsLabel: "L1 · MATCHING ENGINE",
    builderCaption:
      "Enterprise R&D foundation · Open-source Sailor at its core · Crossing the engineering chasm",
    sleptonsCaption:
      "Talent & resource matching engine · Includes The Launchpad submodule · Crossing the trust & resource chasm",
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
    launchpadTitle: "The Launchpad 子模块:以业务数据替代 PPT 融资",
    launchpadBody:
      "The Launchpad 是 Sleptons 内嵌的资源与资本路由子模块。它以 MRR(月度经常性收入)、代码迭代密度、冷启动验证指标三项客观业务数据为输入,对算法资本、算力配额、合作资源进行自动化倾斜。其目的不是「颠覆投资」,而是在可度量的范围内消除传统创投流程中「PPT 融资」带来的冗余损耗,让资源分配回到可验证、可审计的轨道上。",
    launchpadBullets: [
      { metric: "MRR · 月度经常性收入", note: "真实付费曲线作为优先输入" },
      { metric: "代码迭代密度", note: "提交频次 · PR 合并率 · 线上稳定性" },
      { metric: "冷启动验证", note: "早期留存 · 激活转化 · 客户访谈结构化结果" },
    ],
    whyTitle: "为什么是两款旗舰?",
    whySubtitle: "WHY TWO FLAGSHIPS",
    whyBody:
      "早期团队最容易倒下的位置,一直不在「写不出代码」这一侧。我们识别到两道结构性鸿沟:第一,研发工程鸿沟——多租户、权限、计费、合规与 AI Agent 结对编程等工程量,使企业级交付常以月计;第二,信任与资源鸿沟——陌生人之间贡献无法量化、权益无法公平分配、资本分配高度依赖主观背书。Builder Core 与 Sleptons 各解一题,并行运作。",
    whyBuilderHead: "Builder Core · 跨越研发工程鸿沟",
    whyBuilderTagline: "工程复杂性的工业化标准件",
    whyBuilderText:
      "将多租户隔离、权限体系、计费结算、合规审计,以及 AI Agent 结对编程与 Harness 工程(MCP/SKILL、A2A、Workflow Graphs、AI Gateway),沉淀为标准化微服务与可复用组件。企业级交付从「数月」压缩到「周级」,产出可验证、过程可审计。",
    whySleptonsHead: "Sleptons · 跨越信任与资源鸿沟",
    whySleptonsTagline: "资源错配的路由引擎",
    whySleptonsText:
      "以工作量证明(Proof-of-Contribution)、动态权益合约(Slicing Pie)、去中心化身份(DID),以及子模块 The Launchpad 的算法资本,取代「大厂背书」「名校标签」「PPT 融资」等传统信任机制。让陌生人协作与资源流转从主观撮合回到可追溯、可审计的轨道。",
    whyCloser:
      "两道鸿沟同时跨越,才是「创业智能化、轻量化、民主化」的工程实现路径。两款旗舰并非独立产品,而是同一套创业操作系统的两个正交维度。",
    pillarsKicker: "业务版图",
    pillarsTitle: "三大业务闭环",
    pillarsSubtitle: "从底座交付到联合孵化,再到深度定制 — 覆盖商业增长的全链路",
    ctaKicker: "NEXT STEP",
    ctaTitle: "准备好深入了解?",
    ctaSubtitle:
      "查看 Builder Core 的架构蓝图、API 文档与部署指南,或探索 Sleptons 的撮合协议与 The Launchpad 的资本路由规则。完整的技术与制度说明,可阅读白皮书。",
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
    launchpadTitle: "The Launchpad: business data over pitch decks",
    launchpadBody:
      'The Launchpad is the resource- and capital-routing submodule embedded in Sleptons. It takes three objective business signals — MRR (monthly recurring revenue), code iteration density, and cold-start validation metrics — and routes algorithmic capital, compute quotas, and partnership resources accordingly. The goal is not to "disrupt venture capital" but to remove, within a measurable scope, the overhead that pitch-deck fundraising imposes, so that resource allocation stays on a verifiable, auditable track.',
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
      'Early-stage teams rarely collapse because they cannot "write code." We identify two structural chasms instead. First, the engineering chasm: multi-tenancy, permissions, billing, compliance, and AI-agent pair programming turn enterprise-grade delivery into month-scale work. Second, the trust and resource chasm: contribution cannot be quantified between strangers, equity cannot be split fairly, and capital allocation leans heavily on subjective endorsement. Builder Core and Sleptons each address one — running in parallel.',
    whyBuilderHead: "Builder Core — Crossing the engineering chasm",
    whyBuilderTagline: "Industrialized standard parts for engineering complexity",
    whyBuilderText:
      "Multi-tenant isolation, permission systems, billing, compliance auditing, plus AI-agent pair programming and Harness engineering (MCP/Skill, A2A, Workflow Graphs, AI Gateway) — all crystallized into standardized microservices and reusable components. Enterprise delivery compresses from months to weeks; output is verifiable, process is auditable.",
    whySleptonsHead: "Sleptons — Crossing the trust & resource chasm",
    whySleptonsTagline: "A routing engine for resource misallocation",
    whySleptonsText:
      "Replace the traditional trust proxies — big-company pedigree, elite-school labels, pitch-deck fundraising — with Proof-of-Contribution, Slicing Pie dynamic equity contracts, Decentralized Identity (DID), and algorithmic capital via the Launchpad submodule. Stranger collaboration and resource flow return to a traceable, auditable track.",
    whyCloser:
      "Crossing both chasms in parallel is the engineering path toward entrepreneurship that is intelligent, lightweight, and democratic. The two flagships are not separate products — they are two orthogonal dimensions of a single founder operating system.",
    pillarsKicker: "Portfolio",
    pillarsTitle: "Three Business Pillars",
    pillarsSubtitle:
      "From foundation delivery to co-incubation to deep customization — covering the full commercial growth chain.",
    ctaKicker: "NEXT STEP",
    ctaTitle: "Ready to explore?",
    ctaSubtitle:
      "Review the Builder Core architecture blueprint, API reference, and deployment guide — or explore Sleptons' matching protocols and the Launchpad's capital routing rules. For the full technical and institutional account, read the whitepaper.",
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
      <section className="pt-32 md:pt-48 pb-20 md:pb-28 overflow-hidden">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp">
            <span className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-muted-foreground mb-8 block">
              {hero.eyebrow}
            </span>
          </AnimateIn>

          <AnimateIn preset="emerge">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-10 text-foreground max-w-5xl">
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
              <article className="group relative h-full rounded-3xl border border-border/60 bg-muted/20 p-10 md:p-12 transition-all duration-500 hover:border-border hover:bg-muted/40 hover:shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                  <Layers className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                    {hero.builderLabel}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground mb-6 leading-[1.05]">
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
              <article className="group relative h-full rounded-3xl border border-border/60 bg-muted/20 p-10 md:p-12 transition-all duration-500 hover:border-border hover:bg-muted/40 hover:shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                  <Network className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
                    {hero.sleptonsLabel}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground mb-6 leading-[1.05]">
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
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-8 text-foreground leading-[1.02]">
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
                  <Link href="#">
                    <Button
                      size="lg"
                      className="rounded-full px-6 h-11 font-semibold bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {labels.docsLabel}
                    </Button>
                  </Link>
                  <Link href="#">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full px-6 h-11 font-semibold border-border hover:bg-muted/60 transition-colors"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      {labels.githubLabel}
                    </Button>
                  </Link>
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
                    <article className="group h-full rounded-2xl border border-border/60 bg-background p-6 md:p-7 transition-all duration-500 hover:border-border hover:shadow-lg">
                      <div className="mb-5 flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                          S{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 ml-4 bg-border/70" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight mb-3 text-foreground group-hover:text-primary transition-colors">
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
            <div className="mt-16 md:mt-20 rounded-3xl border border-border/60 bg-background p-8 md:p-12">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-4">
                  <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground mb-4 block">
                    {labels.builderCoreRelationKicker}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
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
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-8 text-foreground leading-[1.02]">
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
                    <article className="group h-full rounded-2xl border border-border/60 bg-muted/20 p-6 md:p-7 transition-all duration-500 hover:border-border hover:bg-muted/40 hover:shadow-lg">
                      <div className="mb-5 flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                          L{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 ml-4 bg-border/70" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight mb-3 text-foreground group-hover:text-primary transition-colors">
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
                  <Link href="#">
                    <Button
                      size="lg"
                      className="rounded-full px-6 h-11 font-semibold bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {labels.exploreLabel}
                    </Button>
                  </Link>
                </div>
              </AnimateIn>
            </div>
          </div>

          {/* The Launchpad submodule — explicit expansion */}
          <AnimateIn preset="fadeUp">
            <div className="mt-16 md:mt-20 rounded-3xl border border-border/60 bg-muted/20 p-8 md:p-12">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="lg:col-span-5">
                  <div className="flex items-center gap-3 mb-5">
                    <Rocket className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                    <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                      {labels.launchpadKicker}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-5">
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
                        <article className="flex items-start gap-5 rounded-2xl border border-border/60 bg-background p-5 md:p-6 transition-all duration-500 hover:border-border hover:shadow-md">
                          <span className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">
                            LP-{String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1">
                            <h4 className="text-base md:text-lg font-bold tracking-tight text-foreground mb-1.5">
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
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-balance mb-10 text-foreground">
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
              <article className="group h-full rounded-3xl border border-border/60 bg-background p-10 md:p-12 transition-all duration-500 hover:border-border hover:shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Layers className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                    BUILDER CORE / L0
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">
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
              <article className="group h-full rounded-3xl border border-border/60 bg-background p-10 md:p-12 transition-all duration-500 hover:border-border hover:shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Network className="h-5 w-5 text-foreground" strokeWidth={1.5} aria-hidden />
                  <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">
                    SLEPTONS / L1
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">
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
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-foreground">
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
                  <article className="group h-full flex flex-col rounded-3xl border border-border/60 bg-muted/20 p-8 md:p-10 transition-all duration-500 hover:border-border hover:bg-muted/40 hover:shadow-2xl">
                    <span
                      className="font-black text-7xl md:text-8xl tracking-tighter text-foreground/10 mb-6 leading-none select-none group-hover:text-foreground/20 transition-colors"
                      aria-hidden="true"
                    >
                      {content.number}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-5 text-foreground">
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
      <section className="py-32 md:py-48 border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <AnimateIn preset="fadeUp">
            <div className="inline-block mb-8 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs md:text-sm font-mono tracking-[0.25em] uppercase text-primary">
                {labels.ctaKicker}
              </span>
            </div>
          </AnimateIn>
          <AnimateIn preset="emerge">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-balance mb-8 text-foreground">
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
              <Link href="#">
                <Button
                  size="lg"
                  className="rounded-full h-14 px-10 text-base font-bold shadow-xl bg-foreground text-background hover:scale-105 transition-transform"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {labels.ctaDocs}
                </Button>
              </Link>
              <Link href="#">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full h-14 px-10 text-base font-bold border-border hover:bg-muted/60 transition-colors"
                >
                  {labels.ctaSleptons}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about/whitepaper">
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full h-14 px-10 text-base font-bold hover:bg-muted/60 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {labels.ctaWhitepaper}
                </Button>
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
