# 302.AI Help Center (help.302.ai) — rules & surface map

Date: 2026-09-09 · Session: opencli `r302h` (owner-logged Chrome, read-only) + WebFetch.
Builds on `docs/plans/2026-07-23-router-302-full-route-interaction-study.md` (market shell); this file covers only the help site, its English mirror, and the three policy pages the help site points to (302.ai/faq, 302.ai/refund-policy, 302.ai/legal/terms). Quotes are verbatim from the page text (Chinese pages are the canonical, more recent versions; English mirror lags).

## 1. Summary

help.302.ai is a HelpLook-hosted (Nuxt, `#HelpLook`, `#hl-doc`) knowledge base with 10 top-level categories and ~120 articles in Chinese, plus a partially translated `/en/` mirror with slightly different IDs/categories. The *rules* it carries are few and simple, and it deliberately defers all price numbers to `https://302.ai/pricing/`: currency is **PTC, 1 PTC = 1 USD (≈ 7 CNY in older copy)**; billing is **prepay then deduct, no monthly fee, no packages, no thresholds, balance never expires**; two meters — **per-token** (input+output) and **per-call**; **$1 trial credit after phone binding**; **minimum recharge $5** (EN FAQ); **auto-recharge via Stripe with min amount $5 and min threshold $1, waives the recharge fee**; **API keys have expiry presets (never / 1 month / 1 day / 1 hour), total + daily quota with an "unlimited" toggle, daily quota resets at 00:00 in the browser's timezone, disable is reversible (30 s), delete is permanent**; **sub-accounts are free, up to 200 per batch, format `xxxx@sub.302ai`, two roles (普通用户 with 8 toggleable modules, 管理员 all-on), three modules share data with the main account (开发者/钱包/团队管理)**; **custom-model relay costs 0.05 PTC/day per key or bot ($1.5/month), custom API relay is free**; **the 302.ai marketing FAQ claims "No TPM (tokens per minute) or concurrency limits for any user" and 24/7 uptime**; **refunds: top-ups are non-refundable except for platform-caused abnormal PTC consumption, claim within 7 working days, audit within 3 working days, refund to original payment account in 1–7 working days, gifted/promo PTC never refundable, PTC cannot be withdrawn/transferred/gifted**. Every "how to use with X" guide is the same three-field recipe: key from `管理后台 → 使用API → API Keys`, base URL `https://api.302.ai/v1` (variants below), model id string; Claude Code uses `ANTHROPIC_BASE_URL=https://api.302.ai` and any model name (all models are exposed in Claude format).

## 2. Page / feature inventory

### 2.1 Help site chrome (every page)

| Element | Label / behaviour |
|---|---|
| Header left | 302 logo → `https://302.ai/` |
| Header search | Input placeholder **「请输入」** (search icon; no results page observed — inline dropdown) |
| Header links | **官网** → `https://302.ai/` · **价格表** → `https://302.ai/price` |
| Header right | QR icon **「扫一扫，手机查看」** (mobile QR of current page); language icon (zh ↔ `/en/`) |
| Left rail | Category tree (10 groups), current article highlighted, groups collapsible; mobile toggle **「菜单」** |
| Right rail | **「大纲」** — auto TOC of H2/H3 with anchor links (`#Token是什么？` style URL-encoded anchors); mobile toggle **「本页目录」** |
| Article footer | **「内容是否有帮助？」 是 / 否 → 「提供该内容的反馈」**; **上一个 / 下一个** links (prev/next in tree order); **「最近修改: YYYY-MM-DD」** |
| Site footer (home) | Quick Access: 应用超市 `https://302.ai/?product_type=tool` · API超市 `https://302.ai/?product_type=api` · Github · 文章资讯 `https://news.302.ai/` · 管理后台 `https://dash.302.ai/dashboard/overview` · 快捷使用 `https://302alltools-all.302.ai/?region=1&confirm=true&lang=zh-CN`; Support: 常见问题 `https://302.ai/faq/` · 帮助中心 · API文档 `https://302ai.apifox.cn/` · 客户端 `https://studio.302.ai/` · Token计算器 `https://302.ai/token/` · 联系我们; Legal: 使用条款 `https://302.ai/terms/` · 隐私政策 `https://302.ai/privacy/`; **Contact: support@302.AI**, **SONIER PTE. LTD. @2026** |
| Home hero tabs (zh) | 聊天机器人 (`/docs/chatrobot`) · 视频教程 · 常见问题 · 更新日志 |
| Home hero tabs (en) | Homepage · Pricing · Help Center · Chat-bot · API Market · FAQ · Change Log |
| URL scheme | `/docs/<slug>` — slug is either pinyin-ish (`API-guan-li`, `zi-dong-chong-zhi`), English (`team-management`, `user-center`, `customapi`, `import`) or a random 6–8 char id for category index pages (`7pRkBt`, `y15Olk`, `zf0yOxJX`, `lvgQh4`, `iyroXSdy`, `4fFufYjF`, `GsKGjkRO`, `3DSCWk`, `bXHm2i`, `lFM1Da`). Same slug works under `/en/docs/` when translated; EN has a few EN-only slugs (`FAQ`, `API-Pricing`, `What-is-API`, `Client`, `KB-Robot-Principles`, `Change-Log-Up-to-Oct-2024`, `kai-fa-ri-zhi`). |
| Landing sections | Each category card shows first 5 articles + **「查看更多」** (EN **see more**) |

### 2.2 Category → article inventory (zh, from sidebar; `/docs/` prefix omitted)

| Category (index) | Articles (slug) | Notes |
|---|---|---|
| 基础介绍 (`lvgQh4`) | 302.AI 入门指南 `302-AI-wu-fen-zhong-shang-shou-jiao-cheng` · 🧠什么是AI `shen-me-shi-AI` · 💬 什么是ChatGPT `shen-me-shi-ChatGPT` · 🏋️‍♀️ ChatGPT是怎么被训练出来的 · 🔀 ChatGPT与人类思维的差异 | Onboarding + AI literacy |
| 更新日志 (`3DSCWk`) | 更新日志-2026 `geng-xin-ri-zhi-2026` · 2025 `geng-xin-ri-zhi-VmVs` · 2024 `geng-xin-ri-zhi-2024` | Model-drop log; dated entries `2026.9.7` style, tagged 【聊天机器人&API超市】/【API超市】/【应用超市】 |
| 在线使用 (`4fFufYjF`) | 全能工具箱 (`q0l5N7`: 全能工具箱介绍) · 聊天机器人 (`gpt302`: 介绍 `chatrobot`, 价格 `liao-tian-ji-qi-ren-jia-ge`, 创建, 设置 `liao-tian-ji-qi-ren-she-zhi`, 高级设置, 分享 `liao-tian-ji-qi-ren-fen-xiang`, 模型说明, 使用技巧 `kOnkiH` → 文件分析/图片分析/简易绘画/快捷提示词/应用商店/聊天记录云端同步/聊天记录分享/Artifacts功能/Artifacts-Claude3.5-汉语新解/集成功能) · 应用机器人 (`KdoXQn`: 介绍/创建/设置/高级设置 — slugs `GPTs-ji-qi-ren-*`) · 绘画机器人 (`ofpiL6`: 介绍/创建/使用/设置, 使用技巧 `C6ebgB` → Midjourney详细教程/风格探索) · 知识库机器人 (`JNceSc`: 介绍/原理/创建/设置/分享, 使用技巧 `SVrWXq` → 如何进行切片优化) · 工具超市 (`lFM1Da`: 介绍/工具价格 `gong-ju-shi-yong-jia-ge`/创建/设置, 工具应用技巧 `CDYAQulF` → 模型竞技场, AI电商文案助手, AI学术论文搜索, PDF全能工具箱, AI图片工具箱, AI电商场景图生成, AI视频生成器, AI视频实时翻译, AI文档编辑器, AI提示词专家) | Product docs for the "use" shell |
| Agent (`GsKGjkRO`) | Agent沙盒模式 `Agent-sha-he-mo-shi` · Agent简单模式 `agent` | |
| 外部资源 (`iyroXSdy`) | 自定义模型 `zi-ding-yi-mo-xing` · 如何选择和设置中转地区 `how-to-configure-transit-region` · 自定义API `customapi` · 导入 OpenAPI/Swagger `import` | BYO model / BYO API relay |
| API (`7pRkBt`) | API超市介绍 `API-jiao-cheng` · 什么是API？ `shen-me-shi-API` · API价格 `API-jia-ge-dY9X` · API KEY管理 `API-guan-li` · API在线调试 `API-shi-yong` · MCP Server `MCP-Server-de-shi-yong` | |
| 接入教程 (`y15Olk`) | Dify `ji-cheng-dao-Dify` · Coze `ji-cheng-dao-Coze-guo-nei-ban` · Cherry Studio · DeepChat · ChatWise · ChatMCP · LangChain `ji-cheng-dao-LangChain` · OpenAI官方SDK `ji-cheng-dao-OpenAI-guan-fang-SDK` · Claude Code `jie-ru-dao-Claude-Code` · Codex CLI `jie-ru-dao-Codex-CLI` · Qwen Code `jie-ru-dao-Qwen-Code` · Cursor `ji-cheng-dao-Cursor` · Lobe-Chat `jie-ru-dao-LobeChat` · ChatBox · LangBot · CoW (chatgpt-on-wechat) · gptsudio · 沉浸式翻译 · OpenAI Translator · GPT学术优化 (gpt_academic) · 浏览器插件 Sider · Glarity · 如何使用 SiliconCloud 模型 `ru-he-zai-302-AI-shi-yong-SiliconCloud-mo-xing` · 开源项目推荐 · 视频教程 (`bXHm2i`: 快速上手/管理后台/聊天机器人/绘画机器人/AI调研大师/模型竞技场) | 24 "how to use with X" + 6 videos. No Cline / Continue / Aider / Windsurf / Roo guide exists. |
| 其他 (`zf0yOxJX`) | 常见问题 `chang-jian-wen-ti` · 联系我们 `lian-xi-wo-men` · 客户端 `ke-hu-duan` · 价格表 `jia-ge-biao` · 自动充值 `zi-dong-chong-zhi` · iOS APP的使用说明 `iOS-APP` | |
| 个人中心 (`user-center`) | 团队管理 `team-management` | Only one child; index page lists modules 钱包/团队管理/收藏/最近浏览/个人设置/邀请返现 |

EN mirror (`/en/`) differences: categories are flattened one level (Omni Toolbox, Chat-bot, App-bot, Drawing-bot, Knowledge Base-bot, Tools Market, Agent, External Resource, API Market, Video Tutorial, Change Log, Others, User Center); Others contains **FAQ, Automatic Renewal (= 自动充值), Client, Development Log** (a roadmap page with `Completion: 10% / Estimated launch: 4th week of October` items — stale); integration tutorials are absent from the EN landing.

### 2.3 Rule-bearing pages (verbatim extracts)

| URL | Purpose | Rules / numbers (verbatim) | Last modified |
|---|---|---|---|
| `/docs/302-AI-wu-fen-zhong-shang-shou-jiao-cheng` 302.AI 入门指南 | Onboarding narrative ("AI 超市" metaphor) | "302.AI 是一个按用量付费的企业级 AI 平台"; "截至2025年5月，我们共计上线了59款AI应用"; "管理和使用是分离的 … 管理界面 = 超市采购区 / 使用界面 = 您的私有烹饪/用餐区域"; "只需点击管理后台左上角的「快捷使用」"; share security: "分享码就像是这套工具箱的开门密码 … 分享码您可以随时修改或取消 …（温馨提示：暴力枚举破解不了的哦）"; "每个用户的聊天记录都只保存在本地浏览器"; billing: "收费模式：先充值，后按量扣费 … 余额永久有效 … 全平台通用 … 统一钱包扣费"; meters: "按 Token 收费 — 输入+输出的字数合计计费" / "按 次数 收费 — 每调用一次计一次费，常见于绘图、某些工具、API 请求"; "比如你输入一段 100 字，机器人回复 200 字，就是 300 Token"; cost reference table: "轻度使用（全功能都试一点） 约 $5/月 / 只用纯文字、国产模型 约 $1/月"; calculator link `https://302.ai/pricing/` | 2025-06-11 |
| `/docs/chang-jian-wen-ti` 常见问题 (zh) | FAQ, 11 Q | "302.AI采用0月费、按用量付费模式。先充值，后扣费。"; "1百万个tokens相当于550,000个汉字或750,000个英文字符"; "每个注册用户绑定手机后都可以获得1美金的试用额度，可以体验平台所有功能"; "上线4年间，没有出过任何一次数据泄露事故 … 默认情况下，所有信息均保存在本地，服务端不会保存"; "可以将任何应用一键分发给多人使用，并控制每个用户的消耗预算"; support: "全年无休的在线客服，随时响应的客户经理，还有 … 技术交流群"; custom apps: "现阶段由于开发资源的限制，暂不支持" | 2024-11-07 |
| `/en/docs/FAQ` FAQ (en) | EN FAQ, 9 Q (older content) | **"The minimum recharge is $5 to use all AI products."**; "302.AI does not offer monthly subscription plans and set any thresholds"; "1 million tokens are approximately equivalent to 550,000 Chinese characters or 750,000 English characters"; "all robot information from 302.AI is stored locally, with no data retention on the server side" | — |
| `https://302.ai/faq/` (marketing FAQ, 7 Q, accordion) | Public FAQ | "302.AI is a pay-as-you-go enterprise-grade AI resource platform"; "With a single integration, you gain unified access to all models and only need to pay once—no separate billing for different providers"; **"Enterprise-Grade Service Quality: No TPM (tokens per minute) or concurrency limits for any user. We offer 24/7 uptime guarantees"**; "All of our deeply developed AI applications are available online and fully open-sourced, enabling enterprise users to customize and deploy them privately"; "You top up your balance first, and usage is deducted accordingly"; "Proxy302, a platform that has been online for five years without a single data breach"; "24/7 online customer support, dedicated account managers". Footer entity: **Univerads Technology Limited**; legal links: Terms `https://302.ai/legal/terms/`, Privacy `https://302.ai/legal/privacy/`, **Refund Policy `https://302.ai/refund-policy`**, Intellectual Property `https://302.ai/intellectual-property` | — |
| `/docs/API-jia-ge-dY9X` API价格 | API pricing rules (no numbers) | "所有API按需付费，不限制门槛，不设置套餐，全部开放。所有API基本和官方对齐，可以无缝衔接。充值的余额永久有效，永不过期。"; "按token付费：新兴的AI模型收费方式 / 按次数付费：传统的API收费方式"; "具体的价格请查看：https://302.ai/pricing/" (EN: `https://302.ai/pricing_api/`); "Token计算器 … https://302.ai/token/"; "每个API产生的费用可以在后台的API KEY旁的统计按钮查看" | 2024-09-09 |
| `/docs/jia-ge-biao` 价格表 | Pointer | "任何关于价格的问题，请访问我们的价格表：https://302.ai/pricing/ 我们的价格换算：**1 PTC = 1美金**" | 2025-04-30 |
| `/docs/liao-tian-ji-qi-ren-jia-ge` 聊天机器人价格 | Bot billing example | "生成机器人免费"; "1000个tokens大致相当于550个汉字或750个英文字符"; GPT-4 example: "提问价格：0.015 PTC / 1K tokens … 1PTC大约可以提问36,300个汉字 / 输出价格：0.03 PTC / 1K tokens … 1PTC大约可以回答18,150个汉字"; "1PTC（等效1美金，**7人民币**）可以使用GPT3.5约3个月时间，GPT4.0可以使用约2周时间，GPT4.0联网版可使用约1周时间。相比20美金的月费…" | 2024-08-08 |
| `/docs/gong-ju-shi-yong-jia-ge` 工具价格 | Tools billing | "所有工具按用量付费，不限制门槛，不设置套餐，全部开放。充值的余额永久有效，永不过期。" Different tools use different models → different prices; per-tool spend visible in dashboard | — |
| `/docs/zi-dong-chong-zhi` 自动充值 (EN: Automatic Renewal) | Auto-recharge | "绑定一张信用卡，当余额少于设置的金额后，自动从信用卡扣除设置的金额。此方法可**免除充值手续费**，并保障了服务不会因为欠费而停止。… 可以在后期更换信用卡，也可以随时停止。**最小自动充值金额5美金，最小自动充值阈值1美金。**（此服务由Stripe提供支持，我们无法查看或保存您的信用卡信息）" + one screenshot 「设置界面」 | 2025-01-11 |
| `https://302.ai/refund-policy` | Refund policy (EN only) | I. "All top-up operations conducted through official platform channels are **non-refundable once the amount has been credited**"; "Top-up amounts can only be used to offset PTC (Platform Token Credits) consumption … They **cannot be withdrawn, transferred, gifted to other accounts, or exchanged for cash**"; "Free PTC gifted by the Platform or PTC obtained through promotional activities are not eligible for any form of refund"; II. exceptions only for platform-caused abnormal consumption (freeze/crash/interruption with PTC deducted; duplicate/excessive deductions; audit-confirmed); III. "applicant must be the real-name authenticated account holder"; "**within 7 working days** of the abnormal PTC consumption"; evidence: "service operation logs, PTC consumption detail screenshots, and fault page screenshots"; no violations ("fraudulent billing, malicious exploitation of benefits, or unauthorized API use"); IV. submit via "in-platform online chat, official Enterprise WeChat, or designated email"; "audit … **within 3 working days**"; "refund … to the user's original payment account … generally taking **1-7 working days**"; re-apply allowed within the original 7 working days; V. no indirect-loss liability; malicious claims → "restrict, freeze, or terminate the account" | — |
| `https://302.ai/legal/terms/` (WebFetch) | ToS | "由于我们提供在线服务，我们无法为任何付费服务提供退款。详情请查看退款协议。"; platform may raise prices with notice; termination for violations. No clauses on invoices, sub-accounts, key usage, rate limits. | — |
| `/docs/lian-xi-wo-men` 联系我们 | Support | "任何界面，随时点击右下角的客服按钮"; "上班时间：全年无休，**10：00-20：00**"; "如果您有**大额充值，需要转账并开发票**，请添加我们的客户经理微信进行咨询" (→ invoices are manual, via account manager, for bank-transfer top-ups) | 2024-11-22 |
| `/docs/API-guan-li` API KEY管理 | Key rules | 8 steps: 1 "点击【使用API】-【API Keys】"; 2 "填写API名称，API过期时间默认为**永不过期**，也可自行选择**一个月、一天、一小时**"; 3 "总额度以及单日额度的【无限额度】默认开启，开启后该API KEY为无限额度，仅受到账户的剩余额度限制"; 4 "可手动将【无限额度】关闭，并填入想设定的额度；**单日额度是由当前浏览器时区的自然日0点为刷新时间**"; 5 button **「添加API KEY」**; 6 "点击API KEY图标即可查看、复制完整API密钥"; 7 "在名称处点击小图标会展现用量明细，可自行调整、查询不同时间的消耗量"; 8 "操作栏 … 删除、禁用该API，**删除API后该API不可再添加，而禁用API后可再次开启（30秒后恢复）**；另外还可在此重新编辑API信息" | 2024-09-11 |
| `/docs/API-shi-yong` API在线调试 | Debug flow | Categories: "语言大模型、图片生成、图片处理、视频生成、音视频处理、信息处理、数据向量化"; "复制后台生成的API Key，填入环境变量（只需一次，之后自动记住并应用）"; key location "管理后台 → 使用API → API Keys … 点击小眼睛图标查看，再点击复制图标复制"; docs at apifox (`302ai.apifox.cn`, deep-links `doc.302.ai/api-…`) | — |
| `/docs/team-management` 团队管理 | Sub-accounts | "**价格说明：免费**"; "个人中心 > 团队管理，点击创建子账号按钮"; "填写子账号信息、备注，选择创建的数量，配置子账号的功能权限与额度限制 … **每次最多可创建 200 个子账号**"; "子账号为系统生成的虚拟账号，格式为 **xxxx@sub.302ai**；密码也是系统随机生成"; "仅显示开启功能，未开启的功能将对其隐藏"; roles: "**普通用户**：无团队管理权限，按需开关**8个功能模块** / **管理员**：拥有团队管理权限，所有功能默认开启，无法关闭 … 部分模块（开发者、钱包、团队管理）功能与主账号同步，数据共享 … 管理员权限较高，请谨慎开启"; modules: 在线应用 / API / Agent管理 / MCP Server / 自定义模型 / 自定义API / 开发者【谨慎开启】("如 Pay with 302 收款服务") / 钱包【谨慎开启】("支持账户充值与提现") / 团队管理【谨慎开启】; password: admin edits in list ("最新密码可在初始密码查看") or sub-account self-edits in 个人中心 > 个人设置 ("主账号或管理员账号无法看到子账户修改后的密码，但可以进行密码重置"); usage: per-sub 明细 button; "数据汇总模块中，筛选账号类型为子账号" | 2025-12-17 |
| `/docs/user-center` 个人中心 | Index | Modules: 钱包 · 团队管理 · 收藏 · 最近浏览 · 个人设置 · 邀请返现 | 2025-12-17 |
| `/docs/zi-ding-yi-mo-xing` 自定义模型 | BYO model relay | "将第三方的模型API接入302.AI（例如OpenRouter，硅基流动等）"; benefits: 快速生成聊天机器人 / 解决地区限制 (中转地区) / 一键功能扩展 (联网搜索, 长期记忆…); "**自定义模型价格：… 均按照0.05美元/天，一个月仅需1.5美金**"; presets "Open Router和硅基流动的API Base"; checkbox "模型支持图片分析"; **【检查】** button validates; API path: "使用 API → API Keys → 输入API名称 → **开启自定义模型中转** → 【添加API KEY】"; capability suffix rule "自定义模型后缀加上“-web-search”（如 meta-llama/llama-3.3-70b-instruct:free-web-search）"; manage: 编辑 / 复制 / 删除 | 2025-04-30 |
| `/docs/how-to-configure-transit-region` 中转地区 | Relay region | Options in 自定义模型 → 编辑: **Hong Kong · Singapore · US East · 自定义代理**; custom proxy bought at `https://www.proxy302.com/` — "**Proxy302与302.AI账号通用，余额共享**"; "推荐选择静态IP（长效），按IP扣费；静态数据中心"; proxy string format **「代理地址:端口:用户名:密码」**, 代理方式【自定义】→【确认】 | 2025-08-19 |
| `/docs/customapi` 自定义API | BYO REST relay → MCP | "**价格说明：免费**"; project fields: API项目名称(必填) · API项目描述 · 原始路径(必填) · 转发路径 · 中转地区 · 鉴权方式(必填) · 自动转发 ("开启：原始路径的所有 API 路径将自动转发，可在API列表中禁用特定路径；关闭：仅转发手动添加且启用状态的API路径"); API fields: API名称(必填) · Function Name(必填, "仅支持字母、数字和下划线 _") · API描述 · 请求路径(必填) · 请求方法 · Params/Body/Header (Body "支持切换JSON编辑") · 测试(optional); import "OpenAPI 3、Swagger 1、2、3 … json或yaml"; MCP: Agent > MCP Server → 配置 → 自定义API工具 → 添加Server → **集成** → 复制URL | — |
| `/docs/MCP-Server-de-shi-yong` MCP Server | Hosted MCP | OSS `https://github.com/302ai/302_custom_mcp`; "不同的Server根据不同的KEY来获取工具配置，客户端只需安装一次 … 切换不同的Server只需要更改不同的API_KEY即可"; chatbot: MCP服务器设置 → type + URL → Server开关; Chatwise: 从剪切板导入JSON | — |
| `/docs/agent` Agent简单模式 | Agent = 模型+MCP+提示词 | "每个Agent会生成一个独特的模型名，可以通过OpenAI兼容的Chat API在第三方客户端进行调用"; test mode "没有分享码进行保护，也没有限额可以设置"; "**此Agent无法使用其他用户生成的API key进行调用**"; tool trace returned in **`tool_call_content`** | — |
| `/docs/Agent-sha-he-mo-shi` Agent沙盒模式 | Claude Code in remote sandbox | "每个沙盒生成后会获得唯一的模型标识 … 接入 OpenAI 兼容的客户端 / Claude 兼容的客户端"; "所有终端输出均转化为模型输出" | — |
| `/docs/liao-tian-ji-qi-ren-she-zhi` 聊天机器人设置 | Bot quota rules (mirror of key rules) | "分享码会自动生成**四位**数字，也可自行设置输入四位分享码，支持大小写英文及数字"; same 总额度/单日额度/【无限额度】/浏览器时区自然日0点 rules; "删除机器人后该机器人不可再添加，而禁用机器人后可再次开启（30秒后恢复）"; model can be changed live ("机器人页面刷新后模型才会刷新") | — |
| `/docs/liao-tian-ji-qi-ren-fen-xiang` 聊天机器人分享 | Share links | "分享链接会自动带有分享码，当对方打开后，**分享码会自动从链接删除，并且无法再次查看**"; no share code → open directly; "聊天记录默认保存本地" | — |
| `/docs/ke-hu-duan` 客户端 | Desktop | "Windows、Mac、Linux三平台客户端 下载链接：https://302.ai/download/ 不同版本的区别：https://news.302.ai/?p=5532" | 2024-11-25 |
| `/docs/iOS-APP` | iOS | Key pasted manually; "iOS APP不仅支持302.AI的API，也支持第三方OpenAI兼容格式的API"; "**国内版如果想使用海外模型，请自行切换host为api.302.ai或api.302ai.cn（去掉/cn）**" → reveals a CN host `api.302ai.cn` with a `/cn` path variant | — |
| `/docs/geng-xin-ri-zhi-2026` 更新日志-2026 | Changelog | Pure model-drop log, e.g. "2026.9.7 【聊天机器人&API超市】来自新增来自OpenAI的gpt-6-astra", "2026.7.27 … claude-opus-5和claude-opus-5-thinking", "2026.6.10 … claude-fable-5". No policy/limit changes recorded in 2026. | — |

### 2.4 "How to use with X" recipes (base URL + model rule per client)

Common preamble everywhere: "进入 302.AI 选择 API>API Keys，填写 API 名称（必填），设置有效期后，点击添加API KEY，在已有 API 列表复制新生成的 API KEY"; key prefix **`sk-`**.

| Client | Base URL given | Model / notes (verbatim) |
|---|---|---|
| Claude Code | `ANTHROPIC_BASE_URL: https://api.302.ai` | `~/.claude/settings.json` → `{"env":{"ANTHROPIC_BASE_URL":"https://api.302.ai","ANTHROPIC_AUTH_TOKEN":"sk-xxxxxxxxxxxx","ANTHROPIC_MODEL":"kimi-k2-0711-preview"}}`; "我们支持了所有模型使用Claude格式进行调用 … 例如需要调用gemini-2.5-pro,只需将kimi-k2-0711-preview替换为gemini-2.5-pro即可，不局限于Claude的模型"; custom-model relay key "每个KEY费用为0.05PTC/天"; prerequisites Node.js 18+; `npm install -g @anthropic-ai/claude-code` |
| Codex CLI | `base_url = "https://api.302.ai/v1"`, `wire_api = "responses"` | `~/.codex/auth.json` `{"OPENAI_API_KEY":"sk-…"}`; `config.toml`: `model_provider = "302ai"`, `model = "gpt-5-codex-high"`, `disable_response_storage = true`, `[model_providers.302ai] name="302.ai" … env_key="302ai"`; models `gpt-5-codex`, `-high`, `-medium`, `-low`; Node 22+ |
| Qwen Code | `OPENAI_BASE_URL="https://api.302.ai/v1"` | `.env` in project dir: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL="qwen3-coder-plus"`; also `qwen3-coder-480b-a35b-instruct`, `qwen/qwen3-coder-480b-a35b-instruct` (PPIO); Node ≥ 20 |
| Cursor | `https://api.302.ai/v1/chat/completions` → Save → Verify → toggle on | Masked Claude names because "cursor的模型的api路径是通过正则匹配": `gpt-3.5-sonnet-cursor`（已指向最新的sonnet3.7）, `gpt-4o-sonnet-cursor`（agent模式）, `gpt-3.5-sonnet-20241022-cursor`, `gpt-3.5-sonnet-20240620-cursor`, `gpt-3.7-sonnet-20250219-cursor` (stale) |
| OpenAI SDK / LangChain | `https://api.302.ai/v1/chat/completions` in code, but note says "（注意：BASE_URL 的末尾要加上 /v1）" | `gpt-4o-mini` example; `langchain_openai.ChatOpenAI/OpenAI(openai_api_base=…)` |
| Dify | API Base `https://api.302.ai/v1/chat/completions` | Method 1 OpenAI provider; Method 2 "OpenAI-API-compatible" + model name; "准确的名称可以通过这个API查看" (models endpoint) |
| Coze (国内版) | OpenAPI plugin `url: https://api.302.ai/v1/chat/completions` | "messages是一个Array，不是一个string … 否则会请求失败（系统提示词放在system里）" |
| Cherry Studio | `https://api.302.ai/v1/chat/completions#` (trailing `#` suppresses client path append) | provider type OpenAI; paste 模型ID e.g. `gemini-2.5-pro-preview-05-06`; check → "连接成功"; "302.AI修改了API格式，所有模型都兼容OpenAI的API格式" |
| DeepChat / ChatMCP | `https://api.302.ai/v1` | — |
| ChatWise | `https://api.302.ai/v1` "（注意：输入的链接不要包含 ”/chat/completions”）" | — |
| Lobe-Chat / 沉浸式翻译 / OpenAI Translator / Sider / Glarity | `https://api.302.ai/v1/chat/completions` | — |
| ChatBox | `"apiHost": "https://api.302.ai", "apiPath": "/v1/chat/completions"` | — |
| CoW (chatgpt-on-wechat) | `"open_ai_api_base": "https://api.302.ai"` | chat cmds `#model 模型名`, `切换绘图模型 模型名`; KB bots: "知识库和key是一一绑定的" |
| gpt_academic | `API_URL_REDIRECT = {"https://api.openai.com/v1/chat/completions": "https://api.302.ai/v1/chat/completions"}` | — |
| SiliconCloud | via 自定义模型 preset "SiliconCloud"; keys from `https://cloud.siliconflow.cn/account/ak`, ids from `/models` | "$0.05/day per bot / $0.05/day per key"; suffixes for 联网搜索/深度搜索/图片分析/推理/链接解析/工具调用/长期记忆 (e.g. `-web-search`) |

Observation: docs are inconsistent on whether the base is `/v1` or `/v1/chat/completions`; the gateway evidently tolerates both (prior study + Cherry `#` trick confirm path-append tolerance).

## 3. Entities & fields (as documented)

| Entity | Fields / formats / enums |
|---|---|
| **Currency / balance** | Unit **PTC** ("Platform Token Credits"); **1 PTC = 1 USD**; older copy equates to **7 CNY**; balance "永久有效，永不过期"; single wallet across bots/tools/API ("统一钱包扣费"); trial **$1** after phone bind; min recharge **$5** (EN FAQ); auto-recharge min amount **$5**, min threshold **$1**, Stripe, waives 手续费 (a recharge fee exists on manual top-ups — amount not stated in help); bank transfer + 发票 for large amounts via account manager WeChat; refunds per §2.3 (7 wd claim / 3 wd audit / 1–7 wd payout, original channel only) |
| **Meters** | `按Token` (input+output tokens; prices quoted "PTC / 1K tokens" in 2024 docs, "$/1M tokens" on pricing page) and `按次数` (per call: 绘图/工具/API); conversion "1000 tokens ≈ 550 汉字 / 750 英文字符" |
| **API Key** | Name (必填); 过期时间 ∈ {永不过期(default), 一个月, 一天, 一小时}; 总额度 & 单日额度 each with 【无限额度】 toggle (default on) else numeric PTC; daily reset 00:00 browser TZ; flag 「自定义模型中转」 (costs 0.05 PTC/day); value format `sk-…` (revealed via 小眼睛 icon, copy icon); actions 编辑 / 禁用 (re-enable after 30 s) / 删除 (permanent); per-key 用量明细 with time range; per-key 统计 button |
| **Sub-account** | login `xxxx@sub.302ai` + random password; 备注; 数量 (≤ 200 per create); 身份 ∈ {普通用户, 管理员}; 功能权限 8 modules {在线应用, API, Agent管理, MCP Server, 自定义模型, 自定义API, 开发者, 钱包} + 团队管理 (admin only); 额度限制; shared-with-main modules {开发者, 钱包, 团队管理}; per-sub 明细; 数据汇总 filter 账号类型=子账号 |
| **Chatbot / tool instance** | 备注; 模型; 分享码 (4 chars, auto 4 digits, [A-Za-z0-9]); 总额度/单日额度 (same semantics as key); 禁用/删除 (same 30 s rule); share URL auto-carries code once |
| **Custom model** | API Base (preset OpenRouter / 硅基流动 or custom); API key; 模型ID; 中转地区 ∈ {Hong Kong, Singapore, US East, 自定义代理}; capability flags (模型支持图片分析); 【检查】; relay name exposed via key; suffix capabilities `-web-search` etc.; 0.05 PTC/day |
| **Custom API project** | 名称(必填) · 描述 · 原始路径(必填) · 转发路径 · 中转地区 · 鉴权方式(必填) · 自动转发(bool) · import {OpenAPI URL, file: OpenAPI 3 / Swagger 1,2,3 json|yaml}; API: 名称 · Function Name `[A-Za-z0-9_]` · 描述 · 请求路径 · 请求方法 · Params/Body/Header · 响应 · 测试; free |
| **MCP Server** | 名称; 工具 selection (built-in + 自定义API工具); per-server API_KEY; 集成 URL; OSS 302ai/302_custom_mcp |
| **Agent** | 模型 + MCP + 提示词; unique model name callable via OpenAI Chat API; only owner's keys; `tool_call_content` in response |
| **Hosts** | `api.302.ai` (global), `api.302ai.cn` (CN, with `/cn` path variant mentioned for the 国内版 iOS app), `dash.302.ai`, `302ai.apifox.cn` / `doc.302.ai`, `news.302.ai`, `studio.302.ai`, `proxy302.com` (shared balance) |
| **Support** | in-app chat bottom-right, 10:00–20:00 全年无休; support@302.AI; account manager WeChat for 转账/发票 |

## 4. UX patterns worth copying / avoiding

**Copy**
- Rules are stated as *numbered how-to steps* with the rule embedded in the step ("4、额度关闭可自动设置 … 单日额度是由当前浏览器时区的自然日0点为刷新时间") — every threshold is next to the control it governs.
- Same quota vocabulary reused across three objects (API key, chatbot, sub-account): 总额度 / 单日额度 / 【无限额度】 / 30 s re-enable / delete-is-final. One mental model.
- Every article: 大纲 right-rail TOC, prev/next, 「最近修改」 date, 是/否 helpfulness vote, mobile QR. Category landing = cards of first 5 + 查看更多.
- Integration guides all follow the identical 3-field template (key → base URL → model id) with per-client screenshots and the one client-specific gotcha in a 「注意：」 callout.
- Pricing is centralised: help pages carry *rules* only and link to `302.ai/pricing/` + `302.ai/token/` for numbers, so docs never go stale on prices.
- Sub-account permissions rendered as an on/off module list where "未开启的功能将对其隐藏" (hide, not disable) and dangerous modules carry 【谨慎开启】.
- Refund policy is a standalone, numbered, dated-window document (7/3/1–7 working days) linked from every footer.

**Anti-patterns**
- Base-URL inconsistency (`/v1` vs `/v1/chat/completions` vs `#` hack) across guides; the OpenAI SDK page shows one URL in code and contradicts it in the note.
- Stale content: Cursor guide still maps to "sonnet3.7" masked names; EN FAQ says 4 years / min $5 while zh says $1 trial; EN Development Log promises "4th week of October" launches; changelog is model-drop-only, no policy changes.
- No search results page, no article tags, no "updated" feed; category index slugs are opaque random ids.
- Key rules (min recharge, recharge fee %, payment methods, invoice process, RPM/TPM) are not in the help center at all — recharge fee is only implied ("免除充值手续费"), invoice only via WeChat.
- EN mirror silently drops the whole 接入教程 category and uses different ids — two trees to maintain.
- Hero copy in the Chinese 入门指南 is long-form metaphor (supermarket) — good for onboarding tone, bad as a reference.

## 5. Screenshots

Persisted copy: `/Users/tseka_luk/workspace/code/personal/nebutra/nebutra-sailor/seasnake/.trellis/tasks/09-08-router-302-parity/research/shots-help/`

| File | Shows |
|---|---|
| `help-home.png` | zh landing: hero search 「请输入」, hero tabs, category cards + 查看更多, footer link groups |
| `help-en-home.png` | EN landing (flattened categories, "see more") |
| `help-api-category.png` | API category index `7pRkBt` with left tree |
| `help-faq.png` | 常见问题 article with 大纲 rail, prev/next, 最近修改, 是/否 vote |
| `help-API-guan-li.png` | API KEY管理 (expiry presets, 无限额度 toggles, 添加API KEY, 删除/禁用) |
| `help-team-management.png` | 团队管理 (创建子账号 form, 200 cap, role/module list) |
| `help-zi-dong-chong-zhi.png` | 自动充值 rule text + 「设置界面」 screenshot |
| `help-jie-ru-dao-Claude-Code.png` | Claude Code guide (settings.json env block) |
| `help-302-AI-wu-fen-zhong-shang-shou-jiao-cheng.png` | 入门指南 top |

Raw page dumps (innerText) for every article read are in the session scratchpad `…/scratchpad/pages/*.txt` (not persisted).

## 6. Open questions

1. Manual recharge fee % and accepted payment methods (Stripe card, Alipay/WeChat, USDT?) — help only says auto-recharge "免除充值手续费"; numbers live in `dash.302.ai` wallet (covered by the dashboard subagent, `dash-wallet.png`).
2. Is the "$5 minimum recharge" (EN FAQ) still current? The zh FAQ dropped it; the wallet page is the source of truth.
3. Invoice types (增值税普票/专票, overseas invoice) and whether Stripe receipts count — help says only "转账并开发票 → 客户经理微信".
4. Real rate limits: marketing claims "No TPM or concurrency limits for any user"; apifox/doc.302.ai may document per-model RPM or 429 semantics — not in help.
5. `api.302ai.cn` + `/cn` path: is there a CN-region model subset or CNY-priced catalogue? Only one sentence in the iOS page mentions it.
6. Sub-account "额度限制" unit and reset cadence (daily like keys? or one-off pool) — the article names the field but not its semantics.
7. Whether 邀请返现 (referral cashback) has published rates — 个人中心 lists the module, no article.
8. Whether "自定义模型中转" 0.05 PTC/day is charged per key *and* per bot concurrently when both exist (SiliconCloud page says each).
