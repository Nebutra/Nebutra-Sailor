# 302.AI 全可达路由 + Dropdown / Hover 交互研究

> 研究日期：2026-07-23  
> 方法：Playwright 无头遍历（seed + 产品链路 BFS，排除 `/kuaixun/` 新闻洪泛）  
> 原始产物：`/tmp/302-full-study/report.json` + `shots/`（约 370 张）  
> 范围：公开可达路由；登录后 dashboard 仅验证入口跳转

本文件是 Router（:3106）对齐 302 的**权威旅程地图**。后续改 UI 必须以本表为验收基准，而不是凭印象堆模块。

---

## 0. 一句话结论

302 不是「一个带侧边栏的管理后台」，而是：

1. **Market 货架**（公开）— 分类 + 品牌筛选 + 商品卡 + 价格  
2. **Admin 控制台**（登录后）— `管理后台` 跳出到 dashboard  
3. **Use 快捷台**（登录后/外部）— `快捷使用` 跳出到 `all.302.ai`  

外加独立的 **价格表**、**博客/资讯**、**Studio 客户端落地页**、**API 文档**、**帮助中心**。

全局 chrome 极轻；密度全压在「分类行 + 商品卡网格」上。**没有** market 页叠 admin 侧栏。

---

## 1. 可达路由地图

### 1.1 核心产品路由（必须对齐）

| 路由 | 角色 | 壳 | 说明 |
|------|------|----|------|
| `/` | 市场首页 | Market | 默认三区：左分类 / 中轮播 / 右登录快捷 |
| `/?product_type=api` | API 超市 | Market | 与首页同壳，分类切换为 API 分类 |
| `/?product_type=tool` | 应用超市 | Market | 分类切换为应用分类（机器人/效率/学术…） |
| `/product/list?cate=api` | API 列表 | Market | 全部分类展开 + 下方货架 |
| `/product/list?cate=api&tag=语言大模型` | 分类货架 | Market | tag 驱动当前分类高亮 |
| `/product/list?cate=api&tag=语言大模型&brand=OpenAI` | 品牌过滤 | Market | tag×brand 笛卡尔过滤 |
| `/product/list?cate=tool` | 应用列表 | Market | 应用侧货架 |
| `/price` | 价格表 | Price | **独立布局**：左导航 + 价目表格 |
| `/blog/` | 资讯 | Blog | **独立 header** |
| `/zh` / `studio.302.ai` | 客户端落地 | Studio | 桌面端产品页 |

### 1.2 外链 / 子域（可达但非同壳）

| 入口文案 | 目标 | 类型 |
|----------|------|------|
| 技术支持 → API文档 | `https://doc.302.ai/` | 文档站 |
| 帮助中心 / 入门指南 | `https://help.302.ai/...` | 帮助站 |
| 客户端 | `https://studio.302.ai/` | Studio |
| 快捷使用 | `https://all.302.ai/#/` | Use 壳 |
| 管理后台 | `https://302.ai/dashboard/overview` | Admin 壳 |
| Github | `https://github.com/302ai` | 外链 |
| 文章资讯 | `/blog/` | Blog 壳 |
| 更新日志 | `/blog/kuaixun/` | 快讯列表（**勿 BFS 全量**） |

### 1.3 未登录时「假路由」

以下路径在未登录 crawl 中 **全部回落 `/`**：

`/login` `/register` `/user` `/wallet` `/console` `/dashboard` `/agent` `/changelog` `/notice` `/client` `/app` `/docs` `/apidoc`

含义：这些是 **鉴权后才成立的产品面**，公开站点不在 market 壳内塞对应页。Router 应对齐成：

- Market 只放公开货架  
- Admin / Use 是**独立壳**，登录后进入  
- 公开链接可以跳转，但不要在未登录 market 首页画假 dashboard 区块

### 1.4 URL 查询模型（货架的核心）

```
/?product_type=api|tool

/product/list
  ?cate=api|tool          # 一级：API vs 应用
  &tag={分类名}            # 二级：语言大模型 / 图片生成 / …
  &brand={品牌名}          # 三级：OpenAI / Anthropic / 通义千问 / …
```

**品牌过滤不新开详情 SPA**——仍是 list 页，标题变为 `{Brand} - API超市`。  
点击首页商品卡上的品牌名（如 Gemini）→ 进入 `...&brand=Gemini` 列表，而不是独立 PDP。

---

## 2. 全局 Chrome（Market 共享）

每一张 market / list / price 截图都共享同一顶栏结构。

```
┌─ promo strip（活动条，可关）─────────────────────────────────────┐
│ 302 Media Studio: …                                    [→]      │
├─ utility bar ───────────────────────────────────────────────────┤
│ [USD $ ▾] [简体中文 ▾] [登录 | 注册]     [管理后台] [快捷使用]     │
│                                         [技术支持 ▾] [更新日志] [公告] │
├─ brand + search ────────────────────────────────────────────────┤
│ 302.AI   [请问你想用AI做什么呢?        ] [搜索] [AI推荐]          │
├─ product-type nav（首页才有 pill 条）────────────────────────────┤
│  [应用超市] [API超市] [客户端] [Github] [文章资讯]                 │
└─────────────────────────────────────────────────────────────────┘
```

**右侧浮动 rail（fixed）**（所有 market 页）：

| 图标 | 文案 | 行为 |
|------|------|------|
| 聊天气泡 | 联系我们 | 客服/联系 |
| 表格 | 价格表 | → `/price` |
| 计算器 | Token 计算器 | 工具弹层/页 |
| 显示器 | 客户端 | → studio |
| 问号 | 帮助中心 | → help.302.ai |
| ↑ | 回顶部 | scroll-top（滚动后出现） |

### Router 映射

| 302 | Router 建议 |
|-----|-------------|
| USD / 语言 dropdown | 可先 stub，但**位置与形态**要对（顶栏左） |
| 登录 \| 注册 | 顶栏左，紧贴语言 |
| 管理后台 | → `/dashboard`（admin 壳） |
| 快捷使用 | → `/use`（use 壳） |
| 技术支持 ▾ | dropdown：API 文档 / 帮助 |
| 更新日志 / 公告 | 链到 changelog 或隐藏（lab 可弱化） |
| 搜索 + AI推荐 | 搜索必做；AI推荐可二期 |
| 应用超市 / API超市 | `product_type` 或 path 切换 |
| 浮动 rail | 可选；至少 **价格表** 入口 |

---

## 3. Dropdown / Hover 交互矩阵

### 3.1 顶栏 Dropdown

| 触发文案 | 触发方式 | 面板内容 | 关闭 | 备注 |
|----------|----------|----------|------|------|
| **USD $** | hover **或** click | `USD$` / `CNY¥` / `JPY¥` / `RUB₽` | 移开 / Escape / 点选项 | 白底小菜单，贴触发器下方；货币影响全站标价 |
| **简体中文** | hover **或** click | `简体中文` / `English` / `日本語` / `Русский` | 同上 | 同形态 locale 切换 |
| **技术支持** | hover **或** click | 至少 `API文档` → doc.302.ai | 同上 | 菜单极简；帮助可能在浮动 rail |
| **专题分类**（仅 blog） | hover **或** click | 基准实验室 / 新品发布 / 深度拆解 / 赛博月刊 / 实战教程 | 同上 | 博客独立 header |

### 3.2 非 Dropdown 的顶栏链（直接导航，无飞层）

| 文案 | 行为 |
|------|------|
| 管理后台 | 硬跳 admin |
| 快捷使用 | 硬跳 use（all.302.ai） |
| 更新日志 | 跳快讯/changelog |
| 公告 | 跳公告 |
| 登录 / 注册 | 鉴权流（未登录 crawl 回落首页） |

**设计含义**：`管理后台` 与 `快捷使用` **不要**做成 mega-menu，它们是壳切换 CTA。

### 3.3 首页分类行 Hover Flyout（关键！）

**触发**：左侧「分类」列表每一行（如 `语言大模型`）hover。  
**面板**：从该行右侧展开的 **brand mega-list**：

- 每项：品牌名 + 一行卖点描述  
- 点击品牌 → `/product/list?cate=api&tag=语言大模型&brand={Brand}`  
- 点击分类名本身 → `/product/list?cate=api&tag=语言大模型`（无 brand）

实测 brand 集合（语言大模型，不完全）：

OpenAI · Anthropic · Gemini · Grok · 通义千问 · 智谱 · 月之暗面 · 百度 · Deepseek · 豆包 · 阶跃星辰 · 商汤 · Minimax · 腾讯混元 · Google · Meta · Mistral AI · Microsoft · 零一万物 · 百川智能 · v0 · Perplexity · 专业模型 · PPIO派欧云 · …

行内 **预览 chips**（不 hover 也可见前 4 个品牌 + `>`）：

```
[🌐 语言大模型]  OpenAI  Anthropic  Gemini  Grok  >
```

### 3.4 商品卡 Hover

| 区域 | 行为 |
|------|------|
| 截断描述文字 | **黑色 tooltip** 显示全文（非 popover 卡片） |
| 卡片整体 | 轻 elevation / 边框；**无** 大块 hover-card 详情 |
| 收藏星标 | 右上角，需登录 |
| 文档图标 / 试用图标 | 行内小 action，不挡主 click |

**重要**：302 的「hover card」主要是 **tooltip 全文**，不是 Linear/Stripe 式大预览卡。不要过度设计。

### 3.5 列表页「分类」面板

- 顶部 `分类` + `API | 应用` toggle + **折叠 chevron**  
- 展开时显示 **全部类目 × 全部品牌 chips** 的 taxonomy mega-panel（截图 `r_list-llm.png`）  
- 下方货架标题：当前 tag（如「语言大模型」）+ `日期` / `价格` 排序 + 网格/列表 toggle  

### 3.6 价格页局部交互

- 顶 tab：`机器人` | `其他应用` | `API`  
- 左 sidebar 可折叠分组（聊天机器人 → OpenAI模型 / Anthropic…）  
- 表格右上角货币快捷：`$` `¥` `円` `₽`（与顶栏 USD dropdown **双入口**）

---

## 4. 页面信息架构（按壳）

### 4.1 Market 首页 `/` 三区

```
┌──────────────┬─────────────────────┬────────────────┐
│ 分类          │ 轮播「模型实测」      │ Hi~ 登录卡      │
│ API|应用 toggle│ 大图 + 型号 headline │ 登录/注册 CTA   │
│ 8 行类目+chips│                     │ 8 宫格快捷：    │
│              │                     │ 数据汇总/应用管理│
│              │                     │ API Keys/Agent │
│              │                     │ 外部资源/钱包   │
│              │                     │ 收藏/更多       │
├──────────────┴─────────────────────┴────────────────┤
│ 最新 | 热门 | 猜你喜欢                    [▦] [☰]   │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐                     │
│ │商品卡││    ││    ││    ││    │  × N 行            │
│ └────┘└────┘└────┘└────┘└────┘                     │
└─────────────────────────────────────────────────────┘
```

**API 分类行（实测）**

| 图标 | 类目 | 行内 brand 预览例 |
|------|------|-------------------|
| 🌐 | 语言大模型 | OpenAI Anthropic Gemini Grok |
| 🖼 | 图片生成 | 通用接口 Grok DALL·E 302.AI |
| ✂ | 图片处理 | Recraft Vectorizer.AI 阶跃星辰 |
| ▶ | 视频生成 | 通用接口 OpenAI Luma Genmo |
| 🎵 | 音视频处理 | 通用接口 可灵 微软 硅基流动 |
| 🔍 | 信息处理 | 通用接口 Jina Exa 博查 |
| 📚 | RAG相关 | OpenAI Jina 国产模型 302.AI |
| 🧰 | 工具API | AI文档编辑器 AI 3D建模 |

**应用分类行（`product_type=tool`）**

机器人 · 工作效率 · 学术相关 · 图片处理 · 音频相关 · 视频相关 · 代码相关 · 信息处理 · 客户端  

### 4.2 商品卡字段（货架原子）

从截图 `ix_cat_hover__` 读出的卡片结构：

```
┌─────────────────────────┐
│ [渐变头图+厂商 logo]  ★  │
│ model-id (如 gpt-5.6-sol)│
│ 一行描述（截断+hover全文） │
│ [模型] [语言大模型] [doc][↗]│
│ 输入: $x/1M tokens       │
│ 输出: $y/1M tokens       │
└─────────────────────────┘
```

- **主标题是 model id**，不是营销名  
- 价格 **分 in/out**，单位 `/1M tokens`  
- 标签：类型 chip + 类目 chip  
- 外链：文档、试用  

### 4.3 Price `/price`

- 标题文案锚定「按用量/次数收费」  
- 不是卡片货架，是 **价目表**  
- 列：模型名 | 302.AI 价 | 原价 | 对比 | 说明 | 上下文长度  
- 与 market 共享顶栏，但 **无** 首页三区 / 无 product-type pill  

### 4.4 Blog `/blog/`

- 独立顶栏：资讯首页 · 官网 · 专题分类▾ · 更新日志 · 入门指南 · 下载客户端 · API文档  
- 专题分类 dropdown 是 blog 专属交互  

---

## 5. 用户旅程（可验收）

### J1 逛货架买 API

1. 进 `/`  
2. 确认 API 超市（pill 或默认）  
3. hover「语言大模型」→ flyout 选 OpenAI  
4. 落在 `/product/list?cate=api&tag=语言大模型&brand=OpenAI`  
5. 浏览卡片 in/out 价  
6. 点文档 / 试用；或登录后拿 Key  

### J2 换应用超市

1. 点「应用超市」→ `/?product_type=tool`  
2. 左栏变成应用类目  
3. 下方货架换成工具/机器人卡片  

### J3 查价

1. 浮动 rail「价格表」或直达 `/price`  
2. tab 选 API / 机器人  
3. 左栏选厂商  
4. 货币 `$/¥/円/₽` 切换  

### J4 进管理 / 使用（壳切换）

1. 顶栏「管理后台」→ admin 壳  
2. 顶栏「快捷使用」→ use 壳  
3. **不在 market 页内嵌 admin 侧栏**  

### J5 多语言 / 多货币

1. 顶栏左 USD → 选 CNY  
2. 顶栏左 语言 → English  
3. 标价与文案同步（Router lab 可先做 UI 壳）  

---

## 6. Router 对齐清单（对照本仓库现状）

| # | 302 行为 | Router 应有 | 优先级 |
|---|----------|-------------|--------|
| 1 | Market / Admin / Use 三壳分离 | `/` market · `/dashboard` admin · `/use` use | P0 |
| 2 | 顶栏左：货币·语言·登录 | 位置与形态对齐 | P0 |
| 3 | 顶栏右：管理后台·快捷使用·技术支持▾ | 硬跳 + 支持 dropdown | P0 |
| 4 | 首页三区：分类 / 轮播 / 登录快捷 | 去掉冗余 admin 信息块 | P0 |
| 5 | `product_type` API↔应用 | 切换改分类数据源 | P0 |
| 6 | 分类行 chips + hover brand flyout | 交互必须做 | P0 |
| 7 | list URL `cate/tag/brand` | `/models?...` 对齐语义 | P0 |
| 8 | 商品卡：model id · 描述 · tags · in/out 价 · doc/try | 卡片字段收敛 | P0 |
| 9 | 描述 hover = 黑 tooltip | 不要做大 hover-card | P1 |
| 10 | 分类 mega-panel 可折叠 | list 顶栏 | P1 |
| 11 | 排序：日期 / 价格；网格/列表 | list 工具条 | P1 |
| 12 | `/price` 独立价目表 | 可二期，但入口要有 | P2 |
| 13 | 浮动 rail | 可选 | P2 |
| 14 | Blog / Studio | 非 Router 核心 | P3 |

### 明确禁止（防「还是不像」）

- ❌ market 页左侧再塞一套 admin 导航  
- ❌ 首页大段「系统状态 / 配额表 / 空状态说明」占分类位  
- ❌ 把模型列表做成管理表格（斑马纹 + 操作列）  
- ❌ 商品卡主标题用「友好营销名」盖住 model id  
- ❌ 用巨型 hover 预览卡代替一行 tooltip  
- ❌ 把 管理后台 / 快捷使用 做成复杂 mega-menu  

---

## 7. 研究边界与噪音

1. **`/blog/kuaixun/`** 会生成海量快讯 URL，BFS 必须 exclude。  
2. 未登录时大量 `/user` `/wallet` 等回落首页——不要误判为「没有这些功能」。  
3. 首轮 crawl 的 `hover_*` 截图因文件名清洗，中文 trigger 被压成 `__`；以 `report.json` 的 `interactions[].trigger` 与 `firstOverlayText` 为准。  
4. `help.302.ai` 与 `doc.302.ai` 是独立站点，交互不纳入 market 壳。  
5. 商品「详情页」在公开站基本不存在：brand/tag list 即终点；试用/文档外跳。  

---

## 8. 产物索引

| 路径 | 内容 |
|------|------|
| `/tmp/302-full-study/report.json` | 52 routes / 36 interactions / linkGraph |
| `/tmp/302-full-study/shots/r_home.png` | 首页三区 |
| `.../r_home-tool.png` | 应用超市分类 |
| `.../r_list-llm.png` | list 分类 mega-panel |
| `.../r_price.png` | 价格表 |
| `.../ix_home_hover_USD.png` | 货币 dropdown |
| `.../ix_cat_hover__.png` | 商品卡 + 描述 tooltip |
| `.../ix_blog_click__.png` | 专题分类 dropdown |

---

## 9. 下一步（实现顺序建议）

1. **P0 壳与 chrome**：确认 Router 三壳路由与顶栏左右分区，删 market 内 admin 残留。  
2. **P0 分类 × brand URL**：`/models` 查询参数对齐 `cate/tag/brand`。  
3. **P0 卡片字段**：model id + in/out 价 + tags + doc/try；描述 tooltip。  
4. **P0 分类 hover flyout**：brand 列表 + 描述。  
5. **P1 list 工具条**：折叠分类、排序、网格/列表。  
6. **P2** 价格表与浮动 rail。  

实现时以本文件 §3 / §6 为 checklist，逐项截图对比 302 与 Router。
