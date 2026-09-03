# 观澜产品化路线图

> 目标水位：Lovart / 即梦 / Flowith / Liblib 那一档的 AI 创作 SaaS。
> 约束：**不新增任何 workspace 包**——这条路线图是把已建好的地基接上，不是扩张
> （见 [closure-phase](../architecture/2026-08-27-closure-phase.md)：
> "does not authorize: New workspace packages, product names, or infra categories"）。
> 产品语言遵守 [PRODUCT.md](../../apps/kuanlan/PRODUCT.md)：Moment / 开拍 / 想法 /
> 再拍一会儿。全文不出现「生成」「Prompt」「历史记录」。

---

## 一、这一档产品的水位线

Lovart、即梦、Flowith、Liblib 形态各异，但作为「花钱换产出」的 AI 创作 SaaS，
它们共享同一套底座。把它拆成能验收的能力，而不是功能清单：

| # | 能力 | 用户能感知到的样子 |
|---|---|---|
| 1 | **额度可见，且先于动作** | 余额一直在视野里；点「开拍」之前就知道这一张扣多少 |
| 2 | **异步任务 + 实时进度** | 提交后立刻返回，能关页面、换设备，回来还在跑 |
| 3 | **产出是数据，不是文件** | 每一张都记得自己用了什么规格、花了多少、跑了多久、成没成 |
| 4 | **失败自动退款** | 没出图就不该扣钱，且告诉你为什么，一键再试 |
| 5 | **并发与频率有上限，且看得见** | 「你还有 2 个在排队」，而不是默默拒绝或默默烧钱 |
| 6 | **内容审核在两端** | 上传和产出都过一遍，不合规当场说清楚 |
| 7 | **每个界面三态齐全** | 空 / 载入 / 出错，没有一处白屏 |

第 1、2、4 条是「不草台」的分水岭。一个同步阻塞三分钟、失败照扣钱、余额看不见的
产品，界面做得再好也是草台。

---

## 二、观澜现在在哪

审计结论，全部有据：

| 维度 | 现状 | 证据 |
|---|---|---|
| 依赖 | 只有 `auth` / `brand` / `fonts` / `storage` / `tokens` | `apps/kuanlan/package.json` |
| 日志 | **一条都没有** | `src/` 内零 `console.*`、零 `@nebutra/logger` |
| 数据库 | **完全没接** | Prisma 92 个模型无一属于观澜 |
| 真相存储 | R2 桶列表 | `listIdPhotoMoments` 直接 `listDetailed(prefix)` |
| 限流 | 无 | 开拍路由只校验会话 |
| 额度 / 计费 | 无 | 登录即免费无限拍 |
| 花钱上限 | **无** | 全体用户共用一把 `ROUTER_API_KEY` |
| 网关保护 | **不在路径上** | `backends/gateway/src` 搜不到 kuanlan |
| 人脸同意 | 无 | 无告知、无勾选、无记录 |
| 删除 / 保留期 | **无** | 原图 `{id}.source` 永久留存，界面无删除入口 |
| 异步 | 无 | `maxDuration = 180`，同步阻塞三分钟 |
| 幂等 | **无** | 双击 = 两次 302.ai 调用 = 双倍花钱 |
| 错误边界 | 无 | 无 `error.tsx` / `global-error.tsx` / `not-found.tsx` |

对照第一节：**七条一条都不成立。**

现在真正的安全网只有两样：`package.json` 里的 `productionReady: false`，和
`layout.tsx` 里的 `robots: noindex, nofollow`。只要它们还在，以上都可以缓；
一旦撤掉其中任何一个，第三节的 P0 就是硬门槛。

---

## 三、决定性事实：地基已经建好了

这份路线图之所以不需要新包，是因为平台早就把这些建完了，只是观澜没用：

| 需要什么 | 已有的 | 状态 |
|---|---|---|
| 异步任务模型 | `Task`：`status` / `progress` / `payload` / `result` / `error` / `idempotencyKey` / `queueName` / `providerJobId` / `startedAt` / `completedAt` | schema 已有 |
| 任务状态机 | `TaskStatus`：`QUEUED RUNNING SUCCEEDED FAILED CANCELLED` | schema 已有 |
| 积分账本 | `CreditBalance` + `CreditTransaction`（含 `balanceAfter` 跑账、`expiresAt` 过期、`relatedId` 关联） | schema 已有 |
| 积分服务 | `@nebutra/billing`：`getCreditBalance` / `deductCredits` / `refundCredits` / `hasEnoughCredits` / `getCreditTransactions` / `formatCredits` | 代码已有 |
| 成本账（供给侧） | `UsageLedgerEntry`：`unitCost` / `totalCost` / `idempotencyKey` | schema 已有 |
| 双账本封装 | `@nebutra/prepaid-wallet` 的 `UsageEnvelope`（客户扣费真相 + 供给成本） | WIP，contracts 齐 |
| 同意记录 | `UserConsent`：`documentSlug` / `documentVersion` / `consentContext` / `withdrawnAt` / `ipAddress` | schema 已有 |
| 队列 | `@nebutra/queue`（QStash / BullMQ / memory 自动选型） | foundation |
| 限流 | `@nebutra/rate-limit`（tokenBucket / slidingWindow） | foundation |
| 用量与配额 | `@nebutra/metering` + `evaluateUsageLimit` | foundation |
| 通知 | `@nebutra/notifications`（in_app / email / push） | **stable** |
| 日志 | `@nebutra/logger` | foundation |
| 审计 | `AuditLog` + `@nebutra/audit` | 已有 |
| 上传记录 | `UploadRecord` | schema 已有 |
| 灰度 | `@nebutra/feature-flags` | foundation |

**所以工作量的性质是接线，不是造轮子。** 唯一需要真正决策的是下面这一条。

### 唯一的架构决策：积分挂在谁身上

`CreditBalance.tenantId` 是 `@unique`——**一个租户一个余额**。
`@nebutra/billing` 的 `deductCredits({ organizationId, ... })` 也按租户取。
但观澜是 C 端，每个人有自己的额度。两条路：

| 方案 | 做法 | 代价 |
|---|---|---|
| **A. 个人租户**（建议） | 首次登录时为该用户建一个 personal tenant，`tenantId = userId` 语义 | 零 schema 变更、零迁移、零波及面；沿用 `@nebutra/tenant` 的 AsyncLocalStorage 与 RLS |
| B. 给余额加 userId | `CreditBalance` 增 `userId`，改唯一约束 | 需要迁移，且动到所有已在用 billing 的表面 |

选 A。它不需要动任何共享 schema，符合 closure phase「收敛不扩张」，而且和现有
`deductCredits` 签名天然对齐。代价只是要在登录回调里保证 personal tenant 存在。

---

## 四、一次「开拍」应该长什么样

这是整条路线图的脊柱。当前实现是第 7 步孤零零一条，其余全缺：

```text
用户点「开拍」
 │
 1  限流 + 并发闸        rate-limit：每分钟 N 次、同时最多 M 个在跑
 2  同意闸              UserConsent 里有没有当前版本的人脸条款
 3  上传审核            尺寸/类型/内容安全；不合规当场退回，不进队列
 4  预扣额度            deductCredits({ relatedId: taskId })          ← 花钱之前
 5  建任务              Task(QUEUED, idempotencyKey)  ← 双击不产生第二条
 6  入队                @nebutra/queue
 └─ 立刻返回 taskId ────────────────────────────────► 前端插入 pending 卡片

worker
 7  Task→RUNNING → router.nebutra.com → sharp 裁切 → R2 写入
 8a 成功  Task→SUCCEEDED(result)  + UsageLedgerEntry(供给成本)
 8b 失败  Task→FAILED(error)      + refundCredits({relatedId:taskId})  ← 没出图不扣钱
 9  通知                @nebutra/notifications（in_app 至少）
```

四个必须成立的性质：

- **先扣后花**：第 4 步在第 7 步之前。`cost-guardrails.md` 说平台层面这条还没做到
  （"Neither is done."），观澜自己这一层必须先立起来。
- **失败必退**：`refundCredits({ relatedId: taskId })`。注意库本身不防重复——
  `refundCredits` 内部只是 `addCredits(type: "REFUND")`，是否已退过必须由调用方
  按 `relatedId + type=REFUND` 查 `CreditTransaction` 自行判定。
- **幂等**：`Task.idempotencyKey` 由「用户 + SKU + 尺寸 + 原图哈希」派生，
  双击、断网重试、页面刷新都落到同一条任务。
- **可离开**：真相在 `Task` 表，不在那个 HTTP 连接里。关页面不影响。

---

## 五、状态管理

这是最容易做成草台的一块，单独写。

### 真相在数据库，不在桶里

当前 `listIdPhotoMoments` 是 `listDetailed(R2 prefix)` —— 桶里有什么就是什么。
这条必须换成查 `Task`：桶降级为产物存储，不再是真相。

带来的直接好处：能查到失败的、进行中的、已删除的；能按 SKU 统计；能算成本。
桶做不到任何一条。

### 客户端

观澜现在是纯服务端组件（`force-dynamic`，零客户端状态）。异步产品做不到这样，
但也不该因此引入一整套状态库。够用的最小形态：

| 关注点 | 做法 |
|---|---|
| 列表来源 | `GET /api/shoots?since=<cursor>`，返回该用户的 `Task` 分页 |
| 轮询 | 有在跑的任务时 2s，全部落定后退避到 30s，页面隐藏时暂停 |
| 乐观插入 | 提交即插入一张 pending 卡片，key 用 `idempotencyKey`，服务端返回后按同 key 就地替换——不会出现「闪两张」 |
| 跨标签页 | `BroadcastChannel` 广播任务落定，避免每个标签页各自轮询 |
| 进度 | `Task.progress`；worker 在关键节点写入（入队 / 已调用模型 / 已裁切 / 已落库） |
| 断线 | 刷新即重新拉取——因为真相在库里，客户端不持有任何独占状态 |

**先不要上 SSE/WebSocket。** 退避轮询在这个量级足够，且没有连接管理成本。
等到「排队位置」需要秒级更新时再换，接口形状不变。

### 三态是硬要求

每个能加载数据的表面都要有空、载入、出错三态，包括 `/moments`、`/me`、
`/create`。当前 `/moments` 只有空态和成功态，R2 挂了只有一句「这一刻还存不进去」。
`error.tsx` / `global-error.tsx` / `not-found.tsx` 一个都还没有。

---

## 六、分期

沿用仓库的 P0→P3 语汇。每期给可验收标准，不给工时。

### P0 — 让真人进来之前必须有（止血）

| 项 | 落点 |
|---|---|
| 人脸单独同意 | `UserConsent` + `LegalDocument`；首次开拍前的独立告知，版本化、可撤回 |
| Moment 可删除 | 删除即同时删 `{id}.png` 和 `{id}.source`；`/me` 上给入口 |
| 明确保留期 | 写进条款并真的执行（到期清理原图） |
| 每用户配额 + 限流 | `@nebutra/rate-limit` + `@nebutra/metering`；先用保守常量，不必先接计费 |
| 接日志 | `@nebutra/logger`；开拍全链路打点 |
| 错误边界 | `error.tsx` / `global-error.tsx` / `not-found.tsx` |

**验收**：一个登录用户无法在一小时内烧掉超过设定金额；用户能删掉自己的脸；
一次开拍失败能从日志里查出死在哪一步。

> 依赖：closure phase 的 P0（仓库可信）是上游门槛，官方 Release 在它绿之前不发生。
> 但上面这些是观澜自己表面内的事，可以并行推进。

### P1 — 成为一个产品（收钱之前）

| 项 | 落点 |
|---|---|
| 个人租户 | 登录回调里保证 personal tenant 存在 |
| 异步化 | `Task` + `@nebutra/queue`；开拍改为立刻返回 taskId |
| 幂等 | `Task.idempotencyKey` |
| 积分 | `@nebutra/billing` 的 credits；余额常驻界面，开拍前显示单价 |
| 失败退款 | `refundCredits({ relatedId: taskId })` + 调用方去重 |
| 成本账 | `UsageLedgerEntry` 记供给侧成本，和扣费对账 |
| 真相迁移 | `listIdPhotoMoments` 从查桶改为查 `Task` |

**验收**：关掉页面再回来，在跑的那张还在跑；失败的那张钱回来了；
后台能回答「这个用户拍了几张、花了多少、我们成本多少」。

### P2 — 质感（对齐第一节的水位）

| 项 | 落点 |
|---|---|
| 实时进度 | `Task.progress` + 退避轮询 + 乐观插入 |
| 并发可见 | 「还有 N 个在排队」 |
| 再拍一会儿 | 基于已有 Moment 改参数重拍（PRODUCT.md 的用词） |
| 通知 | `@nebutra/notifications` in_app + email |
| 内容审核 | 上传端 + 产出端；中国上线必须 |
| 三态齐全 | 每个表面 |
| 灰度 | `@nebutra/feature-flags` 控新 SKU 放量 |

**验收**：第一节七条能力逐条可演示。

### P3 — 增长

撤 `noindex`、接 `@nebutra/i18n`、接 `@nebutra/analytics`、
邀请与推荐（`Referral` / `AccessInviteCode` 模型已有）、公开作品墙（需先解决肖像授权）。

---

## 七、明确不做

- **不新增任何包**（closure phase 禁止）。以上全部落在 `apps/kuanlan` 内 + 现有包。
- **不碰 PRODUCT.md 没有的名词**：写真主题、旅游目的地、穿搭商品、商业套餐选品。
- **不做上传识图建衣柜**：那条管道还没开，不要提前造。
- **不引入「生成 / Prompt / 历史记录」这套词**——这是产品语言的红线，不是文案偏好。
- **不为了实时而上 WebSocket**：退避轮询够用，接口形状留好升级余地。
- **不在同一个 PR 里既接数据库又改目录结构**（closure phase 的手术原则）。

---

## 八、下一步

P0 里最便宜、止血最快的两件，可以直接开工，互不依赖：

1. **每用户配额 + 限流**——纯 `apps/kuanlan` 内，接两个现成包，无 schema 变更。
2. **同意 + 删除 + 保留期**——需要 `LegalDocument` 落一份人脸条款，
   其余用现成的 `UserConsent`。删除入口天然落在刚做完的 `/me` 上。

两件都完成后，`productionReady` 才有资格从 `false` 翻过来。
