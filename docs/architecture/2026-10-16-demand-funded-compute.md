# 需求先付，供给后开 — Demand-funded compute

- **Date:** 2026-10-16
- **Status:** Proposed
- **Owner:** Tseka
- **Related:** proposal 2026-10-16 status product, ADR 2026-09-27 product wallets,
  ADR 2026-09-26 Creem global payments, ADR 2026-09-30 supply capability probing,
  ADR 2026-05-10 TS-by-default (Python only when justified)

## 意图（owner 原话）

> 我暂时不想给 Modal 充钱。我想等 Nebutra 的用户充钱了之后，Nebutra 的网关自动给 Modal 充钱并启用。
> 按需启用上游供应链，保证我们在数学上不可能亏。这个 Modal 计划之后会推广到 Nebutra 生态中
> 依赖独立算力的服务，也就是整个平台会越跑越赚钱。

翻成一条规则：**客户的钱先进来，上游算力才花出去；花出去的永远少于进来的。** Nebutra 不预垫
任何可变成本，平台只承担可以被证明有上限的固定成本。

## 约束：Modal 实际怎么收钱（2026-10-16 核对）

| 事实 | 出处 |
|---|---|
| 必须绑一张支付方式才能用 Modal，按月后付，跨过阈值时月中增量扣款 | modal.com/docs/guide/billing |
| **Spend limit** = 扣除赠额后的净支出上限；到达时 "Modal stops workloads that would incur additional out-of-pocket charges" | modal.com/docs/guide/budgets |
| Budget / spend limit 只能由 Owner/Manager 在 Usage & Billing 页面设置；文档未提供 API/CLI | 同上 |
| 能设的最高额度取决于此前成功扣款的历史，扣款成功后上限才会抬高 | 同上 |
| 用量报表 API（`Workspace.billing`、`modal billing`）只在 Team / Enterprise 档 | modal.com/docs/guide/billing |
| Starter 档每月 $30 赠额，5 个 cron，无月费 | modal.com/pricing |

**结论：** "网关自动给 Modal 充钱" 字面上做不到——Modal 没有预付充值，也没有设置额度的 API。
但 owner 要的效果做得到，而且更稳：

1. **绑卡 + spend limit 设为 $0。** $0 是净支出上限，意思是只花 Modal 每月 $30 赠额，
   一分钱都不会从卡里扣。这就是"暂时不充钱"的精确实现。
2. **钱在我们这边先收、先记账。** 是否启用某个客户的算力，由网关根据该客户已付的钱决定，
   不由 Modal 决定。Modal 的 spend limit 只是兜底的保险丝，不是记账工具。
3. **保险丝只在钱已经到账后才调高，**并且永远不高于已到账的储备金。因为没有 API，
   这一步是网关算好数字、推一条通知、owner 点一次；保险丝按台阶调整（$0 → $50 → $200 → …），
   一个月最多动一次。

所以"按需启用"发生在**租户层**，不在部署层：Modal app 只部署一次，调度器每轮从数据库读出
"已付费且有额度"的工作，没付钱的工作根本不会被派发。客户付款几秒后就能生效，不需要任何人手动操作。

## 决策

### 五条不变量（"数学上不可能亏"的定义）

| # | 不变量 | 由谁强制 |
|---|---|---|
| I1 | **定价覆盖两倍最坏成本**：每个套餐 `价格 × (1 − 支付费率) − 固定手续费 ≥ 2 × Σ(配额 × 单位成本)` | 报价表 CI 检查（`ops/nebutra/offers.json` 每个 offer 声明配额与单位成本，脚本验算） |
| I2 | **先付后用**：派发一项工作前，该租户钱包里必须有能覆盖它剩余周期最坏成本的已付余额或有效订阅 | 网关的激活门（activation gate），与 product wallets 同一账本 |
| I3 | **上游硬上限 ≤ 已到账储备 + 上游赠额**：任何供应商的可透支额度都不超过已经收到的钱 | 每个供应商的硬上限机制（Modal spend limit、DashScope 预付、Router 余额…） |
| I4 | **免费档只花上游赠额**：免费用户的算力总预算 = 上游免费额度；赠额用完时免费工作降级（拉长间隔、减少区域），绝不花钱 | 调度器按"免费池余额"派发 |
| I5 | **没有常驻固定成本，除非已被收入覆盖**：一切默认缩到零；只有当过去 3 个月的毛利 ≥ 12 个月承诺额时，才允许把稳定负载换成包年或常驻机器 | 季度复核，写进本 ADR 的修订记录 |

### 机制：Compute Treasury（算力金库）

product wallets 记的是"客户欠我们什么、我们欠客户什么"。算力金库补另一半：
"我们欠上游什么"。

```
客户付款 (Creem / 微信 / 支付宝)
   └─▶ product wallet (credit_balances, per tenant × product)
          └─ 激活门：reserve(worst_case_cost(剩余周期配额)) ─▶ 调度器才派发
                                                     │
compute_treasury (per supplier)                      ▼
   funded_reserve   = Σ 已到账且未消耗的成本份额      Modal / DashScope / …
   supplier_cap     = 当前上游硬上限（spend limit）   实际消耗按自测成本记账
   recommended_cap  = min(funded_reserve, 下一台阶)    （Starter 没有用量 API，
   当 recommended_cap > supplier_cap → 通知 owner 调高   靠 worker 自报的 CPU 秒）
   当 本月自测消耗 > 0.8 × supplier_cap → 降级免费池，再告警
```

- **成本记账自己做**：每个 worker 上报自己的 CPU 秒、内存秒、出口流量，按公开单价 × 1.15（区域倍率）
  计价，月底与 Modal 账单人工对账一次；升 Team 后改用 `modal billing` 自动对账。
- **保险丝不追着收入跑**：只在台阶跨越时调整，避免 owner 每天点按钮。
- **退款与拒付**：已消耗的成本份额不退回金库；Creem 作为 merchant of record 处理拒付，
  损失上限 = 单笔订单的成本份额，被 I1 的 2× 覆盖。

### 推广到整个生态

每个依赖独立算力的服务，在 `supply registry` 里登记一行，就自动纳入同一套规则：

| 服务 | 上游 | 计费方式 | 硬上限机制 | 现状 |
|---|---|---|---|---|
| Status 探测 / 通知 | Modal | 后付，赠额 $30/月 | spend limit | 本 ADR 的第一个用户 |
| Router | 各模型供应商 | 预付余额 | 供应商余额本身 | **已满足**：客户预付 USD 余额（ADR product wallets） |
| Para 生图/生视频 | DashScope（百炼） | 后付 / 资源包 | 百炼额度告警 + 资源包 | **I2 已满足**：提交时先扣积分、失败退回（`backends/gateway/src/lib/para-credits.ts`）；I3 未满足——百炼侧没有与收入挂钩的硬上限 |
| KCQ 托管 AI | 模型供应商 | 预付 | 产品钱包 | 已计入 KCQ 钱包（7adf2289d） |
| 观澜 Kuanlan 渲染/AI | DashScope / 自有算力 | 同上 | 同上 | 需审计 |
| backends/python/ai 批处理 | 当前在 Fly | 固定机器 | — | 候选：迁 Modal，缩到零 |
| Fly 常驻 app | Fly | 后付，按机器 | 20 台上限（owner 不提额） | 固定成本，受 I5 管 |

## 罗盘

**北 — 方向是对的。** 这是 Router 已经在跑的模式（客户预付 → 才调用上游），推广成平台规则。
它把 Nebutra 的风险结构从"先垫钱再赚钱"变成"先收钱再花钱"，对一人公司是正确的形状：
没有融资缓冲，现金流不能为负。

**东 — 真正的复利在哪里。** "越跑越赚钱"成立，但来源要说准：

- 单位毛利不会随规模变高（I1 固定在 ≥ 50%），变高的是**固定成本摊薄**：Fly 机器、域名、
  CI、owner 的时间，这些不随客户数增长。
- 第二个来源是 I5 的**规模切换**：Modal 在约 5 万监控以上比常驻机器贵 3–5 倍。一旦收入证明了
  稳定负载，把它搬到包年机器上，单位成本下降而价格不变。缩到零买的是"不亏"，常驻买的是"多赚"，
  顺序不能反。
- 第三个来源是**同一套金库服务多个产品**：每接一个新产品，只是 registry 多一行，不是新一套计费。

**南 — 哪里还会亏，需要说实话。** "数学上不可能亏"在**每一笔交易**上成立；在**公司层面**，
亏损被限定在一个可知的上限内，而不是零：

| 剩余风险 | 上限 / 处理 |
|---|---|
| 固定成本（Fly、域名、Cloudflare $5） | 已知月额；由 I5 管住不新增 |
| 上游涨价 | 2× 安全系数先吸收；报价表保留"提前 30 天调价"条款 |
| 自测成本低估（Starter 无用量 API） | spend limit 兜底；月度人工对账；单价已含 1.15 区域倍率 |
| 汇率（CNY 收、USD 付） | 人民币价按 ≥ 7.3 定，季度复核 |
| 免费档滥用 | I4：免费只花赠额，赠额用完即降级，账面损失为 0 |
| 一个 bug 绕过激活门 | 上游硬上限（I3）把损失封顶在一个台阶内 |

**西 — 不做的事。**

- 不为了"自动充值"去自动化 Modal 网页后台（脚本登录点按钮）：违反服务条款，且保险丝就该由人调。
- 不在没有付费客户时升 Modal Team（$250/月）——那是一笔没被收入覆盖的固定成本，违反 I5。
- 不给任何上游设"无限额度"，哪怕是自己用。
- 不先上线再补计费：新产品没有在 registry 里登记单位成本与硬上限，就不能接付费流量。

## 执行顺序

1. Owner 一次性：Modal 账户绑卡，spend limit 设 $0（`modal token new` 给网关部署用）。
2. 金库与激活门落在 gateway + product wallets 账本上（`compute_treasury`、`supply_registry` 两张表，
   按 Prisma 单一来源规则生成 RLS）。
3. Status 探测作为第一个接入者（proposal P2）：Nebutra 自身页与免费档全部跑在 $30 赠额内。
4. 给百炼补 I3：资源包或额度告警挂到金库的台阶上（Para 的 I2 已经满足）。
5. 报价表 CI 检查（I1），所有 offer 声明配额与单位成本。
6. 第一个付费客户到账后，网关提示把 Modal spend limit 调到第一个台阶。

## 修订记录

- 2026-10-16：Proposed。
