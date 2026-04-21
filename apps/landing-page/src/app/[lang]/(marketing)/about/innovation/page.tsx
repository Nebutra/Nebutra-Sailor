import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import {
  ArrowRight,
  type Code,
  Cpu,
  GitBranch,
  Layers,
  Network,
  Route,
  Shield,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";

import {
  type Bilingual,
  HARNESS_TIMELINE,
  INNOVATION_PILLARS,
  ORGANIZATION_PRINCIPLES,
  pick,
} from "../_about-data";

// ─── Metadata (bilingual) ─────────────────────────────────────────────────────

const META: Bilingual<{ title: string; description: string }> = {
  zh: {
    title: "研发与创新 — 云毓智能",
    description:
      "工程品味即护城河。云毓极客驱动，对标硅谷最佳实践：AI 原生架构（Harness 工程）、开源基础设施、工程卓越。",
  },
  en: {
    title: "R&D & Innovation — Nebutra",
    description:
      "Engineering taste is our moat. Geek-driven Nebutra, benchmarked against Silicon Valley: AI-native architecture (Harness engineering), open-source infrastructure, engineering excellence.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const meta = pick(lang, META);
  return { title: meta.title, description: meta.description };
}

// ─── Copy Deck (bilingual, heavy extension of INNOVATION_PILLARS) ────────────

const HERO_COPY: Bilingual<{
  eyebrow: string;
  heading: string;
  manifesto: string;
  battlefield: string;
}> = {
  zh: {
    eyebrow: "R&D / 研发与创新",
    heading: "工程品味即护城河",
    manifesto:
      "我们是一支极客驱动的小型团队。在 AI 加速度时代，工具几乎被所有人平等拥有，真正的稀缺资源是品味 — 对架构的审美、对细节的偏执、对长期主义的坚持。云毓对标硅谷一线研发组织，从第一行代码就写给 AI 时代：类型安全、可观测、Edge-first、多租户、开源。这不是口号，这是我们每天的工作纪律。",
    battlefield:
      "在 AI stack 三层演化中，我们选择 Harness 层作战 — MCP/SKILL、工具生态、Agent 编排、A2A 协同。这里是 2025–2026 年工程化的真正前线。",
  },
  en: {
    eyebrow: "R&D / Innovation",
    heading: "Engineering Taste as Moat",
    manifesto:
      "We are a small, geek-driven team. In an era when AI makes tools universally available, the only remaining scarcity is taste — aesthetic judgment about architecture, obsession over detail, commitment to the long game. Nebutra benchmarks against top Silicon Valley R&D orgs: type-safe, observable, Edge-first, multi-tenant, open-source from line one. Not a slogan — this is our daily engineering discipline.",
    battlefield:
      "Across the three-layer evolution of the AI stack, our battlefield is the Harness layer — MCP/Skill, tool ecosystems, agent orchestration, A2A. This is where real engineering lives in 2025–2026.",
  },
};

// Harness Timeline — section copy
const HARNESS_COPY: Bilingual<{
  eyebrow: string;
  heading: string;
  intro: string;
  outro: string;
  battlefieldTag: string;
  currentTag: string;
}> = {
  zh: {
    eyebrow: "AI Stack 三层演化",
    heading: "从权重，到上下文，到 Harness",
    intro:
      "大模型的创新面每两年就会向外扩展一层。2022 年在权重（Weights）层卷 scaling law；2023–2024 年在上下文（Context）层卷 RAG 与长窗口；2025–2026 年，真正的增量产出已经转移到 Harness 层 — 工具、协议、工作流图与 Agent 基础设施。",
    outro:
      "Nebutra Sailor 把 Harness 工程当作一等公民。我们不在权重层造模型，也不只在上下文层做 Prompt — 我们交付可工程化的 Harness：MCP/SKILL 驱动的智能体、A2A 协同协议、可观测的工作流图、安全可控的工具生态。这是 AI 原生 SaaS 的下一代架构坐标。",
    battlefieldTag: "← Nebutra 的战场",
    currentTag: "正在发生",
  },
  en: {
    eyebrow: "Three-Layer Evolution of the AI Stack",
    heading: "From Weights, to Context, to Harness",
    intro:
      "The innovation frontier of large models expands outward every two years. 2022 was scaling weights; 2023–2024 was RAG and long-context engineering; 2025–2026, the real marginal value has shifted to the Harness layer — tools, protocols, workflow graphs, and agent infrastructure.",
    outro:
      "Nebutra Sailor treats Harness engineering as a first-class concern. We don't train foundation models, and we don't just do prompting — we ship production-grade Harness: MCP/Skill-driven agents, A2A protocols, observable workflow graphs, and a secure tool ecosystem. This is the next architectural coordinate of AI-native SaaS.",
    battlefieldTag: "← Nebutra's battlefield",
    currentTag: "In progress",
  },
};

// Pillar 2A — AI-Native Architecture (Harness layer sub-items)
const AI_NATIVE_ITEMS: ReadonlyArray<
  Bilingual<{ name: string; desc: string }> & { icon: typeof Code }
> = [
  {
    icon: Workflow,
    zh: {
      name: "MCP/SKILL",
      desc: "Model Context Protocol + Skill 技能包一等公民。Sailor 内建 MCP server 适配层、SKILL 注册中心与沙箱运行时。",
    },
    en: {
      name: "MCP/Skill",
      desc: "Model Context Protocol + Skill packages as first-class citizens. Sailor ships an MCP server adapter, Skill registry, and sandboxed runtime.",
    },
  },
  {
    icon: Network,
    zh: {
      name: "A2A 协同",
      desc: "Agent-to-Agent 协议 — 任务分发、能力广告、跨租户隔离的消息通道。让智能体之间像微服务一样协作。",
    },
    en: {
      name: "A2A Collaboration",
      desc: "Agent-to-Agent protocol — task routing, capability advertisement, tenant-isolated message bus. Agents collaborate like microservices.",
    },
  },
  {
    icon: GitBranch,
    zh: {
      name: "Workflow Graphs",
      desc: "声明式工作流图谱 — 有状态节点、可重放、可观测。AI 行为不再是黑盒 prompt，而是可调试的 DAG。",
    },
    en: {
      name: "Workflow Graphs",
      desc: "Declarative workflow graphs — stateful nodes, replayable, observable. AI behavior is no longer a black-box prompt but a debuggable DAG.",
    },
  },
  {
    icon: Route,
    zh: {
      name: "AI Gateway",
      desc: "多模型路由 + 算力调度。OpenAI、Anthropic、本地开源模型统一接入，按任务类型、成本配额、SLA 动态切换。",
    },
    en: {
      name: "AI Gateway",
      desc: "Multi-model routing + compute scheduling. OpenAI, Anthropic, local OSS unified — dynamic switching by task, cost quota, and SLA.",
    },
  },
];

// Pillar 2B — Open Source supplement copy + stats
const OSS_SUPPLEMENT: Bilingual<string> = {
  zh: "为什么开源？因为我们相信：在加速度时代，闭源的专有优势在 6 个月内会被追平，而开源的复利会持续十年。开源让客户免于 vendor lock-in，让社区共同加固我们的基础设施，也让每一次 commit 接受全世界的审阅。这是我们最有信心的一场长期赌注。",
  en: "Why open-source? Because we believe: in an accelerated era, proprietary edge evaporates in 6 months, while open-source compounds over a decade. It frees customers from vendor lock-in, lets the community harden our infrastructure, and subjects every commit to worldwide review. This is our most confident long-term bet.",
};

const OSS_STATS: ReadonlyArray<Bilingual<{ value: string; label: string }>> = [
  {
    zh: { value: "1,500+", label: "GitHub Stars" },
    en: { value: "1,500+", label: "GitHub Stars" },
  },
  { zh: { value: "300+", label: "贡献者" }, en: { value: "300+", label: "Contributors" } },
  { zh: { value: "42", label: "核心包" }, en: { value: "42", label: "Core Packages" } },
  { zh: { value: "MIT", label: "许可证" }, en: { value: "MIT", label: "License" } },
];

// Pillar 2C — Engineering principles
const ENGINEERING_PRINCIPLES: ReadonlyArray<
  Bilingual<{ name: string; desc: string }> & { icon: typeof Code }
> = [
  {
    icon: Terminal,
    zh: { name: "TDD 优先", desc: "测试先行，红→绿→重构。每个 PR 必须伴随 80%+ 覆盖率。" },
    en: {
      name: "Test-Driven",
      desc: "Tests first. Red → Green → Refactor. 80%+ coverage required on every PR.",
    },
  },
  {
    icon: Zap,
    zh: {
      name: "PPR 部分预渲染",
      desc: "Next.js 16 Cache Components — 静态壳 + 流式动态，首屏即生产级。",
    },
    en: {
      name: "Partial Pre-Rendering",
      desc: "Next.js 16 Cache Components — static shell + streamed dynamics.",
    },
  },
  {
    icon: Cpu,
    zh: { name: "Edge-First", desc: "默认部署到全球 Edge 节点，CDN/数据/计算紧贴用户。" },
    en: {
      name: "Edge-First",
      desc: "Deploy to global Edge nodes by default — CDN, data, and compute near users.",
    },
  },
  {
    icon: Layers,
    zh: { name: "类型安全", desc: "TypeScript strict + Zod runtime — 编译期与运行期双重契约。" },
    en: {
      name: "Type Safety",
      desc: "TypeScript strict + Zod runtime — contracts at both compile and runtime.",
    },
  },
  {
    icon: Sparkles,
    zh: {
      name: "可观测性内建",
      desc: "OpenTelemetry、结构化日志、错误追踪 — 从第一天就绑定,不做「以后补」。",
    },
    en: {
      name: "Built-in Observability",
      desc: 'OpenTelemetry, structured logs, error tracking — wired from day one, never "later".',
    },
  },
  {
    icon: GitBranch,
    zh: {
      name: "单一 Monorepo 架构",
      desc: "pnpm workspaces + Turborepo — 跨应用共享品味,避免分叉腐化。",
    },
    en: {
      name: "Single Monorepo",
      desc: "pnpm workspaces + Turborepo — share taste across apps, avoid divergent rot.",
    },
  },
  {
    icon: Shield,
    zh: {
      name: "代码评审文化",
      desc: "所有代码双人审阅,Claude + 人类双重把关,架构决策留下 ADR 记录。",
    },
    en: {
      name: "Review Culture",
      desc: "All code dual-reviewed by Claude + human, architecture decisions recorded as ADRs.",
    },
  },
];

// Innovation Timeline
const MILESTONES: ReadonlyArray<Bilingual<{ date: string; title: string; desc: string }>> = [
  {
    zh: {
      date: "2025 Q3",
      title: "项目启动",
      desc: "云毓智能成立,Sailor 架构蓝图敲定 — Harness 工程作为核心技术路线。",
    },
    en: {
      date: "2025 Q3",
      title: "Project Inception",
      desc: "Nebutra founded. Sailor architecture blueprint locked — Harness engineering as the core roadmap.",
    },
  },
  {
    zh: {
      date: "2025 Q4",
      title: "Sailor 开源首发",
      desc: "核心 42 个 package 以 MIT 许可证开源。",
    },
    en: {
      date: "2025 Q4",
      title: "Sailor Open-Source Launch",
      desc: "42 core packages open-sourced under MIT.",
    },
  },
  {
    zh: {
      date: "2026 Q1",
      title: "Harness 深度集成",
      desc: "MCP/SKILL、A2A、工作流图谱一等公民就位,与客户系统原生互通。",
    },
    en: {
      date: "2026 Q1",
      title: "Harness Deep Integration",
      desc: "MCP/Skill, A2A, and workflow graphs go first-class — natively interop with customer systems.",
    },
  },
  {
    zh: {
      date: "2026 Q2",
      title: "多模态上线",
      desc: "图像、语音、视频理解全链路纳入 Harness 工具生态。",
    },
    en: {
      date: "2026 Q2",
      title: "Multi-Modal GA",
      desc: "Image, audio, and video understanding integrated into the Harness tool ecosystem end-to-end.",
    },
  },
  {
    zh: { date: "2026 Q3", title: "全球化 Day-1", desc: "7 语种、跨境支付、GDPR 合规全面就绪。" },
    en: {
      date: "2026 Q3",
      title: "Day-1 Global",
      desc: "7 languages, cross-border payments, GDPR-ready out of the box.",
    },
  },
];

// CTA
const CTA_COPY: Bilingual<{ eyebrow: string; heading: string; button: string }> = {
  zh: {
    eyebrow: "加入我们的研发之旅",
    heading: "与极客并肩,打造下一代 AI 基础设施",
    button: "探索职业机会",
  },
  en: {
    eyebrow: "Join our R&D journey",
    heading: "Build the next generation of AI infrastructure with fellow geeks",
    button: "Explore careers",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InnovationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const hero = pick(lang, HERO_COPY);
  const harnessCopy = pick(lang, HARNESS_COPY);
  const oss = pick(lang, OSS_SUPPLEMENT);
  const cta = pick(lang, CTA_COPY);
  const [aiNativePillar, ossPillar, bestPracticesPillar] = INNOVATION_PILLARS.map((p) =>
    pick(lang, p),
  );

  const orgPrinciplesCopy = {
    eyebrow: lang === "zh" ? "组织演进准则" : "ORGANIZATIONAL PRINCIPLES",
    heading: lang === "zh" ? "AI 杠杆对抗人治腐化" : "AI Leverage vs. Administrative Decay",
    intro:
      lang === "zh"
        ? "伟大的组织不应在业务扩张过程中走向平庸与官僚化。当 Nebutra 生态及其孵化公司面临规模激增时，以下三条是唯一不可妥协的组织演进准则——每一条都直接约束 hiring、治理与资源配置决策。"
        : "Great organizations should not drift into mediocrity and bureaucracy as they scale. When the Nebutra ecosystem and its incubated companies face rapid growth, the following three are the only non-negotiable principles of organizational evolution — each directly constraining hiring, governance, and resource allocation decisions.",
  };

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* 1. Hero — R&D Manifesto */}
      <section className="pt-32 md:pt-48 pb-24 md:pb-32">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="emerge">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
              {hero.eyebrow}
            </span>
          </AnimateIn>
          <AnimateIn preset="fadeUp">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-10 max-w-5xl">
              {hero.heading}
            </h1>
          </AnimateIn>
          <AnimateIn preset="fade">
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-8">
              {hero.manifesto}
            </p>
          </AnimateIn>
          <AnimateIn preset="fade">
            <p className="text-base md:text-lg text-foreground/90 leading-relaxed max-w-3xl border-l-2 border-foreground pl-4 font-medium">
              {hero.battlefield}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* 2. Harness Timeline — AI Stack 三层演化 (Russian-doll nested layers) */}
      <section className="py-24 md:py-32 border-y border-border/50 bg-muted/10">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="max-w-3xl mb-16 md:mb-20">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                {harnessCopy.eyebrow}
              </span>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-balance mb-8">
                {harnessCopy.heading}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {harnessCopy.intro}
              </p>
            </AnimateIn>
          </div>

          {/* Nested "Russian doll" — Harness wraps Context wraps Weights.
              HARNESS_TIMELINE is ordered [Weights, Context, Harness] → we render from outside in. */}
          {(() => {
            const weightsLayer = pick(lang, HARNESS_TIMELINE[0]);
            const contextLayer = pick(lang, HARNESS_TIMELINE[1]);
            const harnessLayer = pick(lang, HARNESS_TIMELINE[2]);

            return (
              <AnimateInGroup
                stagger="normal"
                className="relative rounded-[32px] border-2 border-foreground bg-background p-6 md:p-10 lg:p-14 shadow-xl"
              >
                <AnimateIn preset="fadeUp">
                  <div className="relative">
                    {/* Harness (outermost, highlighted) */}
                    <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
                      <div className="flex items-baseline gap-4">
                        <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                          Layer 03 · {harnessLayer.year}
                        </span>
                        <span className="text-[10px] font-mono tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background px-2.5 py-1">
                          {harnessCopy.currentTag}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm font-semibold tracking-tight text-foreground">
                        {harnessCopy.battlefieldTag}
                      </span>
                    </div>
                    <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground mb-5">
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
                    <div className="rounded-[24px] border border-border bg-muted/30 p-5 md:p-8 lg:p-10">
                      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                        <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                          Layer 02 · {contextLayer.year}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground/90 mb-4">
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
                      <div className="rounded-[18px] border border-border/70 bg-background p-4 md:p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
                          <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                            Layer 01 · {weightsLayer.year}
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/70 mb-3">
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
                </AnimateIn>
              </AnimateInGroup>
            );
          })()}

          <AnimateIn preset="fade">
            <p className="mt-10 md:mt-12 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {harnessCopy.outro}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* 3. Pillar 01 — AI-Native Architecture (Harness stack) */}
      <section className="py-24 md:py-32 border-b border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5">
              <AnimateIn preset="fadeUp">
                <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                  Pillar 01
                </span>
              </AnimateIn>
              <AnimateIn preset="fadeUp">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight text-balance mb-8">
                  {aiNativePillar.title}
                </h2>
              </AnimateIn>
              <AnimateIn preset="fade">
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  {aiNativePillar.description}
                </p>
              </AnimateIn>
            </div>

            <div className="lg:col-span-7">
              <AnimateInGroup stagger="normal" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AI_NATIVE_ITEMS.map((itemBi, i) => {
                  const item = pick(lang, itemBi);
                  const Icon = itemBi.icon;
                  return (
                    <AnimateIn key={item.name} preset="fadeUp">
                      <div className="h-full rounded-2xl border border-border/60 bg-muted/20 p-6 hover:border-border hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                          <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                            H{(i + 1).toString().padStart(2, "0")}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-foreground mb-2">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </AnimateIn>
                  );
                })}
              </AnimateInGroup>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pillar 02 — Open-Source Infrastructure */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5 lg:order-2">
              <AnimateIn preset="fadeUp">
                <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                  Pillar 02
                </span>
              </AnimateIn>
              <AnimateIn preset="fadeUp">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight text-balance mb-8">
                  {ossPillar.title}
                </h2>
              </AnimateIn>
              <AnimateIn preset="fade">
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                  {ossPillar.description}
                </p>
              </AnimateIn>
              <AnimateIn preset="fade">
                <p className="text-base text-muted-foreground/90 leading-relaxed border-l-2 border-border pl-4">
                  {oss}
                </p>
              </AnimateIn>
            </div>

            <div className="lg:col-span-7 lg:order-1">
              <AnimateInGroup stagger="normal" className="grid grid-cols-2 gap-4 md:gap-6">
                {OSS_STATS.map((statBi) => {
                  const stat = pick(lang, statBi);
                  return (
                    <AnimateIn key={stat.label} preset="fadeUp">
                      <div className="rounded-2xl border border-border/60 bg-muted/10 p-8 md:p-10 h-full flex flex-col justify-between">
                        <span className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
                          {stat.value}
                        </span>
                        <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mt-6">
                          {stat.label}
                        </span>
                      </div>
                    </AnimateIn>
                  );
                })}
              </AnimateInGroup>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pillar 03 — Engineering Best Practices */}
      <section className="py-24 md:py-32 border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="max-w-3xl mb-16 md:mb-20">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                Pillar 03
              </span>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-balance mb-8">
                {bestPracticesPillar.title}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {bestPracticesPillar.description}
              </p>
            </AnimateIn>
          </div>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          >
            {ENGINEERING_PRINCIPLES.map((principleBi, i) => {
              const principle = pick(lang, principleBi);
              const Icon = principleBi.icon;
              return (
                <AnimateIn key={principle.name} preset="fadeUp">
                  <div className="h-full rounded-2xl border border-border/60 bg-background p-7 hover:border-border hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-5">
                      <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                      <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                        P{(i + 1).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                      {principle.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {principle.desc}
                    </p>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </section>

      {/* 6. Organizational Principles — Whitepaper Ⅳ */}
      <section className="py-24 md:py-32 border-b border-border/50 bg-background">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="max-w-3xl mb-16 md:mb-20">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                {orgPrinciplesCopy.eyebrow}
              </span>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-balance mb-8">
                {orgPrinciplesCopy.heading}
              </h2>
            </AnimateIn>
            <AnimateIn preset="fade">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                {orgPrinciplesCopy.intro}
              </p>
            </AnimateIn>
          </div>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {ORGANIZATION_PRINCIPLES.map((principleBi) => {
              const principle = pick(lang, principleBi);
              return (
                <AnimateIn key={principle.number} preset="fadeUp">
                  <article className="relative h-full border-l-2 border-foreground bg-muted/20 pl-6 md:pl-8 pr-6 py-8 md:py-10 overflow-hidden">
                    <span
                      aria-hidden
                      className="absolute right-4 top-2 text-[7rem] md:text-[9rem] font-black leading-none tracking-tighter text-foreground/5 select-none pointer-events-none"
                    >
                      {principle.number}
                    </span>
                    <div className="relative">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                        Principle {principle.number}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-4 text-balance">
                        {principle.title}
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {principle.description}
                      </p>
                    </div>
                  </article>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </section>

      {/* 7. Innovation Timeline */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="max-w-3xl mb-16">
            <AnimateIn preset="fadeUp">
              <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-4 block">
                {lang === "zh" ? "创新时间线" : "Innovation Timeline"}
              </span>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-balance">
                {lang === "zh"
                  ? "我们走过的路与即将抵达的站台"
                  : "The road walked and stations ahead"}
              </h2>
            </AnimateIn>
          </div>

          <div className="relative">
            {/* vertical rail */}
            <div
              className="absolute left-0 md:left-[11.5rem] top-2 bottom-2 w-px bg-border"
              aria-hidden
            />

            <AnimateInGroup stagger="normal" className="flex flex-col gap-10 md:gap-14">
              {MILESTONES.map((msBi) => {
                const ms = pick(lang, msBi);
                return (
                  <AnimateIn key={ms.date} preset="fadeUp">
                    <div className="relative flex flex-col md:flex-row md:items-start gap-3 md:gap-10 pl-6 md:pl-0">
                      {/* dot */}
                      <span
                        className="absolute left-[-4px] md:left-[11.5rem] top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-foreground"
                        aria-hidden
                      />
                      <span className="w-full md:w-[11rem] text-sm font-mono tracking-widest uppercase text-muted-foreground md:pr-4">
                        {ms.date}
                      </span>
                      <div className="md:pl-8 flex-1">
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-2">
                          {ms.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                          {ms.desc}
                        </p>
                      </div>
                    </div>
                  </AnimateIn>
                );
              })}
            </AnimateInGroup>
          </div>
        </div>
      </section>

      {/* 8. CTA */}
      <section className="py-32 md:py-48 border-t border-border/50">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <AnimateIn preset="emerge">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-bold tracking-widest uppercase text-primary">
                {cta.eyebrow}
              </span>
            </div>
          </AnimateIn>
          <AnimateIn preset="fadeUp">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-balance mb-12">
              {cta.heading}
            </h2>
          </AnimateIn>
          <AnimateIn preset="fade">
            <Link href="/careers">
              <Button
                size="lg"
                className="rounded-full h-16 px-10 text-lg font-bold shadow-xl bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
              >
                {cta.button} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </AnimateIn>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
