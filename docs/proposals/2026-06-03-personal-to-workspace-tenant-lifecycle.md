# Proposal: Personal-to-Workspace Tenant Lifecycle

日期: 2026-06-03
状态: Proposed
排序: #1
工作量: M-L

## 一句话价值主张

让 solo founder 先用个人 Tenant 安全启动 Startup OS、AI 运行、计费和数据沉淀，等真正需要团队协作时再无迁移升级为组织工作区。

## 用户 job

目标用户不是已经有完整 IT 组织的企业，而是正在从一个人、一条 startup thesis、一批早期素材开始的创始人或小团队。他们的真实问题是:

- 我还没有公司、团队、组织结构，但我已经需要保存 CompanyContext、跑 AI、记录成本、积累客户/投资人/内容线索。
- 我之后可能会邀请联合创始人、外包、客户或内部成员，但不希望第一天为了权限模型被迫创建一个假的 organization。
- 我需要个人空间里的资产可以升级成团队资产，且审计、账单、AI token、内容、知识库、链接归因都不断链。

这不是追逐 "personal workspace" 表面概念。它解决的是 Startup OS 本体里"创始人先于组织存在"的真实建模问题。

## 设计

核心对象仍然是 `Tenant`，而不是新增一套 personal workspace 数据模型。

1. `Tenant(kind=INDIVIDUAL)` 是创始人的默认启动空间。
2. `Tenant(kind=ORGANIZATION)` 是协作、组织账单、团队权限、企业域名和客户交付的空间。
3. Startup OS 项目、CompanyContext、AI runs、knowledge records、usage ledger、audit log、links、content drafts 都归属 `tenantId`，不再在产品语义上假设 `organizationId`。
4. 引入 `TenantLifecycle` 决策层，表达四个状态:
   - `personal_draft`: 个人试验、默认私有、可用个人额度。
   - `personal_paid`: 个人付费或信用额度，仍无团队权限。
   - `workspace_ready`: 已准备邀请成员、绑定域名、开启共享审计。
   - `organization_owned`: 转成组织 Tenant，组织权限和账单接管。
5. UI 上不是再加一个 dashboard，而是在 Startup OS Command Center、billing、settings、invites、audit 里露出同一条生命周期线。

若未来做一次性原型，必须放在 off-by-default feature flag 后，并标注"未评审的自动生成原型"。本提案本轮不要求原型。

## AI/商业机制

- AI 机制: Agent runs 以 `tenantId` 为最小隔离单元。个人和组织都能跑相同的 Startup OS 任务，但审批策略、工具权限、token budget 和审计展示由 lifecycle state 决定。
- 记忆机制: CompanyContext 从个人 Tenant 开始沉淀，升级组织时通过 transfer journal 记录归属变更，而不是复制一份新上下文。
- 商业机制: 允许 free individual sandbox -> paid individual credits -> organization subscription 的自然升级路径。
- 增长机制: analytics 记录从个人试用到邀请成员、绑定域名、开启组织账单的转化，不把"注册数"当成唯一指标。

## 复用基础设施

可复用:

- `Tenant` Model-2、`tenant_id`、RLS、`app.current_tenant_id`。
- `@nebutra/tenant`、`getTenantDb`、gateway tenant middleware。
- Clerk user/org 基础设施、现有 auth helpers、org invitation 经验。
- `@nebutra/billing` credits、usage ledger、checkout return、plan badge。
- `@nebutra/audit`、request log、analytics dashboards。
- Startup OS Command Center、agent-runtime、knowledge-base、vault、feature flags。

需要新建:

- `TenantLifecyclePolicy`: 哪些 action 在个人/组织状态下允许。
- `TenantTransferJournal`: 记录个人资产升级为组织资产的审计事件。
- Billing subject resolver: `user` 与 `organization` 在同一产品路径里可切换，但不能混淆。
- UI copy/empty states: 明确"个人空间"、"准备协作"、"已归组织"。
- 回归测试: 个人 tenant 访问、组织 tenant 访问、跨 tenant 拒绝、账单主体切换、audit trail 不断链。

## 成功指标

- 新用户首次进入 Startup OS 不需要先创建 organization 的比例上升。
- 从个人空间创建第一个 CompanyContext 的完成率。
- 个人空间到邀请成员/创建组织的转化率。
- 转组织后原有 Startup OS 项目、knowledge、audit、usage 数据完整可见。
- 支持问题中"为什么我要建 organization"、"个人资产怎么迁移到团队"类问题下降。

## 实现草图

1. 先做 contract pass: 定义 `TenantLifecycleState`、billing subject resolver、permission matrix。
2. 对齐 gateway 中仍假设 `requireOrganization` 的 routes，区分"必须登录"、"必须有 tenant"、"必须组织 tenant"。
3. 让 Startup OS 项目创建默认落到 individual tenant；邀请/组织化才切换状态。
4. 加 transfer journal 的数据库表和审计事件，不做隐式 copy。
5. 在 settings/billing/startup-os UI 里暴露状态和下一步 action。
6. 用 Vitest 覆盖 resolver/policy/route guard，用 Playwright 或 app route tests 覆盖个人到组织的核心路径。

## 风险

- Billing、credits、usage ledger 仍有 organization 语义残留，可能造成双重主体。
- 迁移为组织时若允许部分资产转移，会出现复杂 ownership 边界。第一版应只支持整项目或整 CompanyContext 转移。
- 如果 UI 解释不清，用户会以为个人空间和组织空间是两个产品。必须以一条 lifecycle 线表达。

## 对标本质

| 产品 | 能力轴: 替用户做的真实 job | 品味/工艺轴: 高级感来源 | Nebutra 应吸收的本质 |
| --- | --- | --- | --- |
| Clerk Organizations/Billing | 用户、组织、角色、订阅在同一认证面内协作 | 预制组件、session/context 语义清晰、billing 与权限联动 | 不假设所有用户一开始都有团队；把主体、权限和账单合在一个可信模型里 |
| Supabase | Auth、Postgres、RLS、API 一起启动 | SQL/RLS 透明、可本地运行、可扩展 | 让个人/组织隔离来自数据库与策略，不来自 UI 约定 |
| Vercel | project/team/deploy 是生产工作流核心 | preview、observability、security 默认接上 | Tenant lifecycle 要服务 deploy/AI/billing，而不是只做设置页 |
| Linear/Notion | 个人工作、团队协作、权限切换自然发生 | workspace switcher 稳定、上下文少犯错 | 让用户理解当前资产归谁、谁能看、谁付费 |
| Prisma Postgres | 数据库是 AI/开发工具可理解的协作层 | schema、insights、MCP/AI editor 友好 | `tenantId` 必须成为 AI agent 可解释、可审计的上下文边界 |

参考校准: Clerk Organizations/Billing, Supabase, Vercel AI Cloud, Railway, Prisma Postgres, Cursor, Warp。

## 主动砍掉的蹭趋势点

- 不做"AI cofounder social graph"。个人 Tenant 不是社交网络，而是资产归属与升级路径。
- 不做"又一个 workspace switcher"。如果没有数据、账单、审计连续性，它只是 UI。
- 不做"组织模板市场"。先解决个人到团队的生命周期，再谈模板复用。

## 决策建议

把它作为 6 月初最高优先级产品机会。原因是 recent Tenant Model-2 已经把最贵的地基铺好，而 Startup OS 的核心用户正是先有个人创业状态、后有组织协作状态的人。这个提案能把近期 schema/RLS 治理转化成客户能感知的产品优势。
