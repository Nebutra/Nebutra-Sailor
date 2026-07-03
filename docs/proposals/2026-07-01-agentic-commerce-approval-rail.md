# Proposal: Agentic Commerce Approval Rail

日期: 2026-07-01
状态: Proposed
排序: #4
工作量: M-L

## 一句话价值主张

让 Startup OS 和 agent-runtime 可以安全地建议、准备、审批并执行商业动作，例如创建 checkout、调整 credits、发起 refund draft、发送 billing email 或开启 paid experiment；所有动作都经过 entitlement、approval、idempotency、audit 和 rollback 边界。

## 用户 job

目标用户是用 Nebutra 运行 AI-native SaaS 的创始人、operator 和 implementation partner。他们的真实问题是:

- 我希望 agent 能帮我推进商业工作，而不只是写文案或代码: 生成 pricing experiment、创建 checkout link、补发 invoice email、暂停超额 usage、准备 refund。
- 但一旦动作涉及钱、权限、额度、客户沟通或订阅状态，我不能接受 agent 直接动生产。
- 我需要一个统一轨道告诉我: 这个商业动作是谁提议的、基于什么证据、会影响哪个 tenant/customer、是否幂等、如何撤回、是否已经计费/审计。

这不是追逐 "agentic commerce" 的表面话题。真正 job 是把 AI agent 接入 revenue operations 时保留人的控制权和系统可追责性。

## 设计

新增一个 `CommerceAction` envelope，所有 agent 触碰商业面的动作先进入 approval rail。

`CommerceAction` 字段:

- `kind`: `checkout.create`、`credit.adjust`、`subscription.change_draft`、`refund.prepare`、`billing_email.send`、`usage_cap.change`、`paid_experiment.launch`。
- `tenantId`、`actorId`、`agentRunId`、`customerRef`、`idempotencyKey`。
- `proposedPayload`: agent 准备的最小动作参数。
- `evidenceRefs`: 来自 Startup Evidence Graph、billing、usage、support 或 manual note 的证据。
- `riskLevel`: `low`、`medium`、`high`。
- `requiredApprovals`: owner、billing admin、security/admin policy。
- `status`: `proposed`、`approved`、`executing`、`executed`、`denied`、`expired`、`rolled_back`。
- `rollbackPlan`: 可选；第一版只要求对 credit adjustment、usage cap 和 billing email 有明确补救动作。

产品表面是一个 Commerce Approval Inbox，而不是 chat UI。Agent 可以准备动作，但执行器只接受已批准、未过期、entitlement 通过、幂等 key 未消费的 action。

第一版范围:

1. `checkout.create`: 为 STARTUP/individual/workspace 创建 Stripe checkout session draft。
2. `credit.adjust`: 为 tenant 增减 credits，必须给出 reason 和 evidence。
3. `billing_email.send`: 通过 email provider 发账单/checkout 提醒，先只支持 approved template。
4. `usage_cap.change`: 调整 AI token/API usage cap，默认 medium/high risk。

## AI/商业机制

- AI 机制: agent-runtime 输出 `CommerceActionProposal`，不直接调用 Stripe/Resend/billing mutation。工具权限只允许 proposal，执行工具单独 gated。
- 商业机制: 把 Nebutra 从 "AI 可以推荐" 推进到 "AI 可以帮你准备可执行 revenue ops"，但保留企业买单所需的审批、审计和撤销边界。
- Entitlement 机制: 商业动作可按 plan 开放。Free/individual 只能创建 checkout draft；workspace/admin 才能批准 subscription/credit/usage 变更。
- Cost 机制: 每个 action 关联 agent token cost、provider cost 和预期 revenue/retention impact，后续可进入 metering。

## 复用基础设施

可复用:

- `@nebutra/agents` tenant-aware runtime、usage tracking、tool invocation。
- `@nebutra/agent-runtime` run/turn/policy/approval grammar。
- `@nebutra/billing` Stripe checkout、credits、entitlements、usage hooks。
- `@nebutra/metering` AI token/API usage quotas 和 ClickHouse events。
- gateway idempotency、rate limiting、audit mutation logging、tenant context。
- `@nebutra/vault` for provider credentials、`@nebutra/queue`/Inngest for durable execution。
- `@nebutra/analytics` checkout and conversion events。
- `apps/web` billing/settings/workspace routes and product capability resolver。

需要新建:

- `CommerceAction` schema、policy evaluator、risk classifier。
- Approval inbox UI and route contracts。
- Execution adapters for checkout, credit adjustment, billing email, usage cap。
- Idempotent action executor with audit and rollback metadata。
- Tests for denied action, expired action, duplicate idempotency key, tenant mismatch, missing entitlement, and high-risk approval.

## 成功指标

- agent-proposed commercial actions accepted by humans without manual rewrite。
- checkout drafts created from agent recommendations that convert to paid evidence。
- zero unapproved mutations for billing/credits/usage cap routes。
- time from evidence signal to approved paid experiment。
- audit completeness: every executed action has evidence refs, approver, idempotency key, result, and rollback metadata。

## 实现草图

1. Define `CommerceActionProposal` and `CommerceAction` Zod schemas in a commerce-owned boundary, with no provider mutation yet。
2. Add policy evaluator: action kind -> required role, entitlement, max age, risk level, required approvals。
3. Build a deterministic executor interface and test fake executor。
4. Wire `checkout.create` first, because issue `#187` and STARTUP paid-wall validation need this path。
5. Add approval inbox to `apps/web` billing/workspace area, behind a default-off feature flag if prototyped。
6. Add audit events and idempotency guard before adding credit/usage mutations。

## 风险

- 商业动作一旦做成万能 agent tool，会制造真实损害。必须先做 proposal-only，再接 executor。
- Refund/subscription mutation provider semantics 复杂，第一版应只做 draft 或 checkout create。
- 如果 approval UI 太慢，用户会回到手工 Stripe dashboard。第一版要少 action、清楚 payload、可一键 approve/deny。
- Billing package README 和实际生产 readiness 仍需校准；proposal 不能假设所有 adapter 已生产可用。

## 对标本质

| 产品 | 能力轴: 替用户做的真实 job | 品味/工艺轴: 高级感来源 | Nebutra 应吸收的本质 |
| --- | --- | --- | --- |
| Stripe / agentic commerce | 让 AI 或外部代理参与 checkout/order/payment workflow | ledger、webhook、idempotency、policy 明确 | agent 可以准备商业动作，但金钱状态必须走严谨轨道 |
| Clerk Billing / Organizations | 把 auth、org、role、subscription 放在同一上下文 | 权限和账单主体不混淆 | approval 必须知道 actor、tenant、role、billing subject |
| Inngest | 把长流程变成可重试、可观察、可恢复的 steps | durable execution、replay、failure visibility | commerce action executor 不能是一次性 handler |
| Resend | 发送动作有 domains、logs、webhooks、templates | 开发者 API 简洁但 deliverability 证据完整 | billing email 不是 free-form prompt，要走 approved template/log |
| Vercel AI Gateway | AI 调用的成本、路由、budget 进生产控制面 | observability 与 policy 默认在路径上 | agent proposal 自身也要计费、限额、可观测 |
| Railway / Supabase | 环境、secret、database/action 在 production boundary 内清楚 | staging/prod、logs、权限边界可见 | commercial action 必须区分 draft、approved、executed、rolled back |

参考校准: [Stripe](https://stripe.com/), [Clerk Billing](https://clerk.com/billing), [Inngest](https://www.inngest.com/), [Resend](https://resend.com/), [Vercel AI](https://vercel.com/ai), [Railway](https://railway.com/), [Supabase](https://supabase.com/).

## 主动砍掉的蹭趋势点

- 不做 autonomous purchasing assistant。Nebutra 的用户不是让 AI 随便买东西，而是让 AI 安全推进 SaaS revenue ops。
- 不做 universal workflow builder。只处理 money/entitlement/customer-communication 相关动作。
- 不让 agent 直接拿 Stripe secret。provider credentials 只能由 executor 在批准后读取。
- 不把 approval 做成聊天确认。必须是结构化 payload、role、risk、evidence 和 audit。

## 决策建议

把它排在本轮新增机会第二、全局第四。它比 Evidence Graph 工作量更大，但契合近期 paid-wall、billing、metering、agent-runtime 和 gateway governance；等 `checkout.create` 和 approval rail 成型后，Startup OS 才能可信地从"建议商业动作"进入"准备可执行商业动作"。
