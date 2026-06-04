# Proposal: Capability Readiness Compiler

日期: 2026-06-03
状态: Proposed
排序: #2
工作量: S-M

## 一句话价值主张

把 `create-sailor`、`nebutra` CLI、包状态、env contract 和 smoke tests 编译成一份可信 readiness packet，让用户知道哪些能力能直接跑、哪些只是 foundation/WIP、下一步该补什么。

## 用户 job

目标用户是准备用 Sailor 启动 AI SaaS 的创始人、agency、内部平台团队或 AI coding agent。他们的真实问题是:

- 我刚 scaffold 了项目，但不知道当前选择的 auth、billing、AI、search、queue、storage、CMS 到底哪些真的可运行。
- 我不想被漂亮 starter 页面误导，也不想让 agent 根据 mock 数据继续生成错误计划。
- 我需要一份可以给团队、客户或自己未来复盘的 launch readiness 证据: 缺哪些 env、哪些 provider 是 stub、哪些 tests 已通过、哪些风险不该上线。

这不是再做一个 dashboard。它解决的是"模板可信度"和"AI agent 继续工作前的事实边界"。

## 设计

输出物是 `Sailor Readiness Packet`，同时有机器可读 JSON 和人类可读 Markdown。

第一版可以由 CLI 生成:

```bash
nebutra doctor --packet
create-sailor my-app --dry-run --packet
```

Packet 应包含:

- Capability matrix: auth、tenant、billing、metering、AI gateway、agent-runtime、queue、search、storage、email、CMS、analytics、observability、feature flags。
- 状态分级: `ready`、`needs_credentials`、`foundation_only`、`wip`、`blocked`、`not_selected`。
- Evidence: 读取到的 env keys、package `nebutra.status`、CLI flags、app capability resolver、smoke test 结果、OpenAPI/spec 生成状态。
- Next actions: 只给可执行命令或文档链接，不给泛泛建议。
- AI handoff: 一个短 `agent_context` section，说明 agent 可以安全继续改哪些面，哪些面不能假设已上线。

所有结果必须从本地状态和已声明 metadata 推导，不能使用 sample/mocked business data 伪装 readiness。

## AI/商业机制

- AI 机制: Packet 是给 coding agent 和 human 同时读的事实层。Agent 先读 packet，再决定是否生成 migrations、接 provider、写 tests 或补 env，而不是根据 README 猜。
- 商业机制: 商业 license、Startup tier、Enterprise support 可以围绕"readiness gap closure"服务化，但 packet 本身必须保持诚实，不能变成 sales checklist。
- 增长机制: 结合 analytics dashboards 记录 scaffold -> readiness packet -> first green dev -> license activation 的漏斗。

## 复用基础设施

可复用:

- `docs/package-status.md` 与每个 package 的 `package.json.nebutra` 块。
- `packages/ops/create-sailor` flags、templates、dry-run plan。
- `packages/ops/cli` command metadata/schema/doctor/admin/services/search/secrets 等命令面。
- `apps/web/src/lib/product-capabilities.ts` 的 env contract。
- `docs/analytics/dashboards/*` 的 scaffold/license funnel。
- `@nebutra/health`、gateway health、OpenAPI generation、template smoke tests。
- 近期 CLI empty-UX 修复: 未配置 provider 时应明确报空/阻塞，不再编造 indexes、secrets、growth/community 数据。

需要新建:

- `ReadinessPacket` schema 与版本号。
- Provider probe adapters: 只检查配置/连接/权限，不做 destructive writes。
- CLI renderer: table、JSON、Markdown 三种输出。
- Golden fixtures: minimal/global/cn/hybrid + missing env + WIP package selections。
- Drift guard: package status、CLI flag、env resolver、README 文案不一致时失败。

## 成功指标

- `create-sailor` 后 10 分钟内生成 readiness packet 的比例。
- scaffold -> first green `pnpm dev` / smoke test 的转化率。
- 因 provider stub、缺 env、mock 数据误解导致的 issue 数下降。
- Agent 生成计划中错误假设 provider 已生产可用的比例下降。
- package status 与 CLI/README/env resolver 的 drift issue 下降。

## 实现草图

1. 定义 `ReadinessPacket` schema，先覆盖 minimal preset 与 global defaults。
2. 从 `package.json.nebutra`、CLI schema、env resolver 汇总 selected capabilities。
3. 加 provider probes: credentials present、SDK importable、local endpoint reachable、known WIP gaps surfaced。
4. 让 `nebutra doctor --packet --format json` 输出稳定 JSON，再补 Markdown renderer。
5. 让 `create-sailor --dry-run --packet` 在不写文件时也能输出未来项目的 readiness projection。
6. 加 drift tests，确保 package status、CLI flags、docs 不再各讲各话。

## 风险

- Packet 若过度承诺，会重演 starter 模板的信任问题。状态必须偏保守。
- Provider probe 如果真的调用外部 API，会引入成本和安全风险。第一版只做 non-mutating checks。
- 过早做漂亮 UI 会分散重点。先把 CLI JSON 和 Markdown 做准。

## 对标本质

| 产品 | 能力轴: 替用户做的真实 job | 品味/工艺轴: 高级感来源 | Nebutra 应吸收的本质 |
| --- | --- | --- | --- |
| Railway | 连接 repo 后自动配置、部署、监控 | canvas 可视化、logs/metrics/alerts 一处看清 | Readiness 要把"当前系统能不能跑"讲清楚，而不是只给命令 |
| Vercel AI Cloud | AI gateway、sandbox、observability 接到生产路径 | production checklist 与 observability 让用户敢上线 | AI 能力必须有成本、路由、错误和安全证据 |
| Resend | 发送邮件、域名、logs、webhooks、AI docs | docs/CLI/llms.txt 让开发者和 agent 都好用 | Packet 要机器可读，不能只写给人类 |
| Prisma Postgres | 创建数据库、类型安全、Query Insights、AI editor 友好 | schema/insights 直接进入开发循环 | Readiness 要成为 agent 的事实输入 |
| Dub | 从点击到收入归因 | 不停留在 vanity metrics，直接连 revenue | Scaffold 成功不等于业务成功，packet 应连接 activation/funnel |
| shadcn/ui/21st.dev | 复制可拥有的组件/blocks | registry、分类、代码所有权 | Nebutra 不该只卖大 monorepo，应让能力选择和可用性透明 |

参考校准: Railway, Vercel AI Cloud, Resend, Prisma Postgres, Dub, shadcn/ui registry, 21st.dev, Bolt, Lovable。

## 主动砍掉的蹭趋势点

- 不做"AI SaaS 模板评分榜"。没有本地证据的排名没有价值。
- 不做"视觉化云资源画布"第一版。Railway 的本质是配置正确和可观测，不是画布本身。
- 不做"把所有 WIP 包包装成 ready"。readiness 的价值来自诚实。

## 决策建议

把它作为短周期产品化机会。它能把最近的 package status、CLI empty-UX、command drift guard、template CI、analytics funnel 合成一个用户可感知的信任面，同时给后续 AI agent 自动迭代提供可靠事实输入。
