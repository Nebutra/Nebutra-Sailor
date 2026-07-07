# RFC B8/B1/B4/B7: 特性开关生命周期需要注册表与删除门

Status: Proposed
Date: 2026-07-06
Dimensions: B8 特性开关债, B1 技术债与 legacy 架构治理, B4 安全架构评审, B7 开发者体验

## Delta Scope

本提案覆盖 2026-06-28 之后更明显的 feature flag 债务：access gate 模式、OAuth/One Tap 阻断、cloud deploy target env、billing checkout mode、Startup OS prototype gate、demo route flags、admin feature flag overrides，以及 `@nebutra/feature-flags` foundation 状态之间的分裂。

本评审没有删除任何 flag，也没有修改灰度或权限设置。

## Current State

- `packages/platform/feature-flags/package.json` 标记 `productionReady=false`，并说明 managed Vercel Flags/GrowthBook/ConfigCat SDK 和 rollout dashboard 尚未完成。
- `packages/platform/feature-flags/src/index.ts` 提供 cache/env/memory/custom provider、kill switch、percentage rollout 和 `FLAGS` 常量。
- `FLAGS` 同时包含长期产品能力、demo/codename、auth rollout gates 和 generic beta/experimental flags，缺少 owner、expiry、rollout dependency 和 removal condition。
- `setFeatureFlagProvider` 禁止生产默认使用 memory provider，除非显式设置 `ALLOW_MEMORY_FEATURE_FLAGS_IN_PRODUCTION=true`。
- Gateway admin route 仍有进程内 `flagOverrides`，不具备多实例一致性、审计或持久化。
- `ACCESS_GATE_MODE` / `NEXT_PUBLIC_ACCESS_GATE_MODE` 影响认证入口；它们是安全门禁，不应被当作普通 UI 实验开关。
- `API_PROTOCOLS` 已取代 legacy `ENABLE_TRPC` / `ENABLE_ORPC`，但兼容布尔仍存在。
- `STARTUP_AGENT_OS_PROTOTYPE` 在生产中控制 Startup OS 暴露；相关 routes 和 cofounder context 仍依赖该 prototype gate。
- `BLOG_DISABLE_CTA_PROMOTION` 仍是内容导入 escape hatch，需要明确是否为临时 flag。

## Architectural Tradeoffs

Option A: 引入 feature flag registry，但暂不删除任何 flag。

- Pros: 先建立 owner、risk class、expiry、rollback、灰度依赖和删除条件；不破坏当前运行面。
- Cons: 需要补文档和治理脚本，短期不会减少 flag 数量。

Option B: 立即删除看起来 stale 的 demo/legacy flags。

- Pros: 表面债务减少最快。
- Cons: 可能破坏灰度、演示、客户租户或内部路线；违反“删除须确认灰度依赖”约束。

Option C: 把所有 env gates 迁入 `@nebutra/feature-flags`。

- Pros: 单一接口更清晰。
- Cons: 安全门禁、部署目标、协议兼容层和产品实验有不同 blast radius；过早统一会隐藏风险差异。

Recommended direction: Option A. 先把 flag 分级和生命周期治理建立起来，再逐个做删除或迁移决策。

## Decision Information Needed

- 每个 flag 的 owner、创建原因、默认值、生产状态、受影响租户、回滚方式和删除条件。
- 哪些属于 security gate、deploy topology、runtime compatibility、commercial experiment、demo/codename，不能混用同一删除策略。
- Admin in-memory overrides 是否仍有真实调用者；如果有，是否迁到 Redis/DB 并加审计。
- Legacy `ENABLE_TRPC` / `ENABLE_ORPC` 的外部依赖是否已经清零。
- `STARTUP_AGENT_OS_PROTOTYPE` 的产品决策日期：转正、拆分灰度、或删除。
- `BLOG_DISABLE_CTA_PROMOTION` 是否仍被发布流程使用；如果保留，需要 owner 和到期日。
- 是否允许 `ALLOW_MEMORY_FEATURE_FLAGS_IN_PRODUCTION=true`，以及必须具备什么变更批准。

## Proposed Decision Path

1. 建立 `FeatureFlagRegistry` 提案：name、class、owner、default、blast radius、created date、expiry、dependency、delete-after。
2. 将安全门禁、部署目标、协议兼容层和产品实验分成不同 class，避免统一当作普通 experiment。
3. 对每个疑似 stale flag 做“灰度依赖确认”后再删除。
4. 为 admin overrides 定义正式持久化/审计路径，或确认其为待删除内部工具。

## Non-Goals

- 本 RFC 不删除任何特性开关。
- 本 RFC 不改变 `@nebutra/feature-flags` provider 行为。
- 本 RFC 不开启、关闭或迁移任何灰度依赖。
