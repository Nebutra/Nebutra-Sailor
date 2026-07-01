# Proposal Backlog

本目录记录 Nebutra-Sailor 的功能自我迭代提案。提案只用于评审和决策，不代表已进入生产路线。

排序公式:

`priority = user value x infrastructure fit / estimated effort`

当前产品判断: Nebutra-Sailor 不是普通 starter template，而是面向 AI-native SaaS 的 governed product baseline。近期主线从"生成一个 demo"继续推进到更硬的产品地基: Tenant Model-2、RLS/tenant_id 收敛、CLI 命令面可信化、模板 CI、package status、观测/成本证据、durable referral loop、STARTUP paid-wall validation。新提案应优先把这些地基组合成用户能感知的工作流，而不是复制热门产品表面。

## Active proposals

| Rank | Proposal | One-line value | Reuse | Effort | Status | File |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Startup Evidence Graph | 把 waitlist/referral/checkout/deploy/usage/support 证据写回 Startup OS Company Context，让 agent 和创始人基于事实迭代。 | Company Context Tower, Startup OS, analytics, waitlist/referral, billing, metering, deploy smoke, support/knowledge primitives | M | proposed | [2026-07-01-startup-evidence-graph.md](./2026-07-01-startup-evidence-graph.md) |
| 2 | Personal-to-Workspace Tenant Lifecycle | 让 solo founder 先用个人 Tenant 启动 Startup OS，之后无迁移升级为组织工作区。 | `Tenant` Model-2, RLS, Clerk user/org, billing credits, usage ledger, audit, Startup OS, agent-runtime, analytics | M-L | proposed | [2026-06-03-personal-to-workspace-tenant-lifecycle.md](./2026-06-03-personal-to-workspace-tenant-lifecycle.md) |
| 3 | Capability Readiness Compiler | 把 scaffold 选择、包状态、env contract、provider probes 和 smoke tests 编译成可信 readiness packet。 | `create-sailor`, `nebutra` CLI schema/doctor, `docs/package-status.md`, package `nebutra.status`, product capabilities, analytics dashboards | S-M | proposed | [2026-06-03-capability-readiness-compiler.md](./2026-06-03-capability-readiness-compiler.md) |
| 4 | Agentic Commerce Approval Rail | 让 agent 安全准备 checkout、credits、billing email、usage cap 等商业动作，执行前必须过审批、幂等、审计和 entitlement。 | agent-runtime, billing, metering, gateway idempotency/audit, vault, queue/Inngest, analytics, web billing/settings | M-L | proposed | [2026-07-01-agentic-commerce-approval-rail.md](./2026-07-01-agentic-commerce-approval-rail.md) |
| 5 | Startup Agent OS | 从一个 startup thesis 生成 coherent company context、资产、执行、launch、收入、支持和迭代。 | `@nebutra/agents`, `@nebutra/agent-runtime`, `@nebutra/brand-genesis`, media pipelines, canvas/reel/atelier, auth, billing, analytics, knowledge, queue, vault | L | proposed | [2026-05-29-startup-agent-os.md](./2026-05-29-startup-agent-os.md) |

## Historical subsystem proposals

这些文件保留为早期子系统材料，不在本轮重新报告为新增机会。

| Proposal | Current reading | File |
| --- | --- | --- |
| Launch Access Funnel | 作为 Startup Agent OS 的 acquisition/onboarding/billing 子系统参考，不单独作为主线产品。 | [2026-05-29-launch-access-funnel.md](./2026-05-29-launch-access-funnel.md) |
| Governed Agent Ops Workspace | 作为 agent-runtime 控制面参考；近期更高价值是把 Tenant lifecycle 与 readiness 先产品化。 | [2026-05-29-governed-agent-ops-workspace.md](./2026-05-29-governed-agent-ops-workspace.md) |
| Confidence-Gated Support Deflection | 作为 knowledge/support 自动化子系统参考；没有新用户证据前不重复提。 | [2026-05-29-confidence-gated-support-deflection.md](./2026-05-29-confidence-gated-support-deflection.md) |

## 2026-06-03 review

新增:

- `Personal-to-Workspace Tenant Lifecycle`: 最高优先级。近期 `Tenant` 超类型和 `tenant_id` 收敛让 Nebutra 可以表达"个人创始人先于组织存在"，这是 Startup OS 的真实 job，不是 workspace UI 复刻。
- `Capability Readiness Compiler`: 次优先级。近期 CLI empty-UX、command drift guard、package status、template CI 可以组合成一份可审计 readiness packet，解决 starter/agent 最常见的错误假设。

本轮主动砍掉:

| Idea | Why it was cut |
| --- | --- |
| Generic agentic coding IDE clone | Cursor/Warp 的本质是上下文、审查、可接管 agent sessions。Nebutra 当前更应该把 agent 放进 tenant/billing/readiness 责任面。 |
| Generic AI app builder clone | Bolt/Lovable/Figma Make 的表面是 prompt-to-app，Nebutra 的契合点是生成后的治理、计费、隔离、证据，不是再做一个 chat builder。 |
| Visual cloud canvas clone | Railway 的本质是正确配置、可观测、可回滚。当前先做 readiness packet，比做画布更贴近现有基础设施。 |
| Standalone component marketplace | shadcn/ui/21st.dev 的本质是可拥有的代码分发和 registry 透明度；等 subrepo/registry 路线合并稳定后再评估。 |

Evidence used:

- Repo: `README.md`, `docs/package-status.md`, `docs/architecture/2026-06-02-tenancy-tenant-supertype-model-2.md`, `docs/rfcs/2026-06-02-*`, `docs/capabilities/*/CAPABILITY_MAP.md`, `packages/ops/create-sailor/README.md`, `packages/ops/cli/README.md`, `apps/web/src/lib/product-capabilities.ts`.
- Recent commits/issues: Tenant Model-2/RLS cutover, gateway tenant canonicalization, CLI command drift and empty-UX fixes, template CI fixes, open issues `#141`, `#148`, `#151`, `#153`, open PRs `#145`, `#147`, `#152`, `#154`.
- Benchmark calibration: [Cursor](https://cursor.com/), [Vercel AI Cloud](https://vercel.com/ai), [Supabase](https://supabase.com/), [Clerk Organizations](https://clerk.com/docs/guides/organizations/overview), [Clerk Billing](https://clerk.com/billing), [Railway](https://railway.com/), [Resend docs](https://resend.com/docs), [Sanity AI Assist](https://www.sanity.io/ai-assist), [Inngest](https://www.inngest.com/), [Prisma Postgres](https://www.prisma.io/postgres), [Dub](https://dub.co/), [shadcn/ui registry](https://ui.shadcn.com/docs/registry), [21st.dev](https://21st.dev/), [Bolt](https://bolt.new/), [Lovable](https://lovable.dev/), [Figma Make](https://www.figma.com/make/), [Warp](https://www.warp.dev/).

## 2026-07-01 review

新增:

- `Startup Evidence Graph`: 最高优先级。近期 Company Context Tower、durable referral loop、paid-wall validation issue `#187`、billing/metering/analytics 已经能组合成一个新产品面: 把真实商业/部署/支持证据送回 Startup OS，而不是让 agent 永远围绕初始 thesis 做建议。
- `Agentic Commerce Approval Rail`: 全局第四。Stripe/Clerk/Inngest/Vercel AI 方向说明 AI 会越来越靠近商业动作，但 Nebutra 的契合点不是 autonomous shopping，而是 tenant-scoped SaaS revenue ops 的 approval/idempotency/audit rail。

本轮主动砍掉:

| Idea | Why it was cut |
| --- | --- |
| Generic AI growth dashboard | 如果没有 source links、accepted/rejected updates 和 paid evidence，它只是漂亮的 vanity analytics。 |
| Autonomous shopping / agentic commerce clone | Nebutra 的用户 job 是让 agent 安全推进 SaaS revenue ops，不是让 AI 替用户随便购物。 |
| Full CRM or support suite | Support、ICP、pipeline 只作为 evidence source 进入 Startup OS；全量 CRM 会稀释当前基础设施优势。 |
| New AI app builder shell | Bolt/Lovable/Figma Make 的本质仍然是快速生成；Nebutra 当前更有价值的是生成后的 evidence、approval、billing、tenant governance。 |
| Component marketplace / UI remix product | shadcn/ui/21st.dev 的本质是可拥有代码和 registry 透明度；当前没有比 readiness/evidence 更高的用户价值。 |

Evidence used:

- Repo: `README.md`, `docs/package-status.md`, `docs/plans/2026-06-27-plg-referral-infrastructure-design.md`, `docs/rfcs/2026-06-08-*`, `docs/startup-os/2026-06-05-company-context-tower-design.md`, `packages/ai/startup-os/README.md`, `packages/ai/agents/README.md`, `packages/commerce/billing/README.md`, `packages/commerce/metering/README.md`, `packages/platform/analytics/README.md`, `apps/web/src/lib/product-capabilities.ts`.
- Recent commits/issues: Vite/gateway Startup OS cutover, Company Context Tower implementation, durable referral loop, capability source stats, health/CI governance fixes, open issue `#187` STARTUP paid-wall validation, issues `#190`/`#191` public URL and web API drift, security/dead-code/toolchain follow-ups.
- Benchmark calibration: [Stripe](https://stripe.com/), [Clerk Billing](https://clerk.com/billing), [Inngest](https://www.inngest.com/), [Vercel AI](https://vercel.com/ai), [Cursor](https://cursor.com/), [Linear](https://linear.app/), [Dub](https://dub.co/), [Resend](https://resend.com/), [Sanity AI Assist](https://www.sanity.io/ai-assist), [Notion AI](https://www.notion.com/product/ai), [Supabase](https://supabase.com/), [Prisma](https://www.prisma.io/), [Railway](https://railway.com/), [Lovable](https://lovable.dev/), [Bolt](https://bolt.new/), [Figma Make](https://www.figma.com/make/), [Warp](https://www.warp.dev/), [Replit](https://replit.com/), [fal.ai](https://fal.ai/), [21st.dev](https://21st.dev/), [shadcn/ui](https://ui.shadcn.com/).
