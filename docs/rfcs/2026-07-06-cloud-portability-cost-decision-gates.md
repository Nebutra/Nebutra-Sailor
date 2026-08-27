# RFC B1/B5/B6/B7: 云可移植性进入决策门后再扩大运行面

Status: Proposed
Date: 2026-07-06
Dimensions: B1 技术债与 legacy 架构治理, B5 云成本优化, B6 测试盲区分析, B7 开发者体验

## Delta Scope

本提案覆盖 2026-06-28 之后新增的云平台可移植性治理：`infra/platforms/cloud-portability.json`、GCP Artifact Registry Terraform 模块、AWS/GCP registry workflow、`pnpm cloud:verify`、`pnpm cloud:doctor` 和架构测试。

本评审没有修改代码或配置；任何 ECS/Cloud VM 右调、下调或云迁移仍需人工决策。

## Current State

- 当前默认拓扑声明为 frontend=Vercel、gateway=Cloudflare Workers、originBackend=ECS Docker / Cloud VM。
- AWS、GCP、K8s、Vercel、Cloud VM 都进入 `infra/platforms/cloud-portability.json`，其中 GCP 标记为 dormant-adapter。
- `.github/workflows/docker-build-push.yml` 已支持 GHCR、AWS ECR、GCP Artifact Registry，以及保留 Aliyun/Tencent 可选路径。
- Terraform prod 入口现在接受 `vercel | aws | gcp | aliyun | tencent`，新增 GCP module 仅创建 Artifact Registry，不创建 compute。
- `scripts/verify-cloud-portability.mjs` 通过字符串和文件存在性检查治理 manifest、workflow、Terraform 和 deploy target。
- Cloud VM fallback 仍承担多个 Next standalone app 与 API gateway，PM2 memory restart 阈值从 350M 到 700M 不等。
- `deploy-ecs.yml` 增加了磁盘预清理和 `deployment.verified` 埋点，但小盘 2C4G origin 的容量问题仍通过 release retention 和清理脚本缓解。

## Architectural Tradeoffs

Option A: 把云可移植性保持为 dormant adapter contract。

- Pros: 避免过早多云运行成本；让镜像、OIDC/WIF、Terraform 边界先稳定。
- Cons: 可移植性证明主要是静态/字符串合同，不等价于真实迁移演练。

Option B: 为 GCP 或 AWS 增加一条最小运行演练环境。

- Pros: 能验证 IAM、registry、network、smoke、日志和成本模型。
- Cons: 增加持续云成本和凭据治理面，且可能分散当前 Cloud VM/Vercel/Cloudflare 运行焦点。

Option C: 立即把重型 origin 从 Cloud VM 迁到云托管 compute。

- Pros: 可能降低当前 PM2 多应用同机带来的磁盘/内存风险。
- Cons: 迁移成本、观测迁移、网络出口和供应商锁定决策都尚未有足够证据。

Recommended direction: Option A with explicit decision gates. 先把“可移植合同”与“真实运行面”分开；只有当成本、可靠性或业务地域要求触发门槛时，才进入 Option B 或 C。

## Decision Information Needed

- 过去 7 到 14 天 Cloud VM 每个 PM2 进程的 RSS、restart、CPU、磁盘和部署 artifact 大小趋势。
- 当前 Vercel、Cloudflare、Cloud VM、数据库、Redis/cache、对象存储、CDN、CI minutes 的成本切片。
- GCP/AWS dormant adapter 的最低演练频率：每周、每月、每个 release，或仅迁移前。
- 哪些服务必须满足数据驻留、备案、中国网络、低延迟或客户指定云要求。
- `cloud:verify` 是否足够作为阻断门；哪些部分应升级为 schema/AST 解析而非字符串包含检查。
- Cloud VM fallback 是长期低成本路径、灾备路径，还是迁移前的过渡路径。
- 右调或下调 ECS/Cloud VM 的可接受阈值：磁盘余量、重启率、p95/p99、部署失败率和人工恢复次数。

## Proposed Decision Path

1. 将 `cloud-portability.json` 定义为架构合同，而不是云迁移完成证明。
2. 建立一周 Cloud VM evidence packet，再讨论任何实例规格调整。
3. 为 GCP/AWS dormant adapter 设定演练触发条件和预算上限。
4. 把字符串型 `cloud:verify` 逐步升级为 schema/AST 校验，避免文档或注释误导合同判断。
5. 决定 origin runtime 的未来：继续 Cloud VM、拆分服务、托管 compute，或多云演练。

## Non-Goals

- 本 RFC 不改变默认云拓扑。
- 本 RFC 不调整 ECS/Cloud VM 规格、release retention、Terraform defaults 或 workflow trigger。
- 本 RFC 不自动创建云账号、授予权限或配置共享访问控制。
