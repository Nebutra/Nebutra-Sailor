import type { ReactNode } from "react";
import { type FileNode, TREE_DATA } from "@/lib/constants/landing-data";

type FeatureKind = "capability" | "group" | "package";

export type PackageFeatureEntry = {
  children: string[];
  description: string;
  group: string;
  groupLabel: string;
  icon?: ReactNode;
  kind: FeatureKind;
  label: string;
  path: string;
  slug: string;
};

export type SerializablePackageFeatureEntry = Omit<PackageFeatureEntry, "icon">;

const GROUP_LABELS: Record<string, { en: string; zh: string }> = {
  ai: { en: "AI runtime", zh: "AI 运行时" },
  commerce: { en: "commerce", zh: "商业化" },
  design: { en: "design system", zh: "设计系统" },
  gateway: { en: "gateway", zh: "网关" },
  iam: { en: "identity and trust", zh: "身份与信任" },
  integrations: { en: "integrations", zh: "集成" },
  ops: { en: "operations", zh: "运维" },
  platform: { en: "platform", zh: "平台" },
};

const ZH_GROUP_SUMMARIES: Record<string, string> = {
  ai: "把智能体循环、RAG、工具协议、沙箱执行和多模态流水线收束到应用外部。",
  commerce: "把访问、计费、合同、license、营销和用量计量放在同一商业边界内。",
  design: "把品牌、tokens、icons、theme、UI primitive 和设计同步组织成一条供应链。",
  gateway: "把 BFF、鉴权、租户、限流、OpenAPI 和路由契约放在请求入口处。",
  iam: "把认证、身份、权限、租户、审计和密钥行为收束到同一个信任边界。",
  integrations: "把缓存、队列、搜索、消息、存储、上传和 webhook 作为可替换连接层。",
  ops: "把 CLI、预设、CMS、Supabase 和合规支持放在发布与运维边界。",
  platform: "把数据库、配置、健康检查、仓储、trace、限流和租户锁放在最低共享层。",
};

function trimDescription(description?: string) {
  return (description ?? "").replace(/^-\s*/, "").trim();
}

function featureSlugForNode(node: FileNode): string | null {
  if (node.path?.startsWith("packages/")) {
    const [, group, name] = node.path.split("/");
    return name ?? group ?? null;
  }

  if (node.featureAnchor) {
    return node.featureAnchor.replace(/^capability-/, "");
  }

  return null;
}

function featureKindForNode(node: FileNode): FeatureKind {
  if (node.path?.startsWith("packages/")) {
    return node.path.split("/").length === 2 ? "group" : "package";
  }

  return "capability";
}

function featureGroupForNode(node: FileNode, slug: string): string {
  if (node.path?.startsWith("packages/")) {
    return node.path.split("/")[1] ?? slug;
  }

  return slug;
}

function flattenFeatureNodes(nodes: FileNode[], entries: PackageFeatureEntry[] = []) {
  for (const node of nodes) {
    const slug = featureSlugForNode(node);
    if (slug && node.path) {
      const group = featureGroupForNode(node, slug);
      entries.push({
        children: node.children?.map((child) => child.label) ?? [],
        description: trimDescription(node.description),
        group,
        groupLabel: GROUP_LABELS[group]?.en ?? group,
        icon: node.icon,
        kind: featureKindForNode(node),
        label: node.label,
        path: node.path,
        slug,
      });
    }

    if (node.children?.length) {
      flattenFeatureNodes(node.children, entries);
    }
  }

  return entries;
}

export const PACKAGE_FEATURE_ENTRIES = flattenFeatureNodes(TREE_DATA);

export function toSerializablePackageFeatureEntry(
  entry: PackageFeatureEntry,
): SerializablePackageFeatureEntry {
  const { icon: _icon, ...serializableEntry } = entry;
  return serializableEntry;
}

export function getPackageFeatureEntry(slug: string) {
  return PACKAGE_FEATURE_ENTRIES.find((entry) => entry.slug === slug);
}

export function getRelatedEntries(entry: PackageFeatureEntry, limit = 4): PackageFeatureEntry[] {
  const candidates = PACKAGE_FEATURE_ENTRIES.filter(
    (candidate) =>
      candidate.group === entry.group &&
      candidate.kind === "package" &&
      candidate.slug !== entry.slug,
  );

  if (candidates.length <= limit) return candidates;

  // Stable selection: pick the first N in the natural source order.
  return candidates.slice(0, limit);
}

export function getGroupLabel(group: string, locale: "en" | "zh"): string {
  return GROUP_LABELS[group]?.[locale] ?? group;
}

export function getPackageFeatureHref(locale: string, node: FileNode) {
  const slug = featureSlugForNode(node);
  return slug ? `/${locale}/features/${slug}` : null;
}

/**
 * Per-package summary copy. When an entry is in this map, the bilingual
 * string replaces the boilerplate fallback used by {@link getFeatureSummary}.
 *
 * Style rules:
 *  • One sentence, ≤ 200 chars in EN, ≤ 80 CJK chars in ZH.
 *  • Lead with the concrete capability ("Issues short-lived JWTs…"), not
 *    "a package that does X".
 *  • Name the provider(s) when the package is multi-provider
 *    ("Stripe + Polar + LemonSqueezy + manual"), the boundary tech when
 *    relevant ("AsyncLocalStorage + RLS").
 *  • Avoid generic adjectives ("powerful", "modern", "robust").
 */
export const PACKAGE_DESCRIPTIONS: Record<string, { en: string; zh: string }> = {
  // ─── iam ────────────────────────────────────────────────────────────────
  audit: {
    en: "Hash-chained, SHA-256 append-only audit log for actor/tenant actions. SOC 2-grade tamper detection, streaming export, and replay-safe queries.",
    zh: "面向 actor/tenant 行动的 hash-chain SHA-256 仅追加审计日志，SOC 2 级防篡改，支持流式导出与可回放查询。",
  },
  auth: {
    en: "Multi-provider auth — Clerk, Better Auth, or NextAuth. Same React surface, swap providers via preset config. MFA-enforced, session HMAC-signed.",
    zh: "多 provider 鉴权 — Clerk / Better Auth / NextAuth，preset 一行切换；React 接口统一，强制 MFA，session HMAC 签名。",
  },
  captcha: {
    en: "Bot challenge with Cloudflare Turnstile / hCaptcha / reCAPTCHA behind one verify() call. Server-side scoring, per-route enable, no third-party tracker on the client.",
    zh: "一个 verify() 后端接口适配 Cloudflare Turnstile / hCaptcha / reCAPTCHA；分路启用，得分服务端判定，前端无第三方追踪。",
  },
  identity: {
    en: "Shared actor primitive — usr_/svc_/api_ ID space, role/membership lookup, tenant attachment. The single identity object every iam package reads.",
    zh: "统一 actor 原语 — usr_/svc_/api_ ID 空间，角色/成员关系，租户绑定；所有 iam 子包都从同一个 identity 对象读取上下文。",
  },
  "oauth-server": {
    en: "Stand up your own OAuth 2.1 / OIDC provider. Authorization code + PKCE, refresh rotation, third-party app consent, JWT issuance with 1h default TTL.",
    zh: "自建 OAuth 2.1 / OIDC provider；授权码 + PKCE、refresh 轮换、三方应用同意、JWT 默认 1h TTL。",
  },
  permissions: {
    en: "RBAC + ABAC engine — CASL for in-process checks, OpenFGA for Zanzibar-style relationships. defineAbility() server, <Can /> in React.",
    zh: "RBAC + ABAC 引擎 — CASL 处理进程内 check，OpenFGA 处理 Zanzibar 关系图；服务端 defineAbility()，React 用 <Can /> 包裹。",
  },
  tenant: {
    en: "Request-scoped tenant context via AsyncLocalStorage, with Prisma RLS bridge. One tenantId resolves through middleware and propagates the whole stack.",
    zh: "基于 AsyncLocalStorage 的请求级租户上下文 + Prisma RLS 桥接；中间件解析一次 tenantId，整条调用栈自动透传。",
  },
  vault: {
    en: "Application-layer envelope encryption for customer secrets — AES-256-GCM, per-tenant DEK, KMS-wrapped. Audit-logged read/decrypt, zero plaintext at rest.",
    zh: "客户密钥应用层信封加密 — AES-256-GCM、按租户 DEK、KMS 包装；解密带审计记录,落盘零明文。",
  },

  // ─── commerce ───────────────────────────────────────────────────────────
  billing: {
    en: "Multi-provider billing — Stripe, Polar, LemonSqueezy, ChinaPay, manual. Same Subscription / Invoice / Customer surface for every backend.",
    zh: "多 provider 计费 — Stripe / Polar / LemonSqueezy / ChinaPay / Manual；Subscription / Invoice / Customer 接口对所有后端保持一致。",
  },
  contracts: {
    en: "Cross-package event, identity, billing, and notification type contracts. The shared TypeScript boundary that lets commerce talk to iam, queue, webhooks.",
    zh: "事件 / 身份 / 计费 / 通知的跨包类型契约；commerce 与 iam、queue、webhooks 之间通信的共享 TypeScript 边界。",
  },
  license: {
    en: "License key generation, validation, and revocation. Ed25519-signed, offline-verifiable, with seat-count and expiry enforcement.",
    zh: "License key 生成、校验、吊销;Ed25519 签名、可离线验证、内建席位与有效期约束。",
  },
  marketing: {
    en: "Shared marketing-site primitives — hero blocks, pricing tables, FAQ accordions — reused by landing-page and tsekaluk-dev with the brand tokens already wired.",
    zh: "营销站点共用原语 — Hero、Pricing、FAQ — landing-page 与 tsekaluk-dev 复用，brand tokens 已接入。",
  },
  metering: {
    en: "Usage metering on ClickHouse — sub-second ingestion, per-tenant quota lookup, ready to feed Stripe metered billing or in-product limits.",
    zh: "基于 ClickHouse 的用量计量 — 秒级写入、按租户查 quota，可直接接 Stripe 计量计费或产品内额度。",
  },
  waitlist: {
    en: "Pre-launch waitlist for the foundation tier — invite codes, position queues, referral counts, and operator dashboards.",
    zh: "面向 foundation tier 的预启动 waitlist — 邀请码、排队位置、推荐计数、运营 dashboard。",
  },

  // ─── integrations ───────────────────────────────────────────────────────
  cache: {
    en: "Tag-based cache with Redis, Upstash, or in-memory backend. Same get/set/invalidate(tags) for serverless and self-hosted.",
    zh: "基于 tag 的缓存 — Redis / Upstash / 内存 三种 backend；serverless 与自托管复用同一 get/set/invalidate(tags) 接口。",
  },
  queue: {
    en: "Provider-agnostic queue — Upstash QStash (serverless) or BullMQ (self-host). Customers swap by env; application code stays the same.",
    zh: "Provider 无关的消息队列 — Upstash QStash（serverless）/ BullMQ（自托管）；环境变量切换 provider，业务代码不动。",
  },
  search: {
    en: "Full-text search — Meilisearch, Typesense, or Algolia behind one indexer + searcher pair. Per-tenant filters baked in.",
    zh: "全文搜索 — Meilisearch / Typesense / Algolia 三选一，统一 indexer + searcher；按租户过滤内建。",
  },
  notifications: {
    en: "Multi-channel notifications — in-app, email, push, SMS, chat — with Novu + direct dispatchers and recipient-preference resolution.",
    zh: "多通道通知 — in_app / email / push / sms / chat — Novu + 直发通道并存,按收件人偏好路由。",
  },
  webhooks: {
    en: "Outbound webhook delivery — Svix or custom, signed payloads, retry with exponential backoff, subscriber portal for self-serve.",
    zh: "出站 webhook 投递 — Svix 或自实现,负载签名、指数退避重试、用户自助订阅 portal。",
  },
  uploads: {
    en: "Large-file uploads — S3 / R2 multipart, Tus resumable, presigned URLs. Picks the right strategy by file size automatically.",
    zh: "大文件上传 — S3 / R2 多段、Tus 断点续传、Presigned URL；按文件大小自动选择策略。",
  },
  storage: {
    en: "Lower-tier object storage helpers — list, copy, ACL, signed reads. Sits below @nebutra/uploads when you don't need multipart logic.",
    zh: "下层对象存储辅助 — list / copy / ACL / signed read;不需要多段逻辑时替代 @nebutra/uploads。",
  },
  email: {
    en: "Render React Email templates, dispatch through Resend / SES / SMTP. One sendEmail(template, props, recipient) for every transactional flow.",
    zh: "渲染 React Email 模板,经 Resend / SES / SMTP 投递;所有交易邮件统一 sendEmail(template, props, recipient)。",
  },
  saga: {
    en: "Distributed-transaction primitives — compensating actions, retry/rollback hooks, idempotency keys. WIP; ships behind a flag.",
    zh: "分布式事务原语 — 补偿动作、重试/回滚 hook、幂等 key;开发中,默认 flag 关闭。",
  },
  "event-bus": {
    en: "In-process pub/sub with cross-app fanout. Used by audit, billing, and notifications to react to commerce events without circular imports.",
    zh: "进程内 pub/sub + 跨应用 fanout;audit / billing / notifications 借此响应 commerce 事件,避免循环依赖。",
  },
  sms: {
    en: "Transactional SMS — Twilio, AWS SNS, China Aliyun — same send(to, template) surface, automatic local-prefix routing.",
    zh: "事务 SMS — Twilio / AWS SNS / 阿里云;统一 send(to, template),按本地号段自动选 provider。",
  },
  tts: {
    en: "Text-to-speech with OpenAI / ElevenLabs / Azure backends. Streamed audio, voice presets, per-tenant rate-limit budgets.",
    zh: "TTS 三 provider — OpenAI / ElevenLabs / Azure;流式音频、voice preset、按租户限速。",
  },
  "video-compose": {
    en: "Programmatic video composition via Remotion. Render reels, social cards, and on-brand product GIFs from a JSON spec.",
    zh: "基于 Remotion 的程序化视频合成 — 由 JSON spec 渲染短片、社媒卡片、品牌 GIF。",
  },
  collab: {
    en: "Realtime co-editing primitives — Yjs CRDT, WebSocket transport, presence cursors. The piece every multi-user app eventually needs.",
    zh: "实时协同原语 — Yjs CRDT、WebSocket 传输、presence 光标;多人应用最终都会用上。",
  },
  onboarding: {
    en: "Multi-step product onboarding with persistence — checklist state per user, branching flows, A/B-friendly step gating.",
    zh: "可持久化的多步 onboarding — 每用户进度、分支流、可做 A/B 步骤门控。",
  },
  "admin-tooling": {
    en: "Self-serve operator dashboards — tenants, billing overrides, feature-flag flips — all gated by @nebutra/permissions.",
    zh: "自助式运营 dashboard — 租户、计费覆写、feature flag 切换 — 由 @nebutra/permissions 统一鉴权。",
  },
  "integration-vault": {
    en: "Per-tenant credential store for OAuth integrations — Stripe-connected, Gmail OAuth, Notion API. KMS-wrapped, refresh-rotated.",
    zh: "按租户的 OAuth 凭证库 — Stripe Connect、Gmail OAuth、Notion API;KMS 包装,自动 refresh 轮换。",
  },

  // ─── platform ───────────────────────────────────────────────────────────
  db: {
    en: "Typed Prisma client wrapper — extension-aware, RLS-friendly, with per-tenant connection pinning when the deployment splits writes from reads.",
    zh: "类型化 Prisma client 包装 — extension 友好、RLS 兼容、读写分离时按租户绑定连接。",
  },
  config: {
    en: "Typed environment + runtime config — Zod schemas at boot, no scattered process.env reads, fail-fast on missing keys.",
    zh: "类型化环境与运行时配置 — boot 时 Zod 校验,杜绝散落的 process.env 引用,缺 key 立刻失败。",
  },
  logger: {
    en: "Structured logging with pino + Sentry transport. One log object per request, breadcrumbs forwarded, PII-stripper plugged into the standard sink.",
    zh: "结构化日志 — pino + Sentry transport;每请求一个 log 对象、breadcrumb 自动联动、PII 自动剥离。",
  },
  health: {
    en: "Liveness + readiness probes for every backend service. Aggregates downstream deps (db, queue, search) into one /healthz response.",
    zh: "所有后端服务的存活 + 就绪探针;把 db / queue / search 等下游聚合进同一份 /healthz 响应。",
  },
  errors: {
    en: "Typed application error taxonomy — UserError, AuthError, RateLimitError. Maps cleanly to HTTP, to logs, to Sentry, to the in-product toast.",
    zh: "应用错误类型分类 — UserError / AuthError / RateLimitError;到 HTTP、日志、Sentry、产品内 toast 各层映射一致。",
  },
  "gateway-core": {
    en: "BFF primitives shared by backends/gateway and edge handlers — middleware chains, route matchers, header normalization, request-id propagation.",
    zh: "BFF 原语 — backends/gateway 与 edge handler 共用;中间件链、路由匹配、header 规整、request-id 透传。",
  },
  "rate-limit": {
    en: "Token-bucket rate limiter — Upstash Redis or in-memory. Per-route + per-tenant policy, 429 with retry-after, decision logged for audit.",
    zh: "令牌桶限速器 — Upstash Redis / 内存;按路由 + 按租户配置,返回 429 + retry-after,决策可审计。",
  },
  repositories: {
    en: "Repository-pattern primitives — findAll, findById, create, update, delete behind one Repository<T>. Swap Prisma for any backend without changing callers.",
    zh: "仓储模式原语 — findAll / findById / create / update / delete 统一 Repository<T>;换 backend 不动调用方。",
  },
  "tenant-store": {
    en: "Tenant-bound key/value cache for lookups too hot for the database. Auto-invalidates on tenant settings change.",
    zh: "按租户的 KV 缓存 — 缓存数据库查询太热的 lookup;租户设置变更自动失效。",
  },
  "trace-store": {
    en: "OpenTelemetry-compatible span store and query layer. Lets agents trace a tool call across iam, billing, and webhooks.",
    zh: "OpenTelemetry 兼容的 span 存储与查询层;让 agent 能跨 iam / billing / webhooks 追踪一个 tool 调用。",
  },
  status: {
    en: "Public status page primitives — incident timeline, component graph, subscriber emails. Renders both /status pages and embeddable widgets.",
    zh: "公开状态页原语 — incident 时间线、组件图、订阅邮件;支持完整状态页与可嵌入 widget。",
  },
  alerting: {
    en: "Alert rules + delivery on top of @nebutra/metering. Threshold/anomaly detection, route to PagerDuty, Discord, or in-product banners.",
    zh: "基于 @nebutra/metering 的告警规则与投递 — 阈值/异常检测,路由到 PagerDuty / Discord / 产品内 banner。",
  },
  analytics: {
    en: "First-party product analytics on ClickHouse — event ingest, funnel queries, no third-party loader on the marketing site.",
    zh: "基于 ClickHouse 的一方产品分析 — 事件写入、漏斗查询;营销站点不加载任何三方脚本。",
  },
  "feature-flags": {
    en: "Server + client flag evaluator with GrowthBook / Statsig / custom. Per-tenant overrides, sticky bucketing, exported as React hooks.",
    zh: "服务端 + 客户端 flag 求值器 — GrowthBook / Statsig / 自建;按租户覆写、sticky 分桶、暴露为 React hook。",
  },
  i18n: {
    en: "next-intl bridge — runtime locale, ICU plural, currency/date formatters, sided JSON bundles per route. Build-time guarantees on key drift.",
    zh: "next-intl 桥接 — 运行时 locale、ICU 复数、货币/日期 formatter、按路由分包;构建期防止 key 漂移。",
  },
  "graph-model": {
    en: "Property-graph model layer for knowledge / org / asset graphs. Edges/nodes typed by Zod, persisted via Prisma or Neo4j adapter.",
    zh: "属性图模型层 — 用于知识 / 组织 / 资产图;边与点用 Zod 定型,可走 Prisma 或 Neo4j adapter。",
  },
  "provider-factory": {
    en: "Auto-detecting provider factory pattern — env vars choose between queue / search / notifications backends with a single getX() call.",
    zh: "自动探测的 provider 工厂模式 — 由环境变量决定 queue / search / notifications backend,一个 getX() 即可。",
  },
  "capability-kit": {
    en: "Composable capability primitives — pricing tier ↔ feature flag ↔ quota ↔ UI gating wired into one declarative manifest.",
    zh: "可组合 capability 原语 — pricing tier ↔ feature flag ↔ quota ↔ UI gating,以单一声明式 manifest 串联。",
  },

  // ─── design ─────────────────────────────────────────────────────────────
  brand: {
    en: "Brand primitives — color definitions, gradient tokens, motion language. Source data; not imported at runtime by apps.",
    zh: "品牌原语 — 颜色定义、渐变 token、动效语言;为源数据,不被 app 运行时直接引用。",
  },
  tokens: {
    en: "Runtime CSS variables + ThemeProvider — single source of truth for colors, spacing, radii in every app. @import in your globals.css.",
    zh: "运行时 CSS 变量 + ThemeProvider — 所有 app 颜色 / 间距 / radius 的单一数据源;在 globals.css 中 @import。",
  },
  "design-tokens": {
    en: "W3C DTCG $value/$type token files + Style Dictionary 4 pipeline. Output CSS variables, JS modules, Figma sync feeds.",
    zh: "W3C DTCG $value/$type 规范的 token 文件 + Style Dictionary 4 流水线;输出 CSS 变量、JS module、Figma 同步源。",
  },
  icons: {
    en: "541 Geist icons as tree-shakable TSX components. Single-weight, optical-sized, drop-in for Vercel / v0 visual parity.",
    zh: "541 个 Geist icon,以 tree-shakable TSX 组件分发;单字重 + 光学尺寸,与 Vercel / v0 视觉对齐。",
  },
  theme: {
    en: "CSS-only multi-theme engine — six oklch presets toggled by data-theme attribute. No JavaScript on the critical path.",
    zh: "纯 CSS 多 theme 引擎 — 六套 oklch preset,通过 data-theme 切换;关键路径无 JS。",
  },
  ui: {
    en: "Primary component library — Lobe UI re-exports + custom primitives + layout + framer-motion. The one place to import from.",
    zh: "主组件库 — Lobe UI 重导出 + 自研原语 + layout + framer-motion;唯一推荐 import 来源。",
  },
  "design-sync": {
    en: "Provider-agnostic design-tool sync — Figma, Penpot, or git-only. Pulls design-tool tokens to repo and pushes repo to design tool, safely dry-run by default.",
    zh: "Provider 无关的设计工具同步 — Figma / Penpot / 仅 Git;双向同步 token,默认 dry-run 安全。",
  },

  // ─── ai ─────────────────────────────────────────────────────────────────
  agents: {
    en: "Multi-step agent runtime — Vercel AI SDK foundation, tool registry, streaming UI, MCP integration. The skeleton for every Sailor agentic feature.",
    zh: "多步骤 agent 运行时 — Vercel AI SDK 为底、tool registry、流式 UI、MCP 接入;所有 Sailor agentic 能力的脚手架。",
  },
  "agent-runtime": {
    en: "Lower-level agent execution — message reducer, tool invocation, streaming state machine. The kernel @nebutra/agents wraps.",
    zh: "更底层的 agent 执行 — message reducer、tool 调用、流式状态机;@nebutra/agents 在其之上封装。",
  },
  "ai-primitives": {
    en: "Shared helpers used across all AI packages — token counting, prompt templating, stream-parser, retry-with-backoff. No provider dependency.",
    zh: "所有 AI 包共享的辅助 — token 计数、prompt 模板、stream 解析、退避重试;不依赖具体 provider。",
  },
  "ai-providers": {
    en: "Provider metadata — pricing per million tokens, context windows, modalities. Drives model selection and cost estimates.",
    zh: "Provider 元数据 — 每百万 token 单价、context window、模态;驱动模型选择与成本估算。",
  },
  mcp: {
    en: "Model Context Protocol server primitives — register tools, expose resources, stream subscriptions. Run inside Sailor or stand-alone.",
    zh: "Model Context Protocol server 原语 — 注册 tool、暴露 resource、流式订阅;可作为 Sailor 内嵌或独立部署。",
  },
  "llm-gateway": {
    en: "Provider-routing edge for LLM calls — fallback chains, per-tenant quota, response caching, usage metering wired in.",
    zh: "LLM 调用的 provider 路由层 — 回退链、按租户 quota、响应缓存、用量计量统一接入。",
  },
  "knowledge-rag": {
    en: "Retrieval-augmented generation pipeline — chunk, embed, store, retrieve, rerank — pluggable per vector store.",
    zh: "检索增强生成流水线 — chunk → embed → store → retrieve → rerank;vector store 可插拔。",
  },
  "knowledge-base": {
    en: "Document store + indexer for RAG. Watches sources (S3, Notion, GitHub), schedules re-embed, surfaces freshness in the agent answer.",
    zh: "面向 RAG 的文档库 + indexer;监听 S3 / Notion / GitHub 源、调度重嵌入、把新鲜度暴露给 agent。",
  },
  "knowledge-graph": {
    en: 'Entity + relationship store on top of @nebutra/graph-model. Lets agents traverse "customer → invoice → product" without a SQL detour.',
    zh: '基于 @nebutra/graph-model 的实体 + 关系存储;agent 可直接走 "客户 → 发票 → 产品",无需绕 SQL。',
  },
  "tool-registry": {
    en: "Runtime tool catalog — schemas, descriptions, safety levels. Hot-swap tools between agents without re-deploying.",
    zh: "运行时 tool catalog — schema、描述、安全等级;在 agent 之间热插拔,无需重新部署。",
  },
  "code-execution": {
    en: "Sandboxed code execution for agents — JS / Python / shell — short-lived containers, network-isolated, capability-gated by @nebutra/permissions.",
    zh: "面向 agent 的沙箱代码执行 — JS / Python / shell;短生命周期容器、网络隔离、由 @nebutra/permissions 限权。",
  },
  "sandbox-runtime": {
    en: "Vercel Sandbox + Lambda + local runner adapter under one execute() call. Picks the runner from a policy rule list.",
    zh: "Vercel Sandbox + Lambda + 本地 runner 适配器;execute() 统一入口,按策略规则选择。",
  },
  "browser-control": {
    en: "Headless browser drive for agents — Vercel Agent Browser primary, Playwright fallback. Screenshot, click, type, evaluate.",
    zh: "面向 agent 的无头浏览器驱动 — Vercel Agent Browser 优先,Playwright 兜底;截图 / 点击 / 输入 / 求值。",
  },
  "generation-context": {
    en: "Token-budgeted context window manager — system prompt, RAG, user history, scratchpad. Picks what to drop when the window fills.",
    zh: "Token 预算的上下文窗口管理 — 系统 prompt、RAG、用户历史、scratchpad;窗口爆掉时决定淘汰策略。",
  },
  "local-embedding": {
    en: "On-device embedding via ONNX / WebGPU. Avoids the round-trip when the embed is short, private, or rate-limited at the provider.",
    zh: "基于 ONNX / WebGPU 的端侧 embedding;短文本、隐私敏感、provider 限流时省去往返。",
  },
  "execution-policy": {
    en: "Policy rules that route agent tasks to compute backends — render → Vercel Sandbox, long → Lambda, internal → local-runner.",
    zh: "决定 agent 任务路由到何处的策略规则 — render → Vercel Sandbox / 长任务 → Lambda / 内部 → local-runner。",
  },
  "code-index": {
    en: 'Repository code index for agents — symbol graph, embedding, file watcher. Lets the agent answer "where is X defined" without grep\'ing.',
    zh: '面向 agent 的代码仓索引 — symbol graph、embedding、文件 watcher;agent 无需 grep 即可回答 "X 在哪定义"。',
  },
  "voice-realtime": {
    en: "Realtime voice loop — input ASR, model stream, output TTS — sub-300ms end-to-end. Bridges OpenAI Realtime + Deepgram + ElevenLabs.",
    zh: "实时语音回环 — 输入 ASR、模型流式、输出 TTS — 端到端 < 300ms;桥接 OpenAI Realtime + Deepgram + ElevenLabs。",
  },
  "image-pipeline": {
    en: "Image generation + transform pipeline — provider-routed, watermark + safety filter, cached output, per-tenant quota.",
    zh: "图像生成 + 变换流水线 — provider 路由、水印 + 安全过滤、输出缓存、按租户 quota。",
  },
  "audio-pipeline": {
    en: "Audio processing chain — voice clone, denoise, transcribe, summarize. Streams through one async iterator per stage.",
    zh: "音频处理链 — voice clone、降噪、转写、摘要;每段以 async iterator 串流。",
  },
  "video-pipeline": {
    en: "Long-form video pipeline — split, caption, b-roll, render. Distributes the long stages to backends/python via queue.",
    zh: "长视频流水线 — 切片、字幕、b-roll、渲染;长阶段通过 queue 转给 backends/python。",
  },
  "document-pipeline": {
    en: "Ingestion for PDF / docx / markdown — chunk, table-aware extract, embed, route to @nebutra/knowledge-base. OCR fallback for image-only pages.",
    zh: "PDF / docx / markdown 摄入 — chunk、表格感知抽取、embed、入 @nebutra/knowledge-base;纯图页用 OCR 回落。",
  },
  "3d-pipeline": {
    en: "3D asset generation + render — text-to-mesh + USD export + Three.js preview, with GPU-pool routing on the backend.",
    zh: "3D 资产生成 + 渲染 — 文生 mesh + USD 导出 + Three.js 预览;backend 走 GPU pool 路由。",
  },

  // ─── ops ────────────────────────────────────────────────────────────────
  cli: {
    en: "`nebutra` CLI — scaffold features, run migrations, inspect tenants, deploy presets. Same binary your CI uses.",
    zh: "`nebutra` CLI — 脚手架功能、迁移、租户检视、部署 preset;CI 用的是同一份二进制。",
  },
  "create-sailor": {
    en: "`create-sailor` scaffold — one command, working multi-tenant SaaS with auth + billing + dashboard wired in.",
    zh: "`create-sailor` 脚手架 — 一条命令,跑得起来的多租户 SaaS,自带 auth + billing + dashboard。",
  },
  preset: {
    en: "Feature-based SaaS config system. Toggle apps and features directly in one config file to shape your stack.",
    zh: "基于 feature 的 SaaS 配置系统;在单个配置文件中直接开关 apps 与 features,组装你的 stack。",
  },
  sanity: {
    en: "Sanity Studio v4 helpers — schema generators, content-driven page builder, image pipeline integration.",
    zh: "Sanity Studio v4 辅助 — schema 生成器、内容驱动的 page builder、与图像流水线集成。",
  },
  supabase: {
    en: "Supabase adapter layer — auth bridge, RLS helpers, edge function templates — for teams running Sailor on Supabase rather than Postgres-direct.",
    zh: "Supabase 适配层 — auth 桥接、RLS 辅助、edge function 模板 — 适合 Sailor 跑在 Supabase 而非直连 Postgres 的团队。",
  },
  "china-compliance": {
    en: "China-region operations — ICP filing helpers, MIIT registration, real-name verification, in-country DB residency.",
    zh: "中国区运营支持 — ICP 备案辅助、工信部登记、实名认证、数据境内存储。",
  },
  "content-store": {
    en: "Headless CMS adapter — Sanity / Strapi / Notion behind one ContentEntry<T> read API. Drives marketing pages and product copy.",
    zh: "Headless CMS 适配器 — Sanity / Strapi / Notion 统一为一个 ContentEntry<T> 读 API;驱动营销页面与产品文案。",
  },
  "play-loader": {
    en: "Hot-reload loader for atelier plays — sandboxed iframe, message bridge, persistence on save.",
    zh: "Atelier play 的热重载 loader — 沙箱 iframe、消息桥、保存即持久化。",
  },
  "play-marketplace": {
    en: "Marketplace shell for shareable atelier plays — discovery, ratings, install, attribution.",
    zh: "可分享 atelier play 的市场壳 — 发现、评分、安装、署名。",
  },

  // ─── atelier / sleptons ────────────────────────────────────────────────
  "access-gate": {
    en: "Pre-launch access gate — invite-code redemption, position queue, drip-release windows. Layers on top of @nebutra/waitlist.",
    zh: "上线前访问闸门 — 邀请码核销、排队位置、分批放量;在 @nebutra/waitlist 之上叠加。",
  },
  "atelier-canvas": {
    en: "Infinite design canvas — multiplayer cursors, layer panel, frame export. The drawing surface every atelier play renders into.",
    zh: "无限设计画布 — 多人光标、图层面板、frame 导出;所有 atelier play 的绘制载体。",
  },
  "brand-genesis": {
    en: "Brand creation flow — pick palette, type pair, motion preset; ships a synced @nebutra/brand override and a Figma preview link.",
    zh: "品牌生成流 — 选调色板 / 字组合 / 动效 preset,产出同步的 @nebutra/brand 覆写与 Figma 预览链接。",
  },
  cinema: {
    en: "Atelier cinema mode — distraction-free fullscreen with timed scene playback, perfect for demoing a play or rehearsing a pitch.",
    zh: "Atelier 电影模式 — 全屏沉浸 + 计时场景播放;最适合 demo play 或排练 pitch。",
  },
  "cofounder-match": {
    en: "Skill-and-stage cofounder matching — answers a small intake, surfaces ranked candidates with shared interest and warm intros.",
    zh: "按技能 + 阶段匹配 cofounder — 短表单后输出排序候选,标注共同兴趣与可信引荐路径。",
  },
  "ecosystem-safety": {
    en: "Pre-flight safety check — license sweep, dep-vuln audit, prohibited-content scan. Surfaces blockers before a play ships to marketplace.",
    zh: "上线前安全自检 — license 扫描、依赖漏洞审计、违禁内容检测;在 play 进市场前暴露阻塞项。",
  },
  "event-log": {
    en: "General-purpose event log primitive — append, query, time-window aggregate. Sits below audit, analytics, and trace-store as their record.",
    zh: "通用事件日志原语 — append、查询、时间窗聚合;为 audit / analytics / trace-store 提供底层记录。",
  },
  "founder-cemetery": {
    en: "Failed-startup memorial — anonymized post-mortems with cause tags. Read-only catalog, source of the recurring failure pattern dashboard.",
    zh: "失败创业纪念馆 — 匿名化复盘 + 失败原因 tag;只读目录,作为高频失败模式 dashboard 的数据源。",
  },
  "idea-plaza": {
    en: 'Public idea board — submit, upvote, comment; the seed pool atelier plays draw from when a founder asks "what should I build".',
    zh: '公开 idea 广场 — 提交、点赞、评论;atelier play 在创始人问 "做什么" 时的种子池。',
  },
  "landing-builder": {
    en: "Block-based landing page builder — drag pre-styled sections, edit copy in place, publish to a subdomain with one click.",
    zh: "积木式落地页生成器 — 拖动预设 section、原位改文案、一键发到子域名。",
  },
  legal: {
    en: "Legal entity primitives — corp filings, registered agents, jurisdiction-aware ToS/Privacy generation. Feeds the legal section of @nebutra/preset.",
    zh: "法律实体原语 — 公司注册、代理人、按管辖区生成 ToS/Privacy;为 @nebutra/preset 的法律部分供给。",
  },
  "outreach-engine": {
    en: "Cold-outreach orchestrator — list dedupe, persona-aware drafting, send via SES/Resend, reply detection. Routes hot replies back into @nebutra/agents.",
    zh: "Cold-outreach 调度器 — 名单去重、按 persona 撰写、SES/Resend 投递、自动识别回复;热回复回灌 @nebutra/agents。",
  },
  "provider-registry": {
    en: "Authoritative catalog of every supported provider — billing, queue, search, LLM — with capability matrix and per-region availability.",
    zh: "支持的所有 provider 权威目录 — billing / queue / search / LLM — 含能力矩阵与按区可用性。",
  },
  reel: {
    en: "Short-form vertical video primitive — captures atelier moments, auto-captions via TTS pipeline, publishes to social channels.",
    zh: "竖屏短视频原语 — 抓取 atelier 高光、走 TTS 流水线自动加字幕、发到社媒通道。",
  },
  "support-deflector": {
    en: "Inline AI support layer — answers from your docs + past tickets before a human is needed. Hands off cleanly with full transcript.",
    zh: "内嵌 AI 客服层 — 从文档与历史工单回答,先省一轮人工;无法解决时携完整记录转人工。",
  },
  "time-machine": {
    en: "Project history scrubber — snapshot every save, branch a play from any past frame, diff two snapshots side by side.",
    zh: "项目历史回看器 — 每次保存打 snapshot、可从任一历史帧拉新 play、双 snapshot 对比 diff。",
  },
};

export function getFeatureSummary(entry: PackageFeatureEntry, locale: "en" | "zh") {
  // Per-package authored copy takes precedence over the boilerplate fallback.
  const authored = PACKAGE_DESCRIPTIONS[entry.slug];
  if (authored && entry.kind === "package") {
    return authored[locale];
  }

  if (locale === "zh") {
    if (entry.kind === "group" || entry.kind === "capability") {
      return ZH_GROUP_SUMMARIES[entry.group] ?? entry.description;
    }

    const groupLabel = GROUP_LABELS[entry.group]?.zh ?? entry.group;
    return `${entry.label} 是 ${groupLabel} 能力域中的独立 package,边界保持在 ${entry.path},向上层暴露稳定的能力接口。`;
  }

  if (entry.kind === "group" || entry.kind === "capability") {
    return entry.description || `${entry.label} capability surface inside Nebutra Sailor.`;
  }

  const groupLabel = GROUP_LABELS[entry.group]?.en ?? entry.group;
  return `${entry.label} — focused capability inside the ${groupLabel} domain, boundary at ${entry.path}.`;
}

export function getFeatureTitle(entry: PackageFeatureEntry, locale: "en" | "zh") {
  if (locale === "zh") {
    if (entry.kind === "package") return `${entry.label} 能力包`;
    return `${GROUP_LABELS[entry.group]?.zh ?? entry.label}能力面`;
  }

  if (entry.kind === "package") return `${entry.label} package`;
  return `${GROUP_LABELS[entry.group]?.en ?? entry.label} capability`;
}
