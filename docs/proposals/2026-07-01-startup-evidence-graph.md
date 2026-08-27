# Proposal: Startup Evidence Graph

日期: 2026-07-01
状态: Proposed
排序: #1
工作量: M

## 一句话价值主张

把 waitlist、referral、checkout、deploy smoke、usage、support 和 content signals 编译进 Startup OS 的 Company Context，让 agent 和创始人基于真实证据更新战略、产品和下一步动作，而不是继续围绕初始 thesis 自我循环。

## 用户 job

目标用户是正在用 Sailor 启动 AI-native SaaS 的 solo founder、小团队、agency 或 venture studio。他们的真实问题是:

- 我已经有 startup thesis、landing、waitlist、checkout 和部署，但不知道哪些信号足够证明方向，哪些只是流量噪声。
- 我希望 AI agent 给下一步建议，但它必须看见真实商业证据: 谁来了、谁愿意付费、部署是否真通、支持问题卡在哪里、哪些内容带来高质量用户。
- 我需要把 evidence 写回 Company Context 和执行计划，但不能让 AI 悄悄改掉已经人工确认的定位、ICP 或 pricing。

这不是追逐 "AI analytics dashboard" 或 "growth copilot" 的表面趋势。它解决的是 Startup OS 的核心缺口: company context 如果不接真实证据，很快会从 operating system 退化成一次性的生成文档。

## 设计

核心对象是 `EvidenceSignal` 和 `EvidenceDigest`，归属 `tenantId` 与 Startup OS project。

`EvidenceSignal` 是一条规范化事实:

- `source`: `waitlist`、`referral`、`checkout`、`deployment`、`usage`、`support`、`content`、`manual_note`。
- `subject`: 关联对象，例如 waitlist entry、campaign code、checkout session、deployment run、support ticket、content slug。
- `strength`: `weak`、`directional`、`validated`、`counter_signal`。
- `links`: 原始事件、dashboard query、audit record 或外部 source 的引用。
- `suggestedContextUpdates`: 可选的 Company Context Tower 字段更新建议，永远是 draft，不直接覆盖 locked fields。

`EvidenceDigest` 是面向人和 agent 的周期性摘要:

- 本周有效 signal 与反信号。
- 影响的 Tower layers: L4 strategy、L5 product、L6 users、L7 narrative、L9 execution。
- 建议更新的字段、置信度、证据来源和需要人工确认的冲突。
- 下一步 experiment queue: 例如改 pricing CTA、邀请某个 segment、补 deploy smoke、写一篇针对高转化来源的内容。

第一版不做漂亮 BI。它在 Startup OS Command Center 中增加一个 `Evidence` lane，并在 Company Context Tower 的相关 floor 卡片上显示 "evidence-backed draft"。任何写回都走现有 tower tool surface: `upsertField(..., provenance: "agent" | "document", confidence, runId)`，locked field 需要 human force。

## AI/商业机制

- AI 机制: agent 只读取 `EvidenceDigest` 和必要的 linked signals，不直接吞整张事件表。这样保留 progressive disclosure，也避免把脏数据当真理。
- 商业机制: 这让 Nebutra 从 "帮我生成 startup assets" 进入 "帮我判断 startup loop 是否变强"。它也能成为 Startup tier 的核心付费理由: founders pay for validated operating evidence, not more charts.
- 增长机制: issue `#187` 的 STARTUP paid-wall loop 可以成为第一个 dogfood 场景: scaffold、license wizard、checkout started/completed、deployment verified 都进入 evidence graph。

## 复用基础设施

可复用:

- `packages/ai/startup-os/src/company-context/*` 的 nine-layer tower、provenance、confidence、lock/unlock、tool surface。
- `apps/web` Startup OS Command Center、execution/run ledger、files、canvas、rollout 和 model-tier 约束。
- `@nebutra/analytics` 的 PostHog product events、Dub referral/conversion attribution。
- `@nebutra/waitlist` 与 2026-06-27 durable referral loop。
- `@nebutra/billing` checkout、credits、entitlements；`@nebutra/metering` ClickHouse usage events。
- `docs/analytics/dashboards/*`，尤其 payment funnel、scaffold-to-license、docs pain map。
- deploy smoke/public URL health、gateway audit/metering hooks、support-deflector/knowledge-base 的 future decision artifacts。

需要新建:

- `EvidenceSignal`/`EvidenceDigest` schema 和 strength policy。
- Source adapters: waitlist/referral、checkout、deployment verified、usage、support decision、content health。
- Digest compiler: deterministic first, optional model-injected synthesis later。
- Conflict detector: 当 evidence 建议改动 locked/high-stability Tower fields 时只提出 review item。
- Startup OS UI lane: evidence queue、accepted/rejected updates、links to raw facts。
- Tests: signal normalization、strength policy、locked field conflict、digest output、tenant isolation。

## 成功指标

- STARTUP paid-wall validation loop 能直接生成一份 raw evidence packet，并回答 `N >= 20`、paid conversion 是否过阈值。
- AI 建议中带可追溯 evidence link 的比例。
- 被人工接受的 Company Context update draft 比例。
- 由 evidence 触发的 L9 experiments 完成率。
- "AI 建议和真实用户/收入无关" 类内部 review 问题下降。

## 实现草图

1. 定义 `EvidenceSignal`、`EvidenceDigest`、`EvidenceStrength` 和 source adapter interface。
2. 先接四个高确定性 source: waitlist/referral、checkout、deployment verified、manual note。
3. 写 deterministic digest compiler: 按 source、strength、Tower layer 聚合，不调用模型。
4. 在 Startup OS project store 里持久化 digest references，或先以 tenant-scoped repository interface 包装现有 analytics queries。
5. 让 digest 生成 `suggestedContextUpdates`，但所有写回必须由人确认。
6. 把 issue `#187` 的 STARTUP paid-wall threshold 做成第一条 built-in evidence recipe。

## 风险

- 数据质量不足时，AI 摘要会放大错误。第一版必须展示 raw rows/query links，不只展示自然语言结论。
- 如果 source adapter 太多，会变成 integration project。第一版只接能验证 paid loop 的少数 source。
- 高稳定层 L1/L2/L8 被频繁建议改动会削弱 Company Context 的可信度。默认只允许 evidence 直接建议 L4/L5/L6/L7/L9。
- 这不是替代 product analytics。它只把关键证据送进 Startup OS decision loop。

## 对标本质

| 产品 | 能力轴: 替用户做的真实 job | 品味/工艺轴: 高级感来源 | Nebutra 应吸收的本质 |
| --- | --- | --- | --- |
| Linear + Cursor background agents | 把 issue 上下文交给 agent，并让团队看见进展和结果 | agent 状态清楚、human handoff 明确、结果可审查 | Evidence update 必须能被人接受/拒绝，而不是 agent 随便改 strategy |
| Vercel AI Cloud | 让 AI 调用、成本、路由和运行证据进入生产观测 | Gateway、observability、budget 和 deployment 连接 | Startup OS 的 AI 建议要带成本和部署事实 |
| Dub | 从 link click 走到 conversion attribution | 归因事件直接连到 revenue，而非 vanity metrics | referral/waitlist 只有连到 paid evidence 才算有效 |
| Stripe | checkout/payment events 是商业事实的 source of truth | Webhook、idempotency、ledger 语义严谨 | paid signal 必须来自 checkout completed 等强证据 |
| Sanity / Notion / Obsidian | 让知识和内容保持可追溯、可编辑、可被 AI 使用 | source material 可检查，AI 不吞掉结构 | Company Context 要保留 provenance 和 source links |
| Supabase / Prisma | 数据库、schema、RLS、AI/MCP 共同服务开发循环 | schema 透明，本地和生产边界明确 | Evidence graph 必须 tenant-scoped 且可被 agent 安全读取 |

参考校准: [Cursor](https://cursor.com/), [Linear](https://linear.app/), [Vercel AI](https://vercel.com/ai), [Dub](https://dub.co/), [Stripe](https://stripe.com/), [Sanity AI Assist](https://www.sanity.io/ai-assist), [Notion AI](https://www.notion.com/product/ai), [Supabase](https://supabase.com/), [Prisma](https://www.prisma.io/).

## 主动砍掉的蹭趋势点

- 不做 generic "AI growth dashboard"。没有 linked source 和 accepted/rejected loop 的 insight 只是文案。
- 不做 full CRM。ICP、pipeline、support 都只作为 evidence source 进入 Startup OS；全量 CRM 会稀释当前基础设施优势。
- 不做自动改 positioning。高稳定字段默认只提出 review draft。
- 不做 "trend detector"。Product Hunt、Hacker News、社媒热度如果不能连接到 activation 或 paid signal，先不进入 strength policy。

## 决策建议

把它排在本轮新增机会第一。原因是近期已经有 durable referral loop、STARTUP paid-wall issue、Company Context Tower、billing/metering/analytics 基础设施；这几个组合起来能形成清晰的产品优势: Nebutra 不只是生成 startup，而是持续告诉 founder 哪些事实证明公司正在变真。
