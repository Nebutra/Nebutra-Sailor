# RFC B3/B6: 付费墙验证观测链路需要从埋点升级为决策证据

Status: Proposed
Date: 2026-07-06
Dimensions: B3 可观测性成熟度, B6 测试盲区分析

## Delta Scope

本提案覆盖 2026-06-28 之后新增的 P0 paid-wall validation loop：`docs/analytics/paid-wall-validation.md`、Metabase SQL dashboard、license wizard analytics、checkout started/completed 事件，以及 Cloud VM fallback 部署后的 `deployment.verified` 事件。

本评审没有修改代码或配置。

## Current State

- `docs/analytics/paid-wall-validation.md` 将 STARTUP 团队商业线定义为 `license.wizard` submitted、Stripe checkout started/completed 和 `deployment.verified` 的 30 天证据链。
- SQL dashboard 使用 `analytics_events` 计算 `startup_team_sample_n`、`startup_paid_n`、`startup_paid_pct`，并要求样本数至少 20。
- `packages/platform/analytics/src/events.ts` 新增/强化了 Zod 事件契约：`license.wizard`、`checkout`、`deployment.verified` 等。
- `apps/landing/src/lib/analytics/emit.ts` 仍是 Phase 0 browser helper，直接调用 PostHog `/capture/`，fire-and-forget，并在错误时静默失败。
- Stripe webhook 侧通过动态 import `@nebutra/analytics` 发出 `checkout` completed，失败只 warn，不影响 webhook 处理。
- `deploy-ecs.yml` 在 public smoke test 之后发出 `deployment.verified`，但缺少 team/user attribution 时只能证明部署路径，不一定能关联到团队级商业转化。
- 当前文档明确“不要在付费转化信号已知前调 copy”，但还没有把数据质量、重复事件、匿名身份合并和告警噪声定义为阻断条件。

## Observability Tradeoffs

Option A: 保持 Phase 0 fire-and-forget，同时建立数据质量门。

- Pros: 不阻塞商业验证；先检查事件完整性、identity join、重复率、延迟和样本量。
- Cons: 仍可能丢失 submit-to-redirect 中的少量浏览器事件。

Option B: 立即统一到 `@nebutra/analytics` browser/server wrapper。

- Pros: 事件契约、错误处理和 identity 逻辑更一致。
- Cons: 可能在 P0 验证期引入 wrapper 迁移风险，延后实际经营判断。

Option C: 只看 Stripe paid completion，不看 wizard/deploy 前置信号。

- Pros: 最接近收入事实。
- Cons: 不能解释漏斗断点，也无法区分定位失败、checkout 摩擦、部署失败或埋点缺失。

Recommended direction: Option A then B. 先把当前链路用于有限经营判断，但需要数据质量门；当 wrapper contract 稳定后再合并双轨埋点。

## Decision Information Needed

- PostHog anonymous distinct_id 与 authenticated userId 的合并策略。
- `license.wizard submitted` 和 `checkout started` 在 redirect 前的丢失率估计。
- Stripe webhook completed 与 browser checkout started 的去重和 join key：session id、userId、distinct_id。
- `deployment.verified` 是否需要带团队/用户/生成项目的稳定 attribution。
- 数据延迟、重复事件、空字段、schema drift 达到什么阈值时禁止下商业结论。
- 付费墙 dashboard 是手动诊断、每周经营例会输入，还是 CI/alert 触发源。
- 告警是否只针对数据管道中断和支付异常，而不是低转化率本身。

## Proposed Decision Path

1. 为 paid-wall loop 加一张数据质量表：事件量、去重率、join 率、缺字段率、延迟。
2. 明确哪些指标是 alert，哪些只是经营观察，避免低转化率制造告警噪声。
3. 在样本量达到阈值前，只记录 inconclusive，不改定位和 copy。
4. 将 Phase 0 browser helper 的退出条件写清：何时由 `@nebutra/analytics` 统一接管。

## Non-Goals

- 本 RFC 不改付费墙文案、价格或 checkout 行为。
- 本 RFC 不新增或删除埋点。
- 本 RFC 不把静默失败改成影响用户体验的阻断错误。
