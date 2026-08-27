# RFC: Tenancy Model 2 — `Tenant` 超类型（Organization | Individual）

- **日期**: 2026-06-02
- **状态**: Proposed（待评审）
- **前置**: RLS 会话变量已统一为 `app.current_tenant_id`（见 memory `rls-tenant-id-convention`）。本 RFC 是其下一步：把数据模型从 org-only 提升为 Tenant 超类型。
- **关键前提**: **当前无生产数据** → 这是一次 **schema + 代码重构**，不是数据迁移（无需 backfill / expand-contract / 双写）。若未来有生产再做则结论不同。

## 1. 背景与决策

Startup OS 的本体里，**个人（创始人 / solo dev）是先于、独立于、横跨组织的一等实体**（`idea-plaza` / `cofounder-match` / `founder-cemetery` / `founder|solo_developer|cto` 角色为证）。当前模型 **租户 ≡ Organization**（30/70 模型挂 `organizationId`），无法干净表达"先于任何 org 存在的创始人"。

**决策**：采用 **Model 2 — `Tenant` 超类型**。`Organization` 与个人 `User`-账户都是一种 `Tenant`；数据归属列统一为 `tenant_id`；RLS 沿用已就位的 `app.current_tenant_id`。三者同名一致：`Tenant` 实体 / `tenant_id` 列 / `app.current_tenant_id` 变量。

（否决 Model 1「个人=单人组织」：会把先于 org 的创始人硬塞进假 org，是 Startup OS 的本体错误。）

## 2. 目标数据模型

```prisma
enum TenantKind { ORGANIZATION INDIVIDUAL }

model Tenant {
  id             String     @id @default(cuid())
  kind           TenantKind
  organizationId String?    @unique @map("organization_id")
  userId         String?    @unique @map("user_id")
  organization   Organization? @relation(fields: [organizationId], references: [id])
  user           User?         @relation(fields: [userId], references: [id])
  createdAt      DateTime   @default(now()) @map("created_at")
  // CHECK 约束（raw migration）：kind=ORGANIZATION ⇒ organizationId NOT NULL 且 userId NULL；反之亦然
  @@map("tenants")
}
```

- 每个 `Organization` 1:1 一个 `Tenant(kind=ORGANIZATION)`；每个开通个人空间的 `User` 1:1 一个 `Tenant(kind=INDIVIDUAL)`。
- 30 个业务模型的 `organizationId` → `tenantId @map("tenant_id")`，FK 指向 `Tenant.id`。

## 3. 受影响的 30 个模型（`organizationId` → `tenantId`）

APIKey · AtelierCanvas · AuditLog · BAInvitation · BAMember · ChatSession · CodeRedemption · Connector · Content · CreditBalance · CustomerFeatureOverride · CustomerPlanVersion · CustomerUsageLimit · FeedbackReport · Integration · Invoice · OAuthClient · Order · OrganizationInvitation · OrganizationMember · Payment · PaymentMethod · Product · RequestLog · StripeCustomer · Subscription · Thread · UsageLedgerEntry · UserConsent · UserSkill

> 注：`OrganizationMember` / `OrganizationInvitation` 语义上仍是"组织成员/邀请"——它们的 `tenantId` 永远指向 `kind=ORGANIZATION` 的 Tenant。个人租户无成员表（user 即 owner）。

## 4. RLS 改动（3 处，变量不变）

- Prisma 迁移 `20260313000000_enable_rls`：策略 `organization_id = current_setting('app.current_tenant_id', true)` → `tenant_id = …`。
- `infra/data/database/policies/rls.sql`：同上（顺带删过期表 `wallets`/`nfts`/`tenant_usage`，并就"是否保留这套 psql 部署 vs 以 Prisma migrate 为唯一来源"单独决策）。
- `packages/iam/tenant/generateRlsPolicySql`：`DEFAULT_TENANT_COLUMN` `organization_id` → `tenant_id`（+ 更新快照测试）。

## 5. RBAC 改动

- `permissions` 包当前 **0 处** 引用 `organizationId`（CASL 抽象，已解耦）→ 主体不变。
- 授权主体从"组织成员角色"泛化为"租户内主体"：
  - `kind=ORGANIZATION`：沿用 `OrganizationMember.role`（enum `Role`）。
  - `kind=INDIVIDUAL`：该 user 对自己的租户隐式 `OWNER`（全权），无需成员表。
- `requirePermission(action, resource)` 在租户上下文内求值；H3（`requireRole`→CASL）应在本轮一并对齐（否则 requireRole 仍假设 org 语义）。

## 6. 解析 / 上下文（改动极小）

`@nebutra/tenant` 的 resolvers（fromHeader/JwtClaim/Path/Subdomain）已返回类型无关的 `tenantId` 字符串 → 几乎不动。仅需：注册/登录流在创建 User 时同步建 `Tenant(kind=INDIVIDUAL)`；创建 Organization 时建 `Tenant(kind=ORGANIZATION)`（在 `tenantProvisioning` inngest 里加一步）。

## 7. 代码改点规模

`organizationId` 出现在 **~222 文件**（apps/web 63 · gateway 39 · packages 120）。字段重命名 `organizationId`→`tenantId` 会波及所有 `.organizationId` / `where:{organizationId}` 访问点。

**⚠️ 待定（最大成本驱动，见 §10-Q1）**：
- 方案 A（字段也重命名）：Prisma 字段 `organizationId`→`tenantId`，~222 文件走 **codemod** 批量改。彻底一致、代码不再撒谎，但改动面最大。
- 方案 B（仅列名）：保留 Prisma 字段名 `organizationId`，仅 `@map("tenant_id")` + 改 RLS。~222 代码文件**不动**，但代码层仍叫 `organizationId`（对个人租户是命名谎言）。

## 8. 执行序（无生产 = 纯重构；每步独立可 revert）

1. 加 `enum TenantKind` + `model Tenant`（+ CHECK 约束 raw migration）。
2. 30 模型 `organizationId`→`tenantId @map("tenant_id")` + FK 指向 Tenant（按 §7 选 A/B）。
3. 改 3 处 RLS（列名 org→tenant_id；变量不变）。
4. provisioning 加 Tenant 建立步（org + individual）。
5. RBAC 泛化（含 H3 requireRole→requirePermission 对齐）。
6. 若选方案 A：跑 codemod 批改 ~222 文件的 `.organizationId`→`.tenantId`。
7. `prisma generate` + 全量 typecheck/test 验证；worktree 隔离执行。

## 9. 风险与回退

- 风险：纯 schema/代码重构，**无数据风险**（无生产）；主要风险是 ~222 文件 codemod 的遗漏 → 由 tsc + 测试兜底。
- 回退：每步独立 commit，`git revert` 即可；无数据状态需恢复。

## 10. 开放问题（评审时定）

- **Q1（关键）**：字段重命名 方案 A vs 仅列名 方案 B？（决定是否动 ~222 文件）
- **Q2**：`infra/.../rls.sql` + `setup-db.sh` 这套 psql 部署是否保留？还是以 Prisma migrate 为 RLS 唯一来源、退役 rls.sql？（顺带删过期表）
- **Q3**：个人租户何时创建——首次登录即建，还是首次需要私有数据时懒建？
- **Q4**：H3（requireRole→CASL）并入本轮，还是单独 pass？
