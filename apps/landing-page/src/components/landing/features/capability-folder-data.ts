import {
  Robot as Bot,
  CreditCard,
  Database,
  BlendMode as Palette,
  Servers as Server,
  Shield,
  Workflow,
} from "@nebutra/icons";
import type { ComponentType } from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";

type CapabilityCopy = {
  en: string;
  zh: string;
};

export type CapabilityVisualVariant =
  | "orchestra"
  | "stack"
  | "trust"
  | "supply"
  | "bus"
  | "ledger"
  | "request";

type CapabilityNode = {
  label: string;
  detail: CapabilityCopy;
  tone?: "core" | "port" | "policy" | "adapter";
};

type CapabilityMetric = {
  label: CapabilityCopy;
  value: string;
  detail: CapabilityCopy;
};

export type CapabilityFolder = {
  anchorId: string;
  docsHref: string;
  icon: ComponentType<{ className?: string }>;
  id: string;
  layout: "wide" | "standard" | "full";
  sourcePath: string;
  sourceStats: {
    unitCount: number;
    unitLabel: CapabilityCopy;
    sourceFiles: number;
    testFiles: number;
    readmes: number;
  };
  title: CapabilityCopy;
  summary: CapabilityCopy;
  designIntent: CapabilityCopy;
  signature: CapabilityMetric;
  topology: {
    title: CapabilityCopy;
    caption: CapabilityCopy;
    variant: CapabilityVisualVariant;
    nodes: CapabilityNode[];
  };
  focusPackages: string[];
  evidence: CapabilityMetric[];
  interfaces: string[];
  owns: CapabilityCopy[];
  boundaries: CapabilityCopy[];
  proof: CapabilityCopy[];
};

const copy = (en: string, zh: string): CapabilityCopy => ({ en, zh });

export const CAPABILITY_FOLDERS: CapabilityFolder[] = [
  {
    id: "ai",
    anchorId: "capability-ai",
    sourcePath: "packages/ai",
    docsHref: createPublicDocsUrl("ai/overview"),
    icon: Bot,
    layout: "wide",
    sourceStats: {
      unitCount: 38,
      unitLabel: copy("packages", "包"),
      sourceFiles: 192,
      testFiles: 95,
      readmes: 33,
    },
    title: copy("AI Runtime & Agent Substrate", "AI 运行时与智能体底座"),
    summary: copy(
      "A production AI domain with agent loops, tool protocols, RAG, local execution, provider metadata, and multimodal pipelines kept out of app code.",
      "这是一个生产级 AI 域：智能体循环、工具协议、RAG、本地执行、供应商元数据与多模态流水线都被收束在应用之外。",
    ),
    designIntent: copy(
      "The card is drawn as a workbench: @nebutra/agent-runtime is the center, and retrieval, tools, sandboxing, providers, and media packages orbit around it.",
      "这张卡按工作台设计：@nebutra/agent-runtime 位于中心，检索、工具、沙箱、供应商与媒体包围绕它协同。",
    ),
    signature: {
      value: "38",
      label: copy("AI packages", "AI 包"),
      detail: copy(
        "192 runtime source files and 95 tests, with the heaviest coverage in agent-runtime, knowledge-rag, reel, graph, and execution policies.",
        "192 个运行时源码文件与 95 个测试，重心落在 agent-runtime、knowledge-rag、reel、graph 与 execution policy。",
      ),
    },
    topology: {
      title: copy("Agent workbench topology", "智能体工作台拓扑"),
      caption: copy(
        "One core loop coordinates model calls, context, tools, memory, execution, and media production.",
        "一个核心循环协调模型调用、上下文、工具、记忆、执行与媒体生产。",
      ),
      variant: "orchestra",
      nodes: [
        {
          label: "@nebutra/agent-runtime",
          detail: copy(
            "durable turns, tools, commands, hooks, subagents",
            "durable turns、工具、命令、hooks、subagents",
          ),
          tone: "core",
        },
        {
          label: "@nebutra/knowledge-rag",
          detail: copy(
            "retrieval, chunking, local embeddings, content-store",
            "检索、切块、本地 embedding、content-store",
          ),
        },
        {
          label: "@nebutra/mcp",
          detail: copy("tool catalog and protocol bridge", "工具目录与协议桥接"),
          tone: "port",
        },
        {
          label: "@nebutra/reel",
          detail: copy(
            "typed media graph and storyboard execution",
            "类型化媒体图与 storyboard 执行",
          ),
        },
        {
          label: "@nebutra/sandbox-runtime",
          detail: copy("execution providers behind one router", "一个 router 后的执行供应商"),
          tone: "policy",
        },
        {
          label: "@nebutra/ai-providers",
          detail: copy("metadata only; runtime remains in agents", "只放元数据；运行时留在 agents"),
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "@nebutra/agent-runtime",
      "@nebutra/agents",
      "@nebutra/knowledge-rag",
      "@nebutra/mcp",
      "@nebutra/reel",
      "@nebutra/sandbox-runtime",
    ],
    evidence: [
      {
        value: "34",
        label: copy("agent-runtime tests", "agent-runtime 测试"),
        detail: copy(
          "dispatcher, hooks, durable turns, commands, rollout store",
          "dispatcher、hooks、durable turn、命令、rollout store",
        ),
      },
      {
        value: "12",
        label: copy("RAG tests", "RAG 测试"),
        detail: copy("retrieval contracts and ingestion behavior", "检索契约与 ingestion 行为"),
      },
      {
        value: "33",
        label: copy("README surfaces", "README 面"),
        detail: copy("package-level docs for most AI capabilities", "多数 AI 能力有包级文档"),
      },
    ],
    owns: [
      copy(
        "@nebutra/agents as the canonical model execution surface",
        "@nebutra/agents 作为统一模型执行面",
      ),
      copy(
        "RAG, code indexing, knowledge graph, content store, and tool registry",
        "RAG、代码索引、知识图谱、内容库与工具注册中心",
      ),
      copy(
        "Image, video, audio, voice, sandbox, and browser automation pipelines",
        "图像、视频、音频、语音、沙箱与浏览器自动化流水线",
      ),
    ],
    boundaries: [
      copy(
        "Apps consume stable package APIs; they do not own provider routing.",
        "应用只消费稳定包 API，不拥有供应商路由。",
      ),
      copy(
        "Media workflows depend on injected adapters instead of hardcoded vendors.",
        "多媒体工作流依赖注入适配器，而不是硬编码厂商。",
      ),
    ],
    proof: [
      copy(
        "package-local tests for agents, knowledge-rag, reel, and agent-runtime",
        "agents、knowledge-rag、reel、agent-runtime 的包级测试",
      ),
      copy(
        "architecture tests for AI primitive ownership and runtime dependencies",
        "AI primitive ownership 与 runtime dependency 架构测试",
      ),
    ],
    interfaces: [
      "@nebutra/agents",
      "@nebutra/agent-runtime",
      "@nebutra/knowledge-rag",
      "@nebutra/mcp",
    ],
  },
  {
    id: "platform",
    anchorId: "capability-platform",
    sourcePath: "packages/platform",
    docsHref: createPublicDocsUrl("concepts/architecture"),
    icon: Database,
    layout: "standard",
    sourceStats: {
      unitCount: 18,
      unitLabel: copy("packages", "包"),
      sourceFiles: 147,
      testFiles: 30,
      readmes: 13,
    },
    title: copy("Platform Control Plane", "平台控制平面"),
    summary: copy(
      "The lowest shared layer: database, config, provider selection, tenant locks, gateway-core contracts, health, rate limits, traces, and repository boundaries.",
      "最低层共享能力：数据库、配置、供应商选择、租户锁、gateway-core 契约、健康检查、限流、trace 与仓储边界。",
    ),
    designIntent: copy(
      "The card uses a layered stack because platform code should only be depended on downward, never imported from product domains.",
      "这张卡用分层栈表达：平台代码只能被上层依赖，不能反向导入产品域。",
    ),
    signature: {
      value: "18",
      label: copy("foundation packages", "基础包"),
      detail: copy(
        "145 runtime source files spanning db, gateway-core, provider-factory, tenant-store, trace-store, config, errors, and observability.",
        "145 个运行时源码文件覆盖 db、gateway-core、provider-factory、tenant-store、trace-store、config、errors 与可观测性。",
      ),
    },
    topology: {
      title: copy("Downward-only platform stack", "只能向下依赖的平台栈"),
      caption: copy(
        "Feature packages stand above this stack; platform packages must not pull product logic upward.",
        "功能包站在这层之上；平台包不把产品逻辑拉进来。",
      ),
      variant: "stack",
      nodes: [
        {
          label: "@nebutra/db",
          detail: copy(
            "Prisma v7, schema policy, generation scripts",
            "Prisma v7、schema 策略、生成脚本",
          ),
          tone: "core",
        },
        {
          label: "@nebutra/tenant-store",
          detail: copy(
            "per-tenant serialization and scoped stores",
            "按租户串行化与 scoped stores",
          ),
          tone: "policy",
        },
        {
          label: "@nebutra/provider-factory",
          detail: copy(
            "explicit/env/detect/fallback provider resolution",
            "explicit/env/detect/fallback 供应商解析",
          ),
        },
        {
          label: "@nebutra/gateway-core",
          detail: copy(
            "shared gateway contracts below the Hono backend",
            "Hono backend 之下的共享 gateway 契约",
          ),
        },
        {
          label: "@nebutra/trace-store",
          detail: copy(
            "async traces for agents, tools, and LLM spans",
            "agent、tool、LLM span 的异步 trace",
          ),
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "@nebutra/db",
      "@nebutra/gateway-core",
      "@nebutra/provider-factory",
      "@nebutra/tenant-store",
      "@nebutra/trace-store",
    ],
    evidence: [
      {
        value: "81",
        label: copy("db source files", "db 源码文件"),
        detail: copy(
          "schema, client, seed, generated boundaries",
          "schema、client、seed、生成边界",
        ),
      },
      {
        value: "13",
        label: copy("local AGENTS contracts", "本地 AGENTS 契约"),
        detail: copy("package-level ownership rules", "包级所有权规则"),
      },
      {
        value: "9",
        label: copy("gateway-core tests", "gateway-core 测试"),
        detail: copy(
          "shared gateway behavior below backend routes",
          "后端路由之下的共享 gateway 行为",
        ),
      },
    ],
    owns: [
      copy(
        "Prisma schema, database client, migrations, and multi-schema policy",
        "Prisma schema、数据库客户端、迁移与多 schema 策略",
      ),
      copy(
        "Tenant locks, trace store, health checks, config, errors, and rate limiting",
        "租户锁、trace store、健康检查、配置、错误与限流",
      ),
      copy(
        "Provider factory and repository boundaries used by higher-level packages",
        "上层包复用的 provider factory 与 repository 边界",
      ),
    ],
    boundaries: [
      copy(
        "No app-specific UI or product copy belongs in platform packages.",
        "平台包不承载应用专属 UI 或产品文案。",
      ),
      copy(
        "Feature packages depend downward; platform does not import feature domains.",
        "功能包向下依赖平台，平台不反向导入功能域。",
      ),
    ],
    proof: [
      copy(
        "schema drift audits, db generation, and architecture dependency tests",
        "schema drift audit、db generate 与架构依赖测试",
      ),
      copy(
        "tenant-store and trace-store package-local doctor/debug commands",
        "tenant-store 与 trace-store 的包级 doctor/debug 命令",
      ),
    ],
    interfaces: [
      "@nebutra/db",
      "@nebutra/config",
      "@nebutra/provider-factory",
      "@nebutra/tenant-store",
    ],
  },
  {
    id: "iam",
    anchorId: "capability-iam",
    sourcePath: "packages/iam",
    docsHref: createPublicDocsUrl("concepts/permissions"),
    icon: Shield,
    layout: "wide",
    sourceStats: {
      unitCount: 8,
      unitLabel: copy("packages", "包"),
      sourceFiles: 91,
      testFiles: 27,
      readmes: 8,
    },
    title: copy("Identity, Access & Tenant Trust", "身份、访问与租户信任"),
    summary: copy(
      "Provider-agnostic authentication, tenant context, permission gates, audit, captcha, OAuth, and encrypted vault behavior live in one trust boundary.",
      "供应商无关认证、租户上下文、权限门禁、审计、验证码、OAuth 与加密 vault 行为被放在同一个信任边界里。",
    ),
    designIntent: copy(
      "The card is a trust corridor: external identity enters on one side, then tenant context, permission, audit, and vault checks narrow the path.",
      "这张卡按信任走廊设计：外部身份从一侧进入，租户上下文、权限、审计与 vault 检查逐步收窄路径。",
    ),
    signature: {
      value: "26",
      label: copy("trust tests", "信任测试"),
      detail: copy(
        "Provider abstraction, audit, tenant, permission, OAuth, and vault tests keep auth behavior from drifting into apps.",
        "供应商抽象、审计、租户、权限、OAuth 与 vault 测试防止 auth 行为漂移进应用。",
      ),
    },
    topology: {
      title: copy("Trust corridor", "信任走廊"),
      caption: copy(
        "Every product action should pass through identity, tenant, permission, audit, and secret boundaries in that order.",
        "每个产品动作都应按身份、租户、权限、审计、密钥边界的顺序通过。",
      ),
      variant: "trust",
      nodes: [
        {
          label: "@nebutra/auth",
          detail: copy(
            "Clerk, Better Auth, NextAuth, Supabase abstraction",
            "Clerk、Better Auth、NextAuth、Supabase 抽象",
          ),
          tone: "adapter",
        },
        {
          label: "@nebutra/tenant",
          detail: copy("tenant context and organization scoping", "租户上下文与组织作用域"),
          tone: "policy",
        },
        {
          label: "@nebutra/permissions",
          detail: copy("RBAC and resource-action scopes", "RBAC 与 resource-action scopes"),
          tone: "core",
        },
        {
          label: "@nebutra/audit",
          detail: copy("sensitive operation trail", "敏感操作轨迹"),
        },
        {
          label: "@nebutra/vault",
          detail: copy("local and KMS-backed secret storage", "本地与 KMS-backed 密钥存储"),
          tone: "policy",
        },
      ],
    },
    focusPackages: [
      "@nebutra/auth",
      "@nebutra/identity",
      "@nebutra/permissions",
      "@nebutra/audit",
      "@nebutra/vault",
    ],
    evidence: [
      {
        value: "12",
        label: copy("auth tests", "auth 测试"),
        detail: copy("provider contract behavior", "供应商契约行为"),
      },
      {
        value: "8",
        label: copy("local AGENTS files", "本地 AGENTS 文件"),
        detail: copy("every IAM package declares ownership", "每个 IAM 包都有所有权说明"),
      },
      {
        value: "4",
        label: copy("tenant tests", "tenant 测试"),
        detail: copy("organization context and tenant policies", "组织上下文与租户策略"),
      },
    ],
    owns: [
      copy(
        "Provider abstraction for Clerk, Better Auth, NextAuth, and Supabase",
        "Clerk、Better Auth、NextAuth、Supabase 的供应商抽象",
      ),
      copy(
        "Permission gates, tenant context, audit events, and vault storage",
        "权限门禁、租户上下文、审计事件与 vault 存储",
      ),
      copy(
        "OAuth server and captcha boundaries for external identity flows",
        "外部身份流的 OAuth server 与 captcha 边界",
      ),
    ],
    boundaries: [
      copy(
        "UI checks call IAM contracts; they do not reimplement authorization.",
        "UI 检查调用 IAM 契约，不重新实现授权逻辑。",
      ),
      copy(
        "Secrets and audit behavior do not leak into app-local helpers.",
        "密钥与审计行为不泄漏到应用本地 helper。",
      ),
    ],
    proof: [
      copy(
        "auth provider abstraction tests and permission concept docs",
        "认证供应商抽象测试与权限概念文档",
      ),
      copy(
        "audit and tenant package boundaries in AGENTS.md contracts",
        "AGENTS.md 契约中的 audit 与 tenant 包边界",
      ),
    ],
    interfaces: ["@nebutra/auth", "@nebutra/identity", "@nebutra/permissions", "@nebutra/vault"],
  },
  {
    id: "design",
    anchorId: "capability-design",
    sourcePath: "packages/design",
    docsHref: createPublicDocsUrl("customization/theming"),
    icon: Palette,
    layout: "standard",
    sourceStats: {
      unitCount: 8,
      unitLabel: copy("packages", "包"),
      sourceFiles: 1139,
      testFiles: 27,
      readmes: 9,
    },
    title: copy("Design System Supply Chain", "设计系统供应链"),
    summary: copy(
      "Brand assets, DTCG tokens, Tailwind v4 theme exports, Geist icons, UI primitives, registry builds, and Figma/Penpot sync operate as a pipeline.",
      "品牌资产、DTCG tokens、Tailwind v4 theme 导出、Geist icons、UI primitives、registry build 与 Figma/Penpot sync 构成一条流水线。",
    ),
    designIntent: copy(
      "The card is a supply chain, not a component gallery: tokens move through theme, icons, UI, registry, docs, and finally apps.",
      "这张卡是供应链，不是组件画廊：tokens 经过 theme、icons、UI、registry、docs，最终进入应用。",
    ),
    signature: {
      value: "541",
      label: copy("packaged Geist icons", "已封装 Geist 图标"),
      detail: copy(
        "@nebutra/icons alone has 543 source files; the design lane is source-heavy by nature.",
        "@nebutra/icons 自身就有 543 个源码文件；设计系统天然是源码密集型。",
      ),
    },
    topology: {
      title: copy("Token-to-app supply chain", "Token 到应用的供应链"),
      caption: copy(
        "One fact, one owner: colors, icons, components, and registries flow through governed package boundaries.",
        "一个事实，一个 owner：颜色、图标、组件与 registry 经由受控包边界流动。",
      ),
      variant: "supply",
      nodes: [
        {
          label: "@nebutra/design-tokens",
          detail: copy("W3C DTCG source of truth", "W3C DTCG 单一事实源"),
          tone: "core",
        },
        {
          label: "@nebutra/tokens",
          detail: copy("CSS variables and ThemeProvider entry", "CSS 变量与 ThemeProvider 入口"),
        },
        {
          label: "@nebutra/theme",
          detail: copy(
            "Tailwind v4 @theme and data-theme selectors",
            "Tailwind v4 @theme 与 data-theme selectors",
          ),
        },
        {
          label: "@nebutra/icons",
          detail: copy("Geist icon React package", "Geist 图标 React 包"),
        },
        {
          label: "@nebutra/ui",
          detail: copy(
            "primitives, layouts, registry, governance tests",
            "primitives、layouts、registry、治理测试",
          ),
          tone: "port",
        },
      ],
    },
    focusPackages: [
      "@nebutra/design-tokens",
      "@nebutra/tokens",
      "@nebutra/theme",
      "@nebutra/icons",
      "@nebutra/ui",
    ],
    evidence: [
      {
        value: "548",
        label: copy("UI source files", "UI 源码文件"),
        detail: copy(
          "primitives, layout shells, registry scripts",
          "primitives、layout shells、registry scripts",
        ),
      },
      {
        value: "5",
        label: copy("design-sync tests", "design-sync 测试"),
        detail: copy(
          "Figma, Penpot, git-only, IO, detection",
          "Figma、Penpot、git-only、IO、detect",
        ),
      },
      {
        value: "6",
        label: copy("AGENTS contracts", "AGENTS 契约"),
        detail: copy(
          "token, theme, brand, icons, UI, sync ownership",
          "token、theme、brand、icons、UI、sync 所有权",
        ),
      },
    ],
    owns: [
      copy(
        "CSS variable tokens, oklch themes, brand primitives, and generated assets",
        "CSS 变量令牌、oklch 主题、品牌原语与生成资产",
      ),
      copy(
        "Reusable primitives, layout shells, registry manifests, and Storybook surfaces",
        "可复用 primitives、布局壳、registry manifest 与 Storybook 表面",
      ),
      copy(
        "Design sync scripts and policy tests for UI governance",
        "设计同步脚本与 UI 治理策略测试",
      ),
    ],
    boundaries: [
      copy(
        "Landing pages compose design packages; they do not fork primitives.",
        "落地页组合设计包，不 fork primitives。",
      ),
      copy(
        "Token changes flow through brand sync, not one-off hex overrides.",
        "令牌变更通过 brand sync 流动，而不是一次性 hex 覆盖。",
      ),
    ],
    proof: [
      copy(
        "React Doctor, Storybook registry generation, and token sync checks",
        "React Doctor、Storybook registry 生成与 token sync 检查",
      ),
      copy("design-docs component pages and governance tests", "design-docs 组件页与治理测试"),
    ],
    interfaces: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/theme", "@nebutra/icons"],
  },
  {
    id: "integrations",
    anchorId: "capability-integrations",
    sourcePath: "packages/integrations",
    docsHref: createPublicDocsUrl("background-jobs/overview"),
    icon: Workflow,
    layout: "wide",
    sourceStats: {
      unitCount: 17,
      unitLabel: copy("packages", "包"),
      sourceFiles: 103,
      testFiles: 34,
      readmes: 14,
    },
    title: copy("Integration Runtime Layer", "集成运行时层"),
    summary: copy(
      "Queues, cache, event bus, email, uploads, storage, search, SMS, notifications, webhooks, collaboration, and provider vaults share one adapter lane.",
      "队列、缓存、事件总线、邮件、上传、存储、搜索、短信、通知、Webhook、协作与供应商 vault 共享同一条适配器线路。",
    ),
    designIntent: copy(
      "The card is an integration bus: domain packages plug into ports while vendor details stay behind transport adapters.",
      "这张卡是集成总线：领域包接入 port，供应商细节留在传输适配器之后。",
    ),
    signature: {
      value: "17",
      label: copy("adapter packages", "适配器包"),
      detail: copy(
        "The most operational lane: queue has 10 tests, notifications 5, email/uploads/webhooks 3 each.",
        "最偏运行时的一条线：queue 有 10 个测试，notifications 5 个，email/uploads/webhooks 各 3 个。",
      ),
    },
    topology: {
      title: copy("Port-and-adapter bus", "端口与适配器总线"),
      caption: copy(
        "Transport details collect here so AI, commerce, and app packages call stable ports instead of vendor SDKs.",
        "传输细节集中在这里，使 AI、commerce 与 app 包调用稳定 port，而不是直接碰 vendor SDK。",
      ),
      variant: "bus",
      nodes: [
        {
          label: "@nebutra/queue",
          detail: copy("durable delivery and worker contracts", "持久投递与 worker 契约"),
          tone: "core",
        },
        {
          label: "@nebutra/cache",
          detail: copy("cache provider boundary", "缓存供应商边界"),
        },
        {
          label: "@nebutra/email",
          detail: copy(
            "Resend, Nodemailer, Console transports",
            "Resend、Nodemailer、Console 传输",
          ),
          tone: "adapter",
        },
        {
          label: "@nebutra/uploads",
          detail: copy("upload validation and storage handoff", "上传校验与 storage handoff"),
        },
        {
          label: "@nebutra/webhooks",
          detail: copy("signature verification and delivery", "签名校验与投递"),
          tone: "policy",
        },
        {
          label: "@nebutra/collab",
          detail: copy("tenant-partitioned CRDT rooms", "按租户分区的 CRDT rooms"),
        },
      ],
    },
    focusPackages: [
      "@nebutra/queue",
      "@nebutra/email",
      "@nebutra/notifications",
      "@nebutra/uploads",
      "@nebutra/webhooks",
      "@nebutra/collab",
    ],
    evidence: [
      {
        value: "10",
        label: copy("queue tests", "queue 测试"),
        detail: copy("delivery, retry, and worker behavior", "投递、重试与 worker 行为"),
      },
      {
        value: "14",
        label: copy("README surfaces", "README 面"),
        detail: copy("adapter usage stays package-local", "适配器用法保留在包级文档"),
      },
      {
        value: "11",
        label: copy("AGENTS contracts", "AGENTS 契约"),
        detail: copy("operational boundaries per integration", "每个 integration 的运行边界"),
      },
    ],
    owns: [
      copy(
        "Cache, queue, event-bus, saga, notifications, onboarding, and webhooks",
        "缓存、队列、事件总线、saga、通知、onboarding 与 webhooks",
      ),
      copy(
        "Search, storage, uploads, SMS, TTS, video compose, and integration vault",
        "搜索、存储、上传、短信、TTS、视频合成与 integration vault",
      ),
      copy(
        "Provider-facing adapters that keep apps from depending on vendor SDKs directly",
        "面向供应商的适配器，避免应用直接依赖 vendor SDK",
      ),
    ],
    boundaries: [
      copy(
        "Business workflows call integration ports; provider details stay here.",
        "业务工作流调用 integration port，供应商细节留在这里。",
      ),
      copy(
        "AI and commerce packages reuse adapters without owning transport code.",
        "AI 与 commerce 包复用适配器，但不拥有传输代码。",
      ),
    ],
    proof: [
      copy(
        "queue, cache, webhook, and search package tests",
        "queue、cache、webhook、search 包级测试",
      ),
      copy("background job docs and operational smoke checks", "后台任务文档与运行时 smoke checks"),
    ],
    interfaces: ["@nebutra/queue", "@nebutra/email", "@nebutra/uploads", "@nebutra/webhooks"],
  },
  {
    id: "commerce",
    anchorId: "capability-commerce",
    sourcePath: "packages/commerce",
    docsHref: createPublicDocsUrl("concepts/billing-model"),
    icon: CreditCard,
    layout: "standard",
    sourceStats: {
      unitCount: 9,
      unitLabel: copy("packages", "包"),
      sourceFiles: 86,
      testFiles: 21,
      readmes: 9,
    },
    title: copy("Commercial System of Record", "商业系统记录源"),
    summary: copy(
      "Access gates, billing providers, subscriptions, usage, credits, metering, licenses, contracts, legal content, marketing, and waitlists form the commercial domain.",
      "访问门禁、计费供应商、订阅、用量、credits、metering、license、contracts、legal 内容、marketing 与 waitlist 构成商业域。",
    ),
    designIntent: copy(
      "The card is a ledger: controlled access, entitlement, invoice, usage, license, and legal facts should reconcile from one commercial record.",
      "这张卡按账本设计：访问、权益、发票、用量、许可证与法务事实应该从同一个商业记录源对齐。",
    ),
    signature: {
      value: "9",
      label: copy("commercial packages", "商业包"),
      detail: copy(
        "Billing is the largest package, but access-gate, blog, license, legal, metering, and waitlist keep adjacent commercial facts separate.",
        "billing 最大，但 access-gate、blog、license、legal、metering 与 waitlist 保持相邻商业事实分离。",
      ),
    },
    topology: {
      title: copy("Commercial ledger lanes", "商业账本分道"),
      caption: copy(
        "Each lane owns a different fact: access, invoice, usage, license, legal, or acquisition.",
        "每条 lane 拥有不同事实：访问、发票、用量、许可证、法务或获客。",
      ),
      variant: "ledger",
      nodes: [
        {
          label: "@nebutra/access-gate",
          detail: copy(
            "invite lifecycle for controlled SaaS access",
            "受控 SaaS 访问的邀请生命周期",
          ),
          tone: "policy",
        },
        {
          label: "@nebutra/billing",
          detail: copy(
            "Stripe, ChinaPay, Polar, LemonSqueezy, credits",
            "Stripe、ChinaPay、Polar、LemonSqueezy、credits",
          ),
          tone: "core",
        },
        {
          label: "@nebutra/metering",
          detail: copy("usage records and billing handoff", "用量记录与 billing handoff"),
        },
        {
          label: "@nebutra/license",
          detail: copy("issuance, validation, lifecycle events", "签发、校验、生命周期事件"),
        },
        {
          label: "@nebutra/legal",
          detail: copy("policy content and compliance surfaces", "政策内容与合规表面"),
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "@nebutra/access-gate",
      "@nebutra/billing",
      "@nebutra/metering",
      "@nebutra/license",
      "@nebutra/legal",
    ],
    evidence: [
      {
        value: "6",
        label: copy("billing tests", "billing 测试"),
        detail: copy(
          "checkout factory, readiness, credit webhook, metering",
          "checkout factory、readiness、credit webhook、metering",
        ),
      },
      {
        value: "4",
        label: copy("metering tests", "metering 测试"),
        detail: copy("usage accounting boundary", "用量记账边界"),
      },
      {
        value: "3",
        label: copy("license tests", "license 测试"),
        detail: copy("issuance and validation lifecycle", "签发与校验生命周期"),
      },
    ],
    owns: [
      copy(
        "Billing provider adapters, subscription lifecycle, and metering contracts",
        "计费供应商适配器、订阅生命周期与计量契约",
      ),
      copy(
        "Access-gate invites, licensing, legal content, marketing primitives, and waitlist",
        "访问门禁邀请、许可证、法务内容、营销原语与 waitlist",
      ),
      copy(
        "Commercial boundaries that apps expose but do not redefine",
        "应用可暴露但不可重新定义的商业边界",
      ),
    ],
    boundaries: [
      copy(
        "Landing copy can link to commerce contracts; it does not own pricing behavior.",
        "落地页文案可链接商业契约，但不拥有计价行为。",
      ),
      copy(
        "Auth and billing connect through tenant identifiers, not shared UI state.",
        "认证与计费通过租户标识连接，而不是共享 UI 状态。",
      ),
    ],
    proof: [
      copy(
        "access-gate lifecycle tests and package status docs",
        "access-gate 生命周期测试与 package status 文档",
      ),
      copy(
        "billing model docs and release-surface verification",
        "billing model 文档与 release-surface 校验",
      ),
    ],
    interfaces: [
      "@nebutra/billing",
      "@nebutra/metering",
      "@nebutra/license",
      "@nebutra/access-gate",
    ],
  },
  {
    id: "gateway",
    anchorId: "capability-gateway",
    sourcePath: "backends/gateway",
    docsHref: createPublicDocsUrl("api-reference/overview"),
    icon: Server,
    layout: "full",
    sourceStats: {
      unitCount: 1,
      unitLabel: copy("backend", "后端"),
      sourceFiles: 63,
      testFiles: 19,
      readmes: 0,
    },
    title: copy("Typed API Gateway Boundary", "类型化 API 网关边界"),
    summary: copy(
      "The Hono backend owns request context, security middleware, tenant extraction, idempotency, usage metering, route groups, OpenAPI generation, and async Inngest jobs.",
      "Hono 后端负责 request context、安全中间件、租户提取、幂等、用量计量、路由组、OpenAPI 生成与异步 Inngest jobs。",
    ),
    designIntent: copy(
      "The card is a request path, because gateway value is visible only when middleware order, route contracts, and async jobs are shown together.",
      "这张卡按请求路径设计，因为 gateway 的价值只有把 middleware 顺序、route 契约与异步 jobs 放在一起才看得清。",
    ),
    signature: {
      value: "19",
      label: copy("gateway tests", "gateway 测试"),
      detail: copy(
        "Billing idempotency, RBAC, middleware, queue delivery, events, health, notifications, and AI gateway routes are covered.",
        "覆盖 billing 幂等、RBAC、middleware、queue delivery、events、health、notifications 与 AI gateway routes。",
      ),
    },
    topology: {
      title: copy("Request-to-contract path", "请求到契约路径"),
      caption: copy(
        "Route code is the visible part; the hard boundary is the ordered policy chain before and around it.",
        "route code 只是可见部分；真正的边界是路由前后按序执行的策略链。",
      ),
      variant: "request",
      nodes: [
        {
          label: "requestContext",
          detail: copy("trace IDs, correlation, dependency injection", "trace ID、关联、依赖注入"),
          tone: "core",
        },
        {
          label: "security + rateLimit",
          detail: copy("headers, dynamic CORS, token buckets", "安全头、动态 CORS、token bucket"),
          tone: "policy",
        },
        {
          label: "tenant + idempotency",
          detail: copy("tenant extraction, mutation dedupe", "租户提取、mutation 去重"),
          tone: "policy",
        },
        {
          label: "route groups",
          detail: copy(
            "admin, ai, billing, events, legal, webhooks",
            "admin、ai、billing、events、legal、webhooks",
          ),
        },
        {
          label: "OpenAPI + Inngest",
          detail: copy("typed clients and background sync jobs", "类型客户端与后台同步 jobs"),
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "middlewares/rateLimit",
      "middlewares/tenantContext",
      "routes/ai",
      "routes/billing",
      "inngest/functions",
    ],
    evidence: [
      {
        value: "63",
        label: copy("source files", "源码文件"),
        detail: copy(
          "routes, middleware, services, clients, adapters",
          "routes、middleware、services、clients、adapters",
        ),
      },
      {
        value: "4",
        label: copy("async jobs", "异步 jobs"),
        detail: copy(
          "billing sync, GDPR deletion, tenant provisioning, user sync",
          "billing sync、GDPR deletion、tenant provisioning、user sync",
        ),
      },
      {
        value: "OpenAPI",
        label: copy("contract output", "契约输出"),
        detail: copy("generate:spec and typed API clients", "generate:spec 与 typed API clients"),
      },
    ],
    owns: [
      copy(
        "BFF routing, OpenAPI generation, middleware order, and tenancy extraction",
        "BFF 路由、OpenAPI 生成、中间件顺序与租户提取",
      ),
      copy(
        "Gateway-level rate limiting, idempotency, audit logging, and versioning",
        "网关级限流、幂等、审计日志与版本化",
      ),
      copy(
        "Typed API contracts consumed by web and generated clients",
        "web 与生成客户端消费的类型化 API 契约",
      ),
    ],
    boundaries: [
      copy(
        "Backend policy lives in middleware, not duplicated in each route.",
        "后端策略位于 middleware，不在每条 route 中重复。",
      ),
      copy(
        "Apps do not bypass the gateway for tenant-sensitive operations.",
        "应用不绕过 gateway 执行租户敏感操作。",
      ),
    ],
    proof: [
      copy(
        "OpenAPI generation, gateway route tests, and release verification scripts",
        "OpenAPI 生成、gateway route 测试与 release 验证脚本",
      ),
      copy(
        "api-reference docs and dashboard typed-client integration",
        "api-reference 文档与 dashboard typed-client 集成",
      ),
    ],
    interfaces: ["@nebutra/gateway", "openapi.json", "typed-api-client", "Inngest functions"],
  },
];
