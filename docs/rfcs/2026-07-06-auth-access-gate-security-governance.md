# RFC B4/B6/B8: 认证访问门禁与管理员覆盖面的安全治理

Status: Proposed
Date: 2026-07-06
Dimensions: B4 安全架构评审, B6 测试盲区分析, B8 特性开关债

## Delta Scope

本提案覆盖 2026-06-28 之后认证与授权边界的显著变化：OAuth 入口修复、invite-only access gate 的预检与兑换、Google One Tap/OAuth 阻断、以及管理员特性开关覆盖面。它不同于机械密钥扫描；这里关注认证/授权模型和攻击面。

本评审没有修改代码、配置或权限。

## Current State

- `apps/web/src/app/api/auth/[...all]/route.ts` 根据 `AUTH_PROVIDER` 将 `/api/auth/*` 委托给 Better Auth 或 NextAuth；Clerk 路径返回 404。
- 同一路由在 `ACCESS_GATE_MODE=invite` 时阻断 OAuth 与 One Tap，避免社交登录绕过邀请码。
- Email sign-up 会先验证 `accessInviteCode`，成功注册后再 redeem invite；redeem 失败时返回 500，避免“用户已创建但 invite 未消费”的静默通过。
- OAuth start path 只允许 `google`、`github`、`apple`、`microsoft`，并通过 `sanitizeReturnUrl` 清洗 callback。
- 认证审计在 handler 之后派生，覆盖 login success/failure、logout、signup，但审计失败只 warn，不阻断用户流。
- `backends/gateway/src/routes/admin/index.ts` 仍使用 `X-Admin-Key` 与 `ADMIN_API_KEY` 的平台管理员入口，并包含跨租户操作和内存态 feature flag overrides。
- 管理员 feature flag override 当前是进程内 `Map`，注释标明生产应替换为 Redis/DB；这意味着它不具备多实例一致性、持久化审计或变更回滚。

## Architectural Tradeoffs

Option A: 保持当前 access gate 设计，但把管理员覆盖面纳入强治理。

- Pros: 保留本周 OAuth 修复成果，同时给跨租户管理员能力补上持久化、审计、双人确认和最小权限边界。
- Cons: 需要定义管理员工具、bot、网关之间的授权契约。

Option B: 把 access gate 和管理员 overrides 都迁入统一 feature flag/entitlement 平台。

- Pros: 中长期模型更一致，能统一审计、回滚和灰度。
- Cons: `@nebutra/feature-flags` 仍标记为 foundation 且 productionReady=false；过早收敛会放大未成熟平台的风险。

Option C: 继续用 `X-Admin-Key` 和内存 overrides 作为运营工具。

- Pros: 简单，适合早期内部运维。
- Cons: 不适合多实例生产、无法证明谁改了什么、无法可靠回滚，且跨租户能力的 blast radius 过大。

Recommended direction: Option A. Access gate 作为认证入口先保持明确、可测；管理员跨租户能力需要单独升级治理，不应被普通 feature flag 抽象掩盖。

## Decision Information Needed

- 哪些管理员路由实际暴露在公网、内网、VPN、Slack bot 或 GitHub Actions 环境中。
- `ADMIN_API_KEY` 的轮换频率、保管位置、调用者清单和审计要求。
- 管理员 feature flag override 是否仍被真实运营使用；如果使用，是否必须持久化到 Redis/DB。
- Invite-only 模式是否允许任何 OAuth 例外，例如企业 SSO、内部员工、测试租户。
- OAuth callback 清洗策略是否需要覆盖 locale、workspace、desktop handoff 和 deep-link 场景。
- 认证审计事件是否需要失败重试或 outbox，还是保持 best-effort。
- 是否需要对跨租户管理员动作引入双人确认、变更原因和自动过期时间。

## Proposed Decision Path

1. 盘点所有 auth entrypoint：email sign-up、OAuth start、One Tap、desktop auth、session、sign-out。
2. 将 access gate 的允许/阻断矩阵写成认证架构决策表，并补齐 provider-specific 测试。
3. 为管理员跨租户操作定义最小权限、审计、轮换和持久化规则。
4. 决定管理员 feature flag overrides 是临时运维工具、正式平台能力，还是待删除债务。

## Non-Goals

- 本 RFC 不修改认证行为或管理员路由。
- 本 RFC 不自动创建账号、不授予权限、不调整共享访问控制。
- 本 RFC 不把安全测试失败改成跳过、恒真或 `continue-on-error`。
