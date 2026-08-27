# Nebutra Router & Forge — SOTA Quality Playbook

**Date:** 2026-07-23  
**Status:** Approved product bar (mandatory for shipping tools & platform surfaces)  
**Parent:** [2026-07-23-nebutra-router-forge-design.md](./2026-07-23-nebutra-router-forge-design.md)

---

## 0. 一句话

> **功能完成 ≠ 可上架。**  
> 每个工具、以及 Router / Forge 平台本身，必须在 **需求理解、竞品对标、开源方案、底层轮子、UX、AI-Native、视觉规范** 上达到「可公开宣称 SOTA」的水平。

### 0.1 会话 non-goal ≠ 产品豁免

临时实现计划里的 *Non-goals*（例如「本 goal 不要求 Playwright 联调」）**只约束该次 goal 裁剪**，**不能**用来永久跳过产品 SOTA 门槛。

| 情况 | 做法 |
|------|------|
| 产品未要求 SOTA / 标为 scaffold | 可不做重引擎 |
| 产品要求 SOTA（如 md-to-pdf 打印 fidelity） | **必须**上对应独角兽轮子（Playwright 等），做到再谈「做完」 |

SOTA 在这里不是「自己发明算法」，而是：

1. 用 **独角兽级 / 社区公认** 的底层轮子把能力撑满；  
2. 用 **Nebutra 产品壳** 把旅程、契约、美观做到比工具站/中转站竞品更专业；  
3. 用 **可复现的调研与验收** 证明我们没有「能用就算」。

---

## 1. 五步调研法（每个工具强制走完）

任何新工具（或把现有工具升到 SOTA）**必须**留下一份 `tool-brief`（可写在 PR 描述或 `docs/plans/tools/<slug>.md`）。

| 步 | 名称 | 要回答什么 | 产出物 |
|----|------|------------|--------|
| **1** | **用户需求** | 谁在什么场景下搜/用？中英关键词？失败时最烦什么？ | 3–5 条 JTBD + 搜索意图列表 |
| **2** | **竞品** | 头部站怎么做？（TinyWow / it-tools / 67tool / 302 / OpenRouter 等）他们强在哪、弱在哪？ | 竞品矩阵 2–4 家 + 截图/链接 |
| **3** | **现成方案** | 网上成熟 SaaS/库/API 有哪些？价格与限制？ | 候选方案表 |
| **4** | **开源实现** | GitHub 上 star/维护活跃的实现？许可证？UX 是否已验证？ | 2–3 个 OSS 链接 + 选用理由 |
| **5** | **底层轮子** | **真正撑起体验的是哪颗轮子？**（不是业务胶水）是否高性能、是否行业默认、是否可 pin 版本？ | **选定 engine + 版本 + 为何不是手写** |

### 1.1 第 5 步的硬规则

| 允许 | 禁止 |
|------|------|
| 选 `sharp` / `pdf-lib` / Playwright / `js-tiktoken` / `jose` / `diff` / `opencc-js` / `culori` 等 **维护中的 SOTA 库** | 为了「快」用 20 行正则冒充 JSON/HTML 引擎 |
| 侧车跑 New-API / Sub2API / CPA（Router 数据面） | 自研半吊子转发内核冒充中转性能 |
| 包一层 Nebutra 双读契约（人 + Agent） | 只做人页、或只做 curl 没有人用页 |
| 写清「当前 engine 与竞品差距」 | 在 README 写 SOTA 实际用 demo PDF writer |

**判据：** 若换掉这颗轮子体验明显变差 → 它就是真 SOTA 依赖；若可有可无 → 你还在堆功能。

---

## 2. 单工具 SOTA 验收（Ship Gate）

工具 PR **未全部打勾不得合入 `main` 标为 productionReady**（lab 可用 `tier: scaffold` 标记）。

### 2.1 调研门

- [ ] 五步调研 brief 齐备  
- [ ] 明确 **primary engine**（包名 + 版本 + 许可证）  
- [ ] 明确 **竞品对标点**（至少 1 个必须打平或超过的维度）

### 2.2 引擎门

- [ ] 核心路径走选定 SOTA 库，**不是**手写简化版  
- [ ] 版本 pin；升级有 changelog 意识  
- [ ] 错误/边界 case 覆盖竞品常见坑（空输入、超大输入、非法编码、超时）

### 2.3 人类 UX 门

- [ ] 打开即用（主路径 ≤ 2 次点击）  
- [ ] 输入区、运行、输出、复制、清空 布局清晰  
- [ ] 加载/错误/空状态专业，无「暂无数据」式敷衍  
- [ ] 移动端可用  
- [ ] 隐私说明（是否上传、是否落盘、保留多久）  
- [ ] SEO：独立 title/description/意图关键词（非门口页）

### 2.4 AI-Native 门

- [ ] OpenAPI / invoke 契约稳定  
- [ ] MCP tool 名 + description 可发现  
- [ ] SKILL.md（或等价 progressive disclosure）  
- [ ] meterId + UsageEnvelope 可记  
- [ ] 稳定错误码；`request_id`  
- [ ] sideEffect 分级；长任务 job 模型  

### 2.5 视觉与规范门（Nebutra 设计体系）

- [ ] 只用 `@nebutra/ui` / tokens / icons（Geist 默认）  
- [ ] 语义色与间距 token，无随意 hex  
- [ ] 与全局 focus / 表单规范一致  
- [ ] 工具页模板一致（同一「军刀」语言）  

### 2.6 诚实元数据门

工具 registry 必须暴露：

```yaml
engine:
  name: sharp
  upstream: https://github.com/lovell/sharp
  version: "0.34.x"
quality:
  brief_path: docs/plans/tools/image-compress.md
  competitors_beaten: ["basic online compressors on speed"]
  known_gaps: []            # 必须空才能 production
```

未完成五步 / 未换真轮子的工具 —— **禁止对外营销为 SOTA**。这是内部验收规范，由 brief（`docs/plans/tools/`）记录，**不进 registry、不进对外 catalog**。

---

## 3. 平台级 SOTA（Router + Forge 整体）

工具再强，平台旅程烂 = 不是 SOTA 产品。平台同样五维验收。

### 3.1 用户旅程（对标 302 / OpenRouter / 头部工具站）

| 旅程 | SOTA 标准 |
|------|-----------|
| 发现 | 搜索秒出；分类密；热门/最近；URL 可分享 |
| 首次成功 | 免登录可用免费工具；复制结果一键 |
| 变现 | 预充钱包路径 ≤ 3 步；金额/余额/流水清晰 |
| 开发者 | base_url + key + 示例 一屏抄完 |
| Agent | MCP/OpenAPI 与人用同一 capability id |
| 失败 | 402/429/上游错误人类可读 + 机器码 |

### 3.2 UX / 易用

- 认知负担低：默认路径零术语（「供给渠道」不对 C 端暴露）  
- 延迟：工具本地/边缘优先；中转热路径流式透传  
- 一致性：Router 控制台与 Forge 工具页同一品牌语言  

### 3.3 AI-Native

- 契约优先于页面  
- Progressive disclosure（目录摘要 → 详情 schema）  
- 与 Router 额度/模型卡可互链（token 估算 → 真实调用）  

### 3.4 UI 美观与规范

- Nebutra tokens + UI primitives + AnimateIn 等项目规范  
- 工具站首页 = **军刀抽屉感**（搜索 + 宫格），不是空洞 SaaS hero  
- 中转控制台 = **专业运维感**（密钥、余额、用量、调试），不是开源后台皮肤  

### 3.5 性能与信任

- 公开延迟/可用性叙事有数据支撑（至少内部 SLO）  
- 隐私与合规说明在页脚与工具旁可见  
- 混合中转可审计，不对用户说假话  

---

## 4. 轮子选型原则（「独角兽级」如何判断）

选 engine 时用下面清单（满足越多越好，**至少 4 项**）：

| # | 信号 |
|---|------|
| 1 | 被大量生产系统采用（文档/公司案例/高 star 且持续 commit） |
| 2 | 有明确维护者与发版节奏 |
| 3 | 许可证可商用（MIT/Apache 等；AGPL 依赖需法务意识） |
| 4 | 性能路径清晰（native/Rust/Go/SIMD/worker 等）或领域事实标准 |
| 5 | 边界 case 文档与 issue 历史丰富（说明真实用户打磨过） |
| 6 | 与我们栈匹配（Node 22 / 浏览器 / Worker） |

### 4.1 参考映射（方向性，实施时再 pin 版本）

| 能力族 | SOTA 级轮子方向（示例） | 明确不是 SOTA |
|--------|-------------------------|---------------|
| 图片压缩/转换 | **sharp** (libvips) | 纯 canvas 糊弄大图 |
| Markdown→PDF | Playwright/Puppeteer 打印 或 成熟 md-to-pdf 栈 | 手写最小 PDF 字符串 |
| PDF 合并拆分 | pdf-lib / qpdf / mutool | 正则切 PDF |
| Diff | diff / diff-match-patch / myers 成熟实现 | 按行 === |
| 简繁 | opencc-js | 几十个字映射表 |
| Token | js-tiktoken / 官方 tokenizer | chars/4 |
| JWT | jose | split('.')[1] atob |
| 颜色 | culori / colorjs.io | 手写 hex 解析 |
| 中转数据面 | New-API / Sub2API / CPA / Bifrost 类 | 自写 fetch 循环无治理 |
| 正则测试 | 安全超时 + 成熟测试器 UX 参考 | 无 ReDoS 防护 |

---

## 5. 与当前代码的诚实对照（Gap）

**重要：现有 monorepo 实现是「管线 + 密度脚手架」，多数尚未走完五步，不得对外称全站 SOTA。**

| 区域 | 现状 | SOTA 目标 | 优先级 |
|------|------|-----------|--------|
| 平台骨架（registry/invoke/双读/钱包） | 有 | 保留，补 UX 打磨 | P0 平台 |
| 字数/编解码/哈希 等 pure-batch | **scaffold 功能** | 对标 it-tools UX + 正确性测试 + 大输入策略 | P0 工具 |
| md-to-pdf | **simple-pdf 手写** | 换 Playwright/成熟渲染 | **P0 还债** |
| image-* | sharp 方向对 | 补人用上传 UI、进度、格式预设、对标 TinyWow | P0 |
| Router 侧车 | compose + gateway 接线 | 运营打磨、延迟/可用性仪表、模型卡专业页 | P0 平台 |
| 钱包 | mock 充值 | 真实双轨支付 + 流水 UI | P1 商业 |
| MCP | HTTP JSON 桥 | 完整 MCP transport + 官方 registry 元数据 | P1 |
| SEO 密度 | ~30 工具 | 80→250 且 **每工具 brief** | P1 规模 |

### 5.1 立即政策

1. 所有已注册工具默认视为未验收，直到 brief + 真轮子验收。  
2. 新 PR **禁止**再增加「手写伪引擎」冒充 production。  
3. 还债顺序：**md-to-pdf → 图片人用 UX → 高频 SEO 工具五步升级 → Router 控制台视觉**。  

---

## 6. 标准交付模板（复制到每个工具 PR）

```markdown
## Tool brief: <slug>

### 1. User need
- JTBD:
- Keywords (zh/en):
- Pain if broken:

### 2. Competitors
| Product | Strength | Weakness | Link |
|---------|----------|----------|------|

### 3. Solutions surveyed
- 

### 4. OSS analyzed
- repo / license / last release:

### 5. Engine choice (SOTA wheel)
- package:
- version:
- why this beats hand-roll:
- rejected alternatives:

### UX / AI-Native / Visual
- Human path:
- Agent path:
- Tokens / components used:

### Gaps remaining
- 
```

---

## 7. 平台「专业和谐美观」检查（Router / Forge 发版）

发版前产品走查（可用截图 PR）：

- [ ] 首页 5 秒内理解「这是干什么的」  
- [ ] 主 CTA 唯一、不抢戏  
- [ ] 字体层级：标题 / 正文 / 辅助 三级清晰  
- [ ] 中性色板 + 品牌强调点（gradient CTA）克制  
- [ ] 空状态与错误状态像产品不是调试页  
- [ ] 暗色模式可读（若支持）  
- [ ] 与 `apps/web` / landing 同一品牌家族  
- [ ] 无开源站长后台的视觉残留  

---

## 8. 流程嵌入研发

| 时机 | 动作 |
|------|------|
| 提工具需求 | 先五步 brief，再写代码 |
| 实现 | engine pin + 双读 + 模板页 |
| Code review | 用本文 §2 清单；缺 brief = 打回 |
| 对外营销 | 仅通过五步验收的工具可写「专业/SOTA」 |
| 季度 | 抽 10 个高流量工具重新对标竞品与上游版本 |

---

## 9. 与书记/总理分工的关系

| 书记（你） | 总理（工程） |
|------------|--------------|
| 定「必须 SOTA、禁止能用就行」 | 五步调研落地、选轮子、写 brief |
| 定竞品对标与品牌审美红线 | 实现双读与 Nebutra UI 规范 |
| 否决「假 SOTA」叙事 | 维护 brief 与验收记录 |

---

## 10. 下一步工程（按本 playbook）

2. **md-to-pdf 还债**：Playwright 或选定 md-to-pdf 栈 + brief  
3. **image 工具人用页**：拖拽上传、质量滑杆、格式预设（sharp 已具备）  
4. **高频 10 刀**（字数、JSON、Base64、时间戳、Diff…）逐个五步升级  
5. **Forge 首页 / Router 控制台** 视觉走查对照 §7  

---

## 11. 一句话收束

> **SOTA = 调研清楚需求与竞品 + 站在最强开源轮子上 + 用 Nebutra 把旅程和 UI 做成专业产品 + 对 Agent 交付完整契约。**  
> 少一步，就只是又一个能用的工具站。

---

## 12. Progress (2026-07-23 execution)

| Item | Status |
|------|--------|
| Playbook + design decisions 19–22 | Done |
| 验收状态以 brief 记录（**不作为 registry 字段**） | Done |
| Briefs: md-to-pdf, json-format, image-compress, word-count | Done (`docs/plans/tools/`) |
| Engines: **marked**, **diff**, **jose**, **js-tiktoken**, **sharp**, **Intl.Segmenter** | Done (lab) |
| Image human UX drag-drop | Done |
| Quality badges on home/tool pages | Done |
| md-to-pdf Playwright print path (primary, auto/playwright) | Done — simple only as fallback / test |
| First `production` badge tools | Done: word-count, json-format, text-diff, base64, unix-timestamp, uuid, md-to-pdf |
| Router console 302 journey | Done: apps/router :3106 keys/wallet/models/playground/docs |
| Rule: session non-goals never override product SOTA bar | Done (codified) |
