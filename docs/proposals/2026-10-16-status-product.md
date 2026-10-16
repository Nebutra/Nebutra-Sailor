# Nebutra Status — 把 status.nebutra.com 产品化

Date: 2026-10-16 · Status: Proposed (revised same day, see §0) · Owner: Tseka · Related: ADR 2026-09-24 Sailor convergence,
ADR 2026-09-30 supply capability probing, ADR 2026-10-02 self-hosted Inngest

> 一句话：**中英双语、中国大陆可达、能接 AI 供应商与设备舰队的状态页**——incident.io 的质感，
> Statuspage 的渠道广度，Flashduty 的中国通道，而且每个客户的成本被配额封顶，不可能亏。

## 0. 修订（2026-10-16，owner）

> 那就不给小芽换了，小芽还是自己运维。但是我希望小芽的轮子还是能换成自部署版本的 Nebutra Status，
> 就像自部署的 Mintlify 一样。

这改变了产品形态，下文与之冲突处以本节为准：

- **一份代码，两种发行**（OpenStatus 的模式：开源自部署 + 托管云）：
  - **Self-hosted**：一个 Docker 镜像 + 一个 Postgres。单租户，探测在进程内调度（不需要 Modal），
    本地管理员账号或任意 OIDC 登录。小芽部署在自己的阿里云上，自己运维，大陆可达不再是问题。
  - **Cloud**（status.nebutra.com 及付费客户）：同一个镜像以多租户模式运行，Nebutra IdP 作为 OIDC，
    探测扇出到 Modal，页面发布到 Cloudflare，计费走 ADR 2026-10-16 需求先付。
- **因此控制面不进 `backends/gateway` 和平台库。** 它是独立可部署的产品，必须自带数据库：
  `apps/status` 拥有自己的 Prisma schema 和自己的 `STATUS_DATABASE_URL`。这是"平台库唯一 schema"
  规则（ADR 2026-09-25）的一个明确例外，理由是：自部署方不运行 Nebutra 平台。Cloud 版的租户、计费
  通过 OIDC 声明与网关 API 对接，不跨库 join。
- **探测只有一份实现（TypeScript）。** 自部署在进程内跑；Cloud 版的 Modal 函数用一个装着同一份
  探测 bundle 的镜像以子进程方式调用，不写第二套 Python 探测器。
- **小芽的接入**：小芽在自己机器上跑 Nebutra Status 容器，nginx 把 `/status` 与 `/api/v1/status`
  转给它（兼容 profile `xiaoya-v1`，部署闸门不改）；Go 里的业务旅程把结果推到本机实例的
  `/v1/evidence`；依赖探测迁成实例里的监控；Prometheus 指标留在 Go。
- **分期改为自部署优先**：先做单租户自部署版，用 Nebutra 自己和小芽做两个真实用户，再加多租户、
  Modal、计费。这样每一期都有真实生产在跑。

| 期 | 内容 |
|---|---|
| P1 | `apps/status` 单租户：自有 schema、组件/分组/监控/事故/维护/订阅、进程内探测、证据 API、管理后台、公开页、Docker 镜像 + compose |
| P2 | 小芽替换（`xiaoya-v1` 兼容、证据推送、依赖监控迁移）；Nebutra 自身页迁到 P1 实例 |
| P3 | 多租户 + OIDC（Nebutra IdP）+ 静态快照发布到 Cloudflare / 阿里云镜像 |
| P4 | Modal 探测扇出 + 计费（需求先付） |
| P5 | 五个差异化能力 |

## 1. 成功的产品化是什么（验收即定义）

三条同时成立才算成功，任何一条做不到就不算上线：

1. **小芽用自部署版替换手搓 status，零改部署闸门**（§0：小芽自己运维）。 小芽 `scripts/deploy.sh` 用 jq 读
   `/api/v1/status` 的 `components[].verification.{coverage,verified,checked_at}` 判断发布能否切流；
   Nebutra Status 必须输出字节兼容的 JSON（兼容 profile `xiaoya-v1`），小芽删掉 `internal/ops/status*.go`
   之后 `deploy.sh`、`verify-production.sh`、Prometheus 规则一行不改仍然绿。
2. **UX 在十项最佳实践上全部达到或超过标杆**（§3 表），并且独占 5 个空白点（§4）。
3. **单客户毛利数学上为正**：任何套餐 `价格 × (1 − 支付费率) ≥ 2 × Σ(配额 × 单位成本)`，
   超出配额只有硬停或预付包，没有自动超额账单（§6）。

不是成功的样子：页面更好看但小芽还跑着自己那套；或者功能齐了但免费用户能把短信/邮件刷穿。

## 2. 现状：两套手搓，各缺一半

| | status.nebutra.com（`@nebutra/status`） | 小芽 `internal/ops` |
|---|---|---|
| 托管 | landing 的 host alias，Fly sin | 被监控 API 进程内的 goroutine，单机 |
| 探测 | 4 个写死目标，**每次页面访问都实时探测**；CF cron 只是触发 Fly 自己探 | 1 分钟依赖探测 + **5 分钟黑盒业务旅程**（合成租户 + 真 JWT/设备 key）+ AI 探针限额 16 次/天 |
| 存储 | 自建 Redis（与被监控对象同 org 同 region） | Postgres 表，90 天观测 |
| 页面 | incident.io 风格、90 天条、历史日历、事故时间线、维护窗口 | Go 模板，只有当前快照，**没有 uptime 条** |
| 事故 | 只能 curl + 共享 token；整个列表一个 JSON blob（并发丢更新、解析失败清空） | 非 operational 时自动生成一条，无生命周期 |
| 订阅 | 邮件双确认、Atom、JSON；Feishu/Slack 只给运维 | 通用 JSON webhook，仅依赖变化，无重试 |
| 独到之处 | 视觉、订阅、维护窗口 | **verification 新鲜度**（缺席探针绝不显示绿）、覆盖类型标注、发布闸门、上游 Statuspage 摄取、熔断器推导 AI 健康、设备心跳 |
| 共同缺陷 | 状态页和被监控系统同生共死；无多区域；无管理后台；无多租户 |

已确认的 bug（P0 立即修）：`probe.ts:61-66` 4xx 判 outage、5xx 判 degraded（反了）；页面与页脚
每次访问都触发 4–8 次外呼；事故 blob 读改写竞争；管理 token 非恒定时间比较；主页面正文只有英文。

**取长补短的结论**：数据模型和页面取 Nebutra；**证据模型取小芽**——组件状态不是"探一下通不通"，
而是"最近一次有效证据是什么、多新鲜、覆盖到哪一层（依赖 / 合成旅程 / 设备 / 上游厂商）"。
这是两套都没有完整做到、竞品也没做的东西，作为产品的核心抽象。

## 3. 对标：十项最佳实践

调研见 §9。头部 AI 公司：OpenAI/Linear/Perplexity 用 incident.io，Claude/Vercel/Cursor/Moonshot/
MiniMax 用 Atlassian Statuspage，DeepSeek 用 Flashduty。

| # | 模式 | 最佳实现 | 我们的做法 |
|---|---|---|---|
| 1 | 组件分组 + 组级可用率 | incident.io（OpenAI） | 组级 rollup + 组内数量 |
| 2 | 90 天日条 + 5 态图例 + 当日事故下钻 | Statuspage（Claude） | 已有，补下钻与延迟 |
| 3 | 区域组件（US/EU、边缘 POP） | Vercel、Linear | 探测区域即维度，自动生成 |
| 4 | 结构化事故时间线 + 持续时长 | Statuspage / incident.io | 已有，迁 Postgres |
| 5 | 组件级 / 事故级订阅 | Flashduty（全版本） | 全版本提供 |
| 6 | 多渠道订阅 | Statuspage | 邮件、RSS+Atom、Webhook、Slack、**飞书/钉钉/企微群机器人**，短信预付 |
| 7 | 延迟/可用率指标面板 | incident.io、Better Stack | 每区域 p50/p95，24h/7d/30d |
| 8 | AI 起草更新、人工发布 | 仅 incident.io | 经 Router 起草 + **中英成对发布** |
| 9 | 页内语言切换 | DeepSeek、incident.io | zh/en 一等公民，其余 34 种 AI 预填 |
| 10 | 受众分层页面（公开/内部/客户） | incident.io Ent、Statuspage（$300 起） | Business 档提供 |

## 4. 五个空白点（只有我们做）

1. **中国大陆可达**：Moonshot、MiniMax 用美国托管的 Statuspage 服务大陆用户。我们双边缘：
   Cloudflare 全球 + 阿里云 OSS/CDN（ICP 域名）镜像同一份静态快照。
2. **公众订阅走飞书/钉钉/企微群机器人**：Flashduty 只给内部页，西方厂商没有。几乎零成本，
   正是免费档能大方的原因。
3. **AI 供应商依赖状态**：OpenAI 明说只报"跨模型聚合"。我们直接复用 Router 的
   supply capability probing（ADR 2026-09-30）：按模型 × 区域报延迟与错误率，并声明
   "本产品依赖 DeepSeek / Qwen / Claude"，上游故障自动推导影响。小芽的熔断器推导与
   上游 Statuspage 摄取并入此处。
4. **设备舰队状态**：心跳 → 在线率组件（"在线设备 98.4%，5 分钟窗口"）。小芽已有心跳，没上页。
5. **发布闸门 API**：`GET /v1/pages/:id/gate?components=…&since=…` 返回所选组件在某时刻之后是否
   有已验证的新鲜证据。小芽的 deploy.sh 逻辑产品化，任何 CI 可用。

## 5. 架构

服务器挂 Modal，但**页面不挂 Modal**：状态页的流量峰值恰好出现在客户系统故障时，
Modal 有数秒冷启动、新账户 200 rps 上限、自定义域名要 Team 档（$250/月）。所以：

```
控制面   backends/gateway (Hono) + Postgres(Prisma, RLS 按 organization_id)
           页面/组件/监控/事故/订阅/配额 CRUD · 证据摄取 API · 管理后台在 apps/web
探测面   Modal (Python, 符合 ADR 2026-05-10 "批处理/平台限定")
           每区域 1 个 dispatcher cron → 每 2k 监控一个容器, asyncio 并发, scaledown_window=2
           HTTP / TCP / DNS / TLS 到期 / 关键字 / 上游 Statuspage 摄取 / 多步旅程
           状态变化须第二区域复核才开事故
推送证据  POST /v1/evidence (心跳、合成旅程结果、CI 结果) —— 小芽的业务旅程留在小芽,
           只把结果推上来; 合成租户永远不进 SaaS
通知面   Modal functions, 状态变化时 spawn: 邮件(SES 群发 / Resend 事务)、Webhook、
           飞书/钉钉/企微/Slack 卡片、短信(预付余额)
边缘面   每次状态变化渲染一份静态快照 → Cloudflare Workers 静态资源 (+ CF for SaaS 自定义域名)
           + 阿里云 OSS/CDN 镜像; 读流量成本 ≈ 0, 与被监控系统不共命运
指标     原始结果不落库; worker 内聚合为分钟 rollup + 状态变更, 写 ClickHouse(短 TTL) 与日表
```

Nebutra 自己是第一个租户：landing、console、gateway、docs、Router 每个供应商，以及
Kuanlan/Para。`@nebutra/status` 保留为 Sailor 模板内的轻量版（template: true），产品版独立在
`apps/status` + `workers/status-probe`。

### 小芽兼容 profile `xiaoya-v1`

| 小芽现有面 | 替换后 |
|---|---|
| `GET /api/v1/status`（deploy 闸门 jq） | 小芽路由改为反代 `status.<小芽域名>/compat/xiaoya-v1/status.json`，字段、组件 id、RFC3339 字节兼容；Nebutra 不可达时回落到本地最后一次快照 |
| `GET/HEAD /status` HTML | 302 到 Nebutra Status 托管页（大陆镜像） |
| 业务旅程 `business_probe.go` | 留在小芽，结果 `POST /v1/evidence`（coverage=synthetic, checked_at, latency） |
| 依赖探测 `status_aggregator.go` | 迁成 Nebutra 监控（含 atlassian_statuspage / json 源类型），删除 |
| `STATUS_WEBHOOK_URLS` payload | 通知面提供 `xiaoya-v1` webhook 模板，原样字段 |
| Prometheus `business_probe_*` | 小芽本地保留（指标属于小芽进程）；不迁 |
| 设备心跳 | 小芽按分钟推 `{online, total}` 聚合证据，不推单设备数据 |
| 内部页 `InternalStatus.tsx` | 保留其运行时细节部分；依赖 CRUD 改到 Nebutra 后台 |

## 6. 定价与"不可能亏"的数学

单位成本（2× 安全系数后）：探测 **$0.27 / 百万次**；邮件 **$0.20 / 千封**（SES）；Webhook/IM
≈ 探测成本；自定义域名 $0.10/个/月（CF for SaaS 前 100 个免费）；AI 起草经 Router ≈ $0.005/次；
Creem 费率按 5% + $0.5 计。

| 档 | 价格 | 配额（硬上限） | 最坏情况成本 | 最坏毛利 |
|---|---|---|---|---|
| Free | $0 | 1 页、自定义域名 1、10 监控 @3min × 2 区域、1k 邮件订阅者 / 1k 封/月、IM/RSS/Webhook 订阅不限人数但 10k 次投递/月、AI 起草 20 次 | ≈ $0.35 | 成本上限，见下 |
| Pro | $29 / ¥199 | 3 页、50 监控 @60s × 3 区域、5k 订阅者、25k 封、组件订阅、指标面板、AI 200 次 | ≈ $9.8 | 66% |
| Business | $99 / ¥699 | 10 页、200 监控 @30s × 5 区域、25k 订阅者、100k 封、私有/受众页、SSO、AI 1k 次 | ≈ $50 | 49%（典型 >85%） |
| Enterprise | 议价 | 大陆专属边缘、SLA、私有部署 | 合同覆盖 | — |

- 短信：只有预付余额，按成本 1.8× 计价，余额为 0 即停（UptimeRobot 惯例）。
- 配额用尽：邮件降级为页面 + 每日摘要，从不自动超额计费；超额只卖预付包。
- 免费档每户成本上限 ≈ $0.35/月；滥用护栏：每个已验证邮箱域名一个免费工作区；跨租户对同一目标主机
  限速（防止被当 DDoS 工具）；禁止内网/元数据地址（SSRF）；30s 间隔或 >1k 订阅者需绑卡。
- 固定成本 ≈ $45/月（Modal 3 区域常驻约 $40 + CF Workers 付费 $5），Modal Starter 的 $30 赠额覆盖大半；
  2 个 Pro 客户即覆盖。这是平台固定成本，不是单客户亏损——单客户层面数学上为正。
- 计费复用 `@nebutra/billing`（Creem 卡 + 微信/支付宝），钱包按产品独立（product wallets 规则）。

## 7. 分期

| 期 | 内容 | 退出条件 |
|---|---|---|
| P0 | 修现有 5 个 bug：4xx/5xx 反转、探测结果缓存（页面/页脚不再实时外呼）、事故逐条存储、恒定时间 token 比较、主页面 i18n | landing 测试绿，线上 status.json p95 < 100ms |
| P1 | 控制面：Prisma 模型（Page/ComponentGroup/Component/Monitor/Evidence/Incident/IncidentUpdate/Subscriber/Subscription/Delivery/Quota），gateway `/v1/status/*`，`apps/web` 后台 | Nebutra 自身页从数据库渲染，curl 写事故退役 |
| P2 | Modal 探测面 + 推送证据 API + 第二区域复核 + 自动开事故 | 3 区域探测上线，Nebutra 页不再由 landing 自探 |
| P3 | 静态快照边缘 + 自定义域名 + 阿里云镜像 + 新 status app UI（incident.io 质感） | 大陆、全球双边缘可达；landing 不再承载 status |
| P4 | 小芽 `xiaoya-v1` 兼容、设备证据、发布闸门 API；小芽删除 `internal/ops/status*` | 小芽一次正常发布全程经过新闸门 |
| P5 | 差异化：AI 供应商依赖（接 Router）、飞书/钉钉/企微公众订阅、中英成对 AI 起草、指标面板 | 十项最佳实践表全部打勾 |
| P6 | 计费与配额、注册自助开通、营销页 | 第一个外部付费客户 |

## 8. 需要 Owner 的只有

- Modal 账户 token（`modal token new`），以及是否在流量起来后升 Team（$250/月，解锁 >5 cron 与 modal.run 自定义域名——按本架构 P0–P5 用不到）。
- 产品对外名字（暂用 Nebutra Status）。
- 小芽仓库的合并权限与一次发布窗口（P4）。

## 9. 证据

- 竞品调研（2026-10-16）：Statuspage、incident.io、Better Stack、Instatus、Flashduty、OpenStatus、
  Statuspal、Hund、Sorryapp、UptimeRobot、Checkly、PagerDuty 的定价页与文档；status.openai.com、
  status.claude.com、status.deepseek.com、vercel-status.com、linearstatus.com、status.cursor.com
  页面指纹。incident.io AI 起草更新上线于 2026-08-18；incident.io 9 种语言、Better Stack 8 种均无中文。
- Modal 定价（modal.com/pricing，2026-10-16）：CPU $0.0000131/物理核秒，内存 $0.00000222/GiB 秒，
  宽区域 1.15×、窄区域 1.75×，Starter 5 个 cron、$30/月赠额，新账户 web endpoint 200 rps。
  未验证：Modal 上 ICMP（gVisor 默认禁原始套接字，ping 以 TCP connect 实现）、modal.run 与
  CF 自定义域名的大陆可达性、阿里云短信官方单价。
- 现状代码：`packages/platform/status/src/*`、`apps/landing/src/lib/status-checks.ts`；
  小芽 `services/api-server/internal/ops/*`、`scripts/deploy.sh:749,799-822`。
