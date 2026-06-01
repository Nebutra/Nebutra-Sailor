/**
 * Solutions taxonomy — the single source of truth for the Solutions mega-menu
 * and the `/solutions/[slug]` routes.
 *
 * Mirrors the in-repo `{ en, zh }` copy pattern used by `package-feature-data.ts`:
 * all solution content lives here (governed in one file) while it is still being
 * authored. Only the nav trigger label lives in the i18n catalogs (`nav.solutions`).
 *
 * Two node types share one page template:
 *   - "content"  — methodology / best-practice pillar (top-of-funnel, dual CTA)
 *   - "offering" — a real service line like managed AI data ops (strong single CTA)
 *
 * The best-practice article strip is sourced through `SolutionContentSource`
 * (see `@/lib/solutions/content-source`), so wiring Sanity in later needs no
 * change here.
 */
import {
  Analytics,
  Brain,
  Compass,
  CreditCard,
  Database,
  Eye,
  Globe,
  Layers,
  Lightning,
  Sparkles,
  TerminalWindow,
} from "@nebutra/icons";
import type { ComponentType } from "react";
import { type LocalizedCopy, pick } from "@/lib/i18n/localized";

export type SolutionType = "content" | "offering";
export type CopyLocale = "en" | "zh";
// Localized-content primitive + resolver live in one shared module; re-exported
// here so existing `@/lib/constants/solutions-data` importers keep working.
export type { LocalizedCopy };
export { pick };
export type NebutraIcon = ComponentType<{ className?: string }>;

export interface SolutionUseCase {
  title: LocalizedCopy;
  body: LocalizedCopy;
}

export interface SolutionFaq {
  q: LocalizedCopy;
  a: LocalizedCopy;
}

export interface Solution {
  slug: string;
  type: SolutionType;
  groupId: string;
  icon: NebutraIcon;
  label: LocalizedCopy;
  tagline: LocalizedCopy;
  hero: {
    eyebrow: LocalizedCopy;
    /** Plain title prefix. */
    title: LocalizedCopy;
    /** Aurora-accented suffix word. */
    titleAccent: LocalizedCopy;
    summary: LocalizedCopy;
  };
  /** 痛点 → 方案 cards. */
  useCases: SolutionUseCase[];
  faq: SolutionFaq[];
  /** Anchors into the existing capability map (e.g. "capability-ai"). */
  capabilityAnchors?: string[];
  /** Maps to a Sanity blog category. Nullable until content exists. */
  contentCategory?: string;
}

export interface SolutionGroup {
  id: string;
  label: LocalizedCopy;
  /** Seed colors for the group's AuroraText / hero. */
  auroraColors: [string, string, string, string];
  solutionSlugs: string[];
}

export const SOLUTION_GROUPS: SolutionGroup[] = [
  {
    id: "go-to-market",
    label: { en: "Go-to-Market", zh: "出海与增长" },
    auroraColors: ["#0033FE", "#0BF1C3", "#06b6d4", "#38bdf8"],
    solutionSlugs: ["go-global", "growth"],
  },
  {
    id: "build-govern",
    label: { en: "Build & Govern", zh: "工程与治理" },
    auroraColors: ["#6366f1", "#8b5cf6", "#3b82f6", "#a855f7"],
    solutionSlugs: ["architecture", "tech-stack", "dx"],
  },
  {
    id: "ai-data",
    label: { en: "AI & Data", zh: "AI 与数据" },
    auroraColors: ["#9333ea", "#3b82f6", "#22d3ee", "#a855f7"],
    solutionSlugs: ["ai", "ai-data-ops", "frontier"],
  },
  {
    id: "founder",
    label: { en: "Founder", zh: "创业" },
    auroraColors: ["#10b981", "#f59e0b", "#34d399", "#fbbf24"],
    solutionSlugs: ["china-vc", "global-vc", "fundraising", "product-insights"],
  },
];

export const SOLUTIONS: Solution[] = [
  {
    slug: "go-global",
    type: "content",
    groupId: "go-to-market",
    icon: Globe,
    label: { en: "Ship Globally", zh: "软件出海" },
    tagline: {
      en: "Launch a compliant, localized SaaS for global markets.",
      zh: "合规、本地化地把 SaaS 推向全球市场。",
    },
    hero: {
      eyebrow: { en: "Go Global", zh: "软件出海" },
      title: { en: "Take your SaaS", zh: "把你的 SaaS" },
      titleAccent: { en: "global", zh: "推向全球" },
      summary: {
        en: "Multi-region infra, i18n, payments and compliance — the harness ships the cross-border plumbing so you ship product.",
        zh: "多区域基建、国际化、支付与合规——Harness 把跨境的底层管道做好,你只管做产品。",
      },
    },
    useCases: [
      {
        title: { en: "Localization at the core", zh: "国际化是地基" },
        body: {
          en: "7-locale routing, RTL-ready tokens and per-market content without forking the codebase.",
          zh: "7 语言路由、可适配 RTL 的 token、按市场分发内容,而不必 fork 代码库。",
        },
      },
      {
        title: { en: "Payments without rewrites", zh: "支付无需重写" },
        body: {
          en: "Stripe / Polar / LemonSqueezy / ChinaPay behind one billing contract.",
          zh: "Stripe / Polar / LemonSqueezy / ChinaPay 收敛到一套计费契约后面。",
        },
      },
      {
        title: { en: "Compliance baked in", zh: "合规内建" },
        body: {
          en: "Tenant isolation, audit logging and data-residency primitives ready on day one.",
          zh: "租户隔离、审计日志、数据驻留原语,第一天就绪。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Do I need separate apps per region?", zh: "每个地区要分开建应用吗?" },
        a: {
          en: "No — one codebase, region-aware routing and provider selection via preset config.",
          zh: "不用——一套代码库,通过 preset 配置做区域感知路由与 provider 选择。",
        },
      },
    ],
    capabilityAnchors: ["capability-platform", "capability-commerce"],
    contentCategory: "go-global",
  },
  {
    slug: "growth",
    type: "content",
    groupId: "go-to-market",
    icon: Lightning,
    label: { en: "Growth Hacking", zh: "黑客增长" },
    tagline: {
      en: "Acquisition, activation and retention loops that compound.",
      zh: "可复利的获客、激活与留存增长闭环。",
    },
    hero: {
      eyebrow: { en: "Growth", zh: "黑客增长" },
      title: { en: "Build loops that", zh: "搭建可以" },
      titleAccent: { en: "compound", zh: "复利的增长闭环" },
      summary: {
        en: "Instrument funnels, run experiments and wire referral and lifecycle loops on a metering + notifications backbone.",
        zh: "在计量 + 通知骨干之上做漏斗埋点、跑实验,并接入推荐与生命周期闭环。",
      },
    },
    useCases: [
      {
        title: { en: "Funnel instrumentation", zh: "漏斗埋点" },
        body: {
          en: "Usage metering + analytics give you the events to measure activation, not guesses.",
          zh: "用量计量 + 分析提供衡量激活所需的事件,而不是靠猜。",
        },
      },
      {
        title: { en: "Lifecycle messaging", zh: "生命周期触达" },
        body: {
          en: "Multi-channel notifications (in-app / email / push) driven by product events.",
          zh: "由产品事件驱动的多渠道通知(站内 / 邮件 / 推送)。",
        },
      },
      {
        title: { en: "Experiment fast", zh: "快速实验" },
        body: {
          en: "Feature flags ship variants without redeploys; metering reads the result.",
          zh: "特性开关无需重新部署即可投放变体,计量回读结果。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Is an analytics warehouse included?", zh: "自带数据仓库吗?" },
        a: {
          en: "Metering aggregates to ClickHouse for real-time funnel and cohort reads.",
          zh: "计量管道聚合到 ClickHouse,做实时漏斗与同期群分析。",
        },
      },
    ],
    capabilityAnchors: ["capability-integrations"],
    contentCategory: "growth",
  },
  {
    slug: "architecture",
    type: "content",
    groupId: "build-govern",
    icon: Layers,
    label: { en: "Architecture Governance", zh: "架构治理" },
    tagline: {
      en: "Keep a large codebase coherent as it scales.",
      zh: "在规模扩张时保持大型代码库的一致性。",
    },
    hero: {
      eyebrow: { en: "Architecture", zh: "架构治理" },
      title: { en: "Govern your", zh: "治理你的" },
      titleAccent: { en: "architecture", zh: "系统架构" },
      summary: {
        en: "Architecture tests, ratchets and capability boundaries enforce structure mechanically — not in a wiki nobody reads.",
        zh: "用架构测试、ratchet 与能力边界从机制上强制结构,而不是写在没人看的 wiki 里。",
      },
    },
    useCases: [
      {
        title: { en: "Ratcheted invariants", zh: "棘轮式不变量" },
        body: {
          en: "Property tests fail the build when hardcoded values or cross-layer imports creep in.",
          zh: "当硬编码值或跨层导入出现时,属性测试让构建失败。",
        },
      },
      {
        title: { en: "Capability boundaries", zh: "能力边界" },
        body: {
          en: "Domain-grouped packages with declared owners and scopes keep coupling low.",
          zh: "按域分组、声明归属与作用域的包,把耦合压到最低。",
        },
      },
      {
        title: { en: "Three-tier lifecycle", zh: "三级生命周期" },
        body: {
          en: "active / stub / incubator keeps dead concepts out of CI without losing the idea.",
          zh: "active / stub / incubator 让死概念离开 CI,又不丢失思路。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Does governance slow teams down?", zh: "治理会拖慢团队吗?" },
        a: {
          en: "It moves review from humans to tests, so most checks are instant and automatic.",
          zh: "它把评审从人转移到测试,大多数检查即时且自动。",
        },
      },
    ],
    capabilityAnchors: ["capability-platform"],
    contentCategory: "architecture",
  },
  {
    slug: "tech-stack",
    type: "content",
    groupId: "build-govern",
    icon: Compass,
    label: { en: "Tech Selection", zh: "技术选型" },
    tagline: {
      en: "Provider-agnostic choices you can swap without rewrites.",
      zh: "provider 无关的选型,可替换而无需重写。",
    },
    hero: {
      eyebrow: { en: "Tech Stack", zh: "技术选型" },
      title: { en: "Choose once,", zh: "一次选型," },
      titleAccent: { en: "swap freely", zh: "自由替换" },
      summary: {
        en: "Queue, search, auth, billing and storage each sit behind one interface with multiple providers — pick by env, not by rewrite.",
        zh: "队列、搜索、鉴权、计费、存储各自收敛到一个接口下的多 provider——按环境选择,而非重写选择。",
      },
    },
    useCases: [
      {
        title: { en: "Auto-detected providers", zh: "自动检测 provider" },
        body: {
          en: "Env vars pick QStash vs BullMQ, Meilisearch vs Algolia, etc. — code stays the same.",
          zh: "环境变量决定 QStash 还是 BullMQ、Meilisearch 还是 Algolia——代码不变。",
        },
      },
      {
        title: { en: "TS-by-default backend", zh: "后端默认 TS" },
        body: {
          en: "A documented policy for when Python is justified keeps the stack from sprawling.",
          zh: "对何时该用 Python 有成文政策,防止技术栈蔓延。",
        },
      },
      {
        title: { en: "Reversible decisions", zh: "可逆决策" },
        body: {
          en: "Swapping a provider is a config change, so early bets stay cheap to revisit.",
          zh: "替换 provider 只是配置改动,早期押注的回头成本很低。",
        },
      },
    ],
    faq: [
      {
        q: { en: "What if my provider isn't supported?", zh: "如果我的 provider 不被支持?" },
        a: {
          en: "Each domain ships an interface — add an adapter without touching call sites.",
          zh: "每个域都有接口——加一个适配器即可,无需改调用点。",
        },
      },
    ],
    capabilityAnchors: ["capability-integrations", "capability-iam"],
    contentCategory: "tech-stack",
  },
  {
    slug: "dx",
    type: "content",
    groupId: "build-govern",
    icon: TerminalWindow,
    label: { en: "DX Tooling", zh: "DX 工具链" },
    tagline: {
      en: "A developer experience that keeps velocity high.",
      zh: "让研发速度保持在高位的开发者体验。",
    },
    hero: {
      eyebrow: { en: "DX", zh: "DX 工具链" },
      title: { en: "Tooling that gets", zh: "让你" },
      titleAccent: { en: "out of the way", zh: "心无旁骛的工具链" },
      summary: {
        en: "One scaffold CLI, one formatter, one pipeline. Generate, lint, test and ship without yak-shaving the toolchain.",
        zh: "一个脚手架 CLI、一个格式化器、一条流水线。生成、检查、测试、发布,无需在工具链上反复折腾。",
      },
    },
    useCases: [
      {
        title: { en: "Scaffold in seconds", zh: "秒级脚手架" },
        body: {
          en: "create-sailor spins up a feature-configured SaaS with the harness wired in.",
          zh: "create-sailor 一键拉起按功能配置、已接好 Harness 的 SaaS。",
        },
      },
      {
        title: { en: "One linter, one config", zh: "一个 linter,一份配置" },
        body: {
          en: "Biome formats and lints the whole monorepo — no ESLint/Prettier split-brain.",
          zh: "Biome 统一格式化与检查整个 monorepo——没有 ESLint/Prettier 的分裂。",
        },
      },
      {
        title: { en: "Green pipeline by default", zh: "默认绿色流水线" },
        body: {
          en: "lint → build → test → scan → deploy runs the same locally and in CI.",
          zh: "lint → build → test → scan → deploy 本地与 CI 完全一致。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Can I bring my own tools?", zh: "可以用我自己的工具吗?" },
        a: {
          en: "Yes — presets are opt-in; the defaults are opinionated, not locked.",
          zh: "可以——preset 是可选的;默认值是有主张的,但不锁死。",
        },
      },
    ],
    capabilityAnchors: ["capability-platform"],
    contentCategory: "dx",
  },
  {
    slug: "ai",
    type: "content",
    groupId: "ai-data",
    icon: Brain,
    label: { en: "AI Integration", zh: "人工智能" },
    tagline: {
      en: "Ship AI features on a provider-agnostic agent runtime.",
      zh: "在 provider 无关的智能体运行时上交付 AI 功能。",
    },
    hero: {
      eyebrow: { en: "AI", zh: "人工智能" },
      title: { en: "Make your product", zh: "让你的产品" },
      titleAccent: { en: "AI-native", zh: "AI 原生" },
      summary: {
        en: "Agents, RAG, tools and an LLM gateway — multi-model, observable, and safe to put in front of users.",
        zh: "智能体、RAG、工具与 LLM 网关——多模型、可观测,放心交到用户面前。",
      },
    },
    useCases: [
      {
        title: { en: "Model-agnostic gateway", zh: "模型无关网关" },
        body: {
          en: "Route, fail over and track cost across providers behind one API.",
          zh: "在一套 API 后面跨 provider 做路由、故障转移与成本追踪。",
        },
      },
      {
        title: { en: "RAG that ships", zh: "可落地的 RAG" },
        body: {
          en: "Knowledge base, embeddings and retrieval primitives wired for multi-tenant use.",
          zh: "知识库、嵌入与检索原语,已为多租户场景接好。",
        },
      },
      {
        title: { en: "Tool-using agents", zh: "会用工具的智能体" },
        body: {
          en: "An agent runtime with tool registry and execution policy for safe autonomy.",
          zh: "带工具注册表与执行策略的智能体运行时,实现安全的自主性。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Am I locked to one model vendor?", zh: "会被绑死在一家模型厂商吗?" },
        a: {
          en: "No — the gateway abstracts vendors; switching is configuration.",
          zh: "不会——网关抽象了厂商,切换只是配置。",
        },
      },
    ],
    capabilityAnchors: ["capability-ai"],
    contentCategory: "ai",
  },
  {
    slug: "ai-data-ops",
    type: "offering",
    groupId: "ai-data",
    icon: Database,
    label: { en: "AI Data Operations", zh: "AI 数据运营" },
    tagline: {
      en: "Managed data labeling, RLHF and eval pipelines — as a service.",
      zh: "托管式的数据标注、RLHF 与评测流水线——以服务交付。",
    },
    hero: {
      eyebrow: { en: "AI Data Ops", zh: "AI 数据运营" },
      title: { en: "Fuel your models with", zh: "用高质量数据" },
      titleAccent: { en: "quality data", zh: "喂养你的模型" },
      summary: {
        en: "A managed data operation — annotation, RLHF preference data and evaluation sets — run by our team against your spec.",
        zh: "一套托管的数据运营——标注、RLHF 偏好数据与评测集——由我们的团队按你的规范执行。",
      },
    },
    useCases: [
      {
        title: { en: "Annotation at scale", zh: "规模化标注" },
        body: {
          en: "Vetted workforce + tooling for text, image, audio and 3D labeling.",
          zh: "经过审核的人力 + 工具,覆盖文本、图像、音频与 3D 标注。",
        },
      },
      {
        title: { en: "RLHF preference data", zh: "RLHF 偏好数据" },
        body: {
          en: "Pairwise comparisons and rubric scoring to align your model to intent.",
          zh: "成对比较与量表打分,让你的模型对齐意图。",
        },
      },
      {
        title: { en: "Evaluation sets", zh: "评测集" },
        body: {
          en: "Held-out, audited eval suites so you measure quality, not vibes.",
          zh: "留出、经审计的评测套件,用以衡量质量而非感觉。",
        },
      },
    ],
    faq: [
      {
        q: { en: "How do we start?", zh: "如何开始?" },
        a: {
          en: "Book a scoping call — we turn your spec into a pilot batch within days.",
          zh: "预约一次范围沟通——我们在数天内把你的规范变成试点批次。",
        },
      },
    ],
    contentCategory: "ai-data-ops",
  },
  {
    slug: "frontier",
    type: "content",
    groupId: "ai-data",
    icon: Sparkles,
    label: { en: "Frontier", zh: "未来前沿" },
    tagline: {
      en: "Field notes from the edge of what's shipping.",
      zh: "来自落地最前沿的一线观察。",
    },
    hero: {
      eyebrow: { en: "Frontier", zh: "未来前沿" },
      title: { en: "Stay on the", zh: "站在" },
      titleAccent: { en: "frontier", zh: "技术前沿" },
      summary: {
        en: "What we're testing before it's obvious — new models, runtimes and patterns, with the trade-offs spelled out.",
        zh: "在事情变得显而易见之前我们在测什么——新模型、新运行时、新范式,并讲清权衡。",
      },
    },
    useCases: [
      {
        title: { en: "Early signal", zh: "早期信号" },
        body: {
          en: "Honest write-ups of what worked and what didn't, not hype.",
          zh: "对什么有效、什么无效的诚实记录,而非炒作。",
        },
      },
      {
        title: { en: "Reference implementations", zh: "参考实现" },
        body: {
          en: "Runnable spikes you can lift instead of starting from a blog post.",
          zh: "可运行的探针,直接拿来用,而不是从一篇博客开始。",
        },
      },
      {
        title: { en: "Trade-offs first", zh: "先讲权衡" },
        body: {
          en: "Every frontier note leads with cost, risk and when not to adopt.",
          zh: "每篇前沿记录都先讲成本、风险与何时不该采用。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Is this production advice?", zh: "这是生产级建议吗?" },
        a: {
          en: "Treat frontier notes as scouting — production guidance is flagged explicitly.",
          zh: "把前沿记录当作侦察——生产级建议会被明确标注。",
        },
      },
    ],
    contentCategory: "frontier",
  },
  {
    slug: "china-vc",
    type: "content",
    groupId: "founder",
    icon: Analytics,
    label: { en: "China VC Directory", zh: "中国 VC 解决方案" },
    tagline: {
      en: "China's direct-investment institutions, searchable by sector, type and deal activity.",
      zh: "中国主流直投机构,按赛道、类型、投资体量可搜可筛。",
    },
    hero: {
      eyebrow: { en: "China VC", zh: "中国 VC" },
      title: { en: "Find the right", zh: "找到对的" },
      titleAccent: { en: "China investors", zh: "中国投资人" },
      summary: {
        en: "A searchable directory of China's direct-investment institutions — filter by sector, type and deal volume, head funds with logos.",
        zh: "覆盖中国主流直投机构的可搜索数据库——按赛道、类型、投资体量筛选,头部机构带 logo。",
      },
    },
    useCases: [
      {
        title: { en: "Filter by sector", zh: "按赛道筛选" },
        body: {
          en: "Normalized sectors — narrow to investors active in your space.",
          zh: "标准化赛道——快速锁定你所在领域的投资人。",
        },
      },
      {
        title: { en: "Read the activity signal", zh: "看活跃度信号" },
        body: {
          en: "Cumulative deal volume shows who deploys most.",
          zh: "累计投资体量反映谁出手最多。",
        },
      },
      {
        title: { en: "Go straight to source", zh: "直达官方入口" },
        body: {
          en: "Each institution links straight to its official site.",
          zh: "每家机构一键直达官网。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Which institutions are included?", zh: "收录了哪些机构?" },
        a: {
          en: "China's mainstream direct-investment institutions across stages and sectors.",
          zh: "覆盖中国主流直投机构,跨阶段与赛道。",
        },
      },
    ],
    contentCategory: "china-vc",
  },
  {
    slug: "global-vc",
    type: "content",
    groupId: "founder",
    icon: Globe,
    label: { en: "Global VC Directory", zh: "全球 VC 解决方案" },
    tagline: {
      en: "Well-known global investors — from Y Combinator to multi-stage funds.",
      zh: "全球知名投资机构——从 Y Combinator 到多阶段基金。",
    },
    hero: {
      eyebrow: { en: "Global VC", zh: "全球 VC" },
      title: { en: "Reach", zh: "对接" },
      titleAccent: { en: "global investors", zh: "全球投资人" },
      summary: {
        en: "A curated directory of leading global investors — accelerators, seed, multi-stage and growth funds — filterable by sector, type and region.",
        zh: "精选的全球头部投资机构目录——加速器、种子、多阶段与成长基金——按领域、类型、地区筛选。",
      },
    },
    useCases: [
      {
        title: { en: "From accelerator to growth", zh: "从加速器到成长期" },
        body: {
          en: "Y Combinator, a16z, Sequoia, Accel and more — across every stage.",
          zh: "Y Combinator、a16z、红杉、Accel 等——覆盖各个阶段。",
        },
      },
      {
        title: { en: "Filter by focus", zh: "按方向筛选" },
        body: {
          en: "Narrow by sector (AI, fintech, crypto, bio…), type and region.",
          zh: "按领域(AI、金融科技、加密、生物…)、类型与地区收窄。",
        },
      },
      {
        title: { en: "Go straight to source", zh: "直达官方入口" },
        body: {
          en: "Each fund links straight to its official site.",
          zh: "每家基金一键直达官网。",
        },
      },
    ],
    faq: [
      {
        q: { en: "How is this list chosen?", zh: "名单怎么选的?" },
        a: {
          en: "A hand-curated set of widely recognized global investors, compiled from public information.",
          zh: "人工精选的全球公认投资机构,资料整理自公开信息。",
        },
      },
    ],
    contentCategory: "global-vc",
  },
  {
    slug: "fundraising",
    type: "content",
    groupId: "founder",
    icon: CreditCard,
    label: { en: "Fundraising", zh: "创业融资" },
    tagline: {
      en: "Playbooks for raising from the right investors.",
      zh: "向对的投资人融资的实操手册。",
    },
    hero: {
      eyebrow: { en: "Fundraising", zh: "创业融资" },
      title: { en: "Raise with a", zh: "用" },
      titleAccent: { en: "clear story", zh: "清晰的故事去融资" },
      summary: {
        en: "Metrics, narrative and process — how to package what you've built into a round that closes.",
        zh: "指标、叙事与流程——把你做出来的东西,打包成一轮能 close 的融资。",
      },
    },
    useCases: [
      {
        title: { en: "Metrics that matter", zh: "真正重要的指标" },
        body: {
          en: "Which numbers investors actually underwrite at each stage.",
          zh: "在每个阶段,投资人真正会据以决策的数字。",
        },
      },
      {
        title: { en: "Narrative craft", zh: "叙事打磨" },
        body: {
          en: "Turn a feature list into a market story without overclaiming.",
          zh: "把功能清单变成市场故事,又不过度承诺。",
        },
      },
      {
        title: { en: "Process discipline", zh: "流程纪律" },
        body: {
          en: "Run a tight, time-boxed raise instead of an open-ended drift.",
          zh: "跑一轮紧凑、限时的融资,而不是无止境地拖。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Is this region-specific?", zh: "分地区吗?" },
        a: {
          en: "Patterns are general; we flag where US, EU and China rounds differ.",
          zh: "范式是通用的;我们会标注美、欧、中三地融资的差异处。",
        },
      },
    ],
    contentCategory: "fundraising",
  },
  {
    slug: "product-insights",
    type: "content",
    groupId: "founder",
    icon: Eye,
    label: { en: "Product Insights", zh: "产品观察" },
    tagline: {
      en: "Teardowns and patterns from products worth studying.",
      zh: "对值得研究的产品的拆解与范式提炼。",
    },
    hero: {
      eyebrow: { en: "Product", zh: "产品观察" },
      title: { en: "Learn from", zh: "从" },
      titleAccent: { en: "products that work", zh: "好产品中学习" },
      summary: {
        en: "Structured teardowns — what a product gets right, why it works, and what's transferable to yours.",
        zh: "结构化拆解——一个产品做对了什么、为何有效、哪些可迁移到你这里。",
      },
    },
    useCases: [
      {
        title: { en: "Pattern, not copy", zh: "提炼范式,而非照抄" },
        body: {
          en: "We extract the reusable principle behind a UX or GTM move.",
          zh: "我们提炼一个 UX 或 GTM 动作背后可复用的原则。",
        },
      },
      {
        title: { en: "Decision context", zh: "决策语境" },
        body: {
          en: "Why a choice made sense for them — and when it wouldn't for you.",
          zh: "为什么这个选择对他们成立——以及何时对你并不成立。",
        },
      },
      {
        title: { en: "Actionable takeaways", zh: "可执行结论" },
        body: {
          en: "Each teardown ends with what to try this week.",
          zh: "每篇拆解都以「本周可以试什么」收尾。",
        },
      },
    ],
    faq: [
      {
        q: { en: "Do you cover B2B and B2C?", zh: "覆盖 B2B 和 B2C 吗?" },
        a: {
          en: "Both, with a bias toward SaaS and developer-facing products.",
          zh: "都有,偏向 SaaS 与面向开发者的产品。",
        },
      },
    ],
    contentCategory: "product-insights",
  },
];

const SOLUTION_BY_SLUG = new Map(SOLUTIONS.map((s) => [s.slug, s]));
const GROUP_BY_ID = new Map(SOLUTION_GROUPS.map((g) => [g.id, g]));

export function getSolution(slug: string): Solution | undefined {
  return SOLUTION_BY_SLUG.get(slug);
}

export function getSolutionGroup(id: string): SolutionGroup | undefined {
  return GROUP_BY_ID.get(id);
}

export function getAllSolutionSlugs(): string[] {
  return SOLUTIONS.map((s) => s.slug);
}

/** Solutions belonging to a group, in declared order. */
export function getGroupSolutions(group: SolutionGroup): Solution[] {
  return group.solutionSlugs
    .map((slug) => SOLUTION_BY_SLUG.get(slug))
    .filter((s): s is Solution => Boolean(s));
}
