# SiliconFlow (硅基流动) — China-market benchmark study

> Date: 2026-09-08/09 · Method: opencli browser session `rsf` (read-only) on public pages + WebFetch/curl of `api-docs.siliconflow.cn` · Companion to the 302.AI study at `docs/plans/2026-07-23-router-302-full-route-interaction-study.md` (route map not repeated here).
> Scope limit: `cloud.siliconflow.cn/**` (console: models square detail, API keys, balance, bills, usage) is **login-gated** and the Chrome profile is not logged into SiliconFlow. No login was attempted. Console structure below is reconstructed from the docs' own URLs and labels, and is marked as such.

## 1. Summary

SiliconFlow is a **single-product MaaS** with a much narrower surface than 302.AI: marketing site (`siliconflow.cn`) → public **模型广场** (`/models`, 100+ models, six type chips × 20 scene chips, flip-cards with ￥/M Tokens on the face) → public **价格中心** (`/pricing`, one table per modality, columns 输入/输出/缓存价格 in CNY per M Tokens, with per-row tiering by input length `[0,32k)` and by **time-of-day** `2点～8点`) → login-gated **console** (`cloud.siliconflow.cn`: `/models` + `/me/models` detail with `?tags=`/`?mfs=` filters, `/playground/chat`, `/account/ak`, `/account/authentication`, billing/invoice pages) → OpenAI-compatible API at `https://api.siliconflow.cn/v1` with an Anthropic-compatible `/v1/messages` alongside. Model ids are `vendor/Model` with a `Pro/` prefix for the paid/higher-rate-limit tier of the same weights (`Pro/BAAI/bge-m3` ¥0.07 vs `BAAI/bge-m3` 免费). Money model: prepaid CNY balance (Alipay/WeChat/corporate transfer), gifted balance now issued as **代金券 (vouchers)**, real-name verification mandatory since 2026-05-15, invoices only on consumed amounts (数电发票, 2 working days), and **rate-limit tiers L0–L5 driven by monthly spend** (¥50 / ¥200 / ¥2,000 / ¥5,000 / ¥10,000) with 7 metrics (RPM/RPH/RPD/TPM/TPD/IPM/IPD). Enterprise upsell is three products: 预留实例 (reserved instances priced ¥/组/月 with a derived ¥/M-tokens), 私有化 MaaS 平台, and a 私有化大模型服务网关 whose feature list (multi-tenant, per-key/project/org quotas, cost attribution, fallback routing, audit) is essentially the Router/gateway spec we are building.

## 2. Page / feature inventory

### 2.1 Marketing site `siliconflow.cn`

| URL | Purpose | Key fields / columns | Actions / buttons | States / notes |
|---|---|---|---|---|
| `https://siliconflow.cn/` | Home | Top nav: `产品 ▾` (mega-menu: **AI Cloud** = 大模型云服务 / AI 算力运营服务 / 预留实例; **私有化 MaaS** = 私有化大模型服务平台 / 私有化大模型服务网关) · `模型` · `价格` · `文档` (→ api-docs) · `生态合作` · `关于 ▾` (公司介绍 / 品牌理念) · `登录`. Hero carousel of 4 launch cards (model launches + 预留实例). Product matrix of 4 cards. "为什么选择" 6-pillar grid. Industry tabs (互联网/教育/政务/智算中心/AI 硬件). Logo wall. | `查看详情` `立即试用` (→ `cloud.siliconflow.cn/me/models` or `?mfs=ChinaTelecom`) · `立即体验` (→ `cloud.siliconflow.cn/account/ak`) · `联系我们` (→ Feishu form) | Deep-links straight into console pages, not to a marketing PDP. Footer: 国际站 link, 用户协议/隐私协议 hosted on docs domain, ICP/公安备案, 增值电信许可证. Screenshot `01-home.png`. |
| `https://siliconflow.cn/models` | Public 模型广场 (list only) | Search input placeholder `搜索模型名称、模型厂商、应用场景` + `搜索` button · 热门模型 quick chips (5) · **模型类型** chips: 全部/对话/生图/嵌入/重排序/语音/视频 (URL `?type=嵌入`) · **应用场景** chips (20): RAG, 通用助手, 旗舰全能, 文案创作, 长文本处理, 数学推理, Vibe Coding, 快速响应, 多模态理解 / 识别, 语音合成, 语音交互, 语音识别, 图像生成, 图像编辑, 视频生成, AIGC 内容创作, 游戏互动, 角色扮演, 内容翻译, 领域知识综合 · sort: `按默认排序 ▾` + `倒序` toggle · pagination `1 2 3 4 5` + `20 / page` · below grid: "按系列探索" cards (DeepSeek/Qwen/智谱/Kimi/MiniMax each with 3 model chips + `探索系列`) + `更多系列 / 厂商查询` | Card **front**: vendor logo + vendor slug (`zai`, `deepseek-ai`, `moonshotai`), type tag (`对话`), model id (`zai-org/GLM-5.3`), `发布时间: 2026年08月14日`, scene tags (`Vibe Coding` `旗舰全能`), `输入: ￥6 / M Tokens`, `输出: ￥28 / M Tokens`, context `1024 K`, params `744 B`. Card **back** (click flips, no route change): description paragraph, `支持功能：` `🛠️ 工具调用`, `上下文长度: 32K`, `尺寸：8B`. | No detail route on the public site — detail lives in console `/me/models`. `?series=` param is accepted but does not filter. Image cards reuse the token template (`输入: ￥0 / M Tokens` `输出: ￥0.1 / M Tokens`) — a labeling bug worth not copying. Screenshots `04-models-public.png`, `05-models-filter-embedding.png`, `06-model-detail.png` (flipped card), `08-models-series.png`. |
| `https://siliconflow.cn/pricing` | 模型价格中心 | Header badges: `实时价格同步` `仅展示可用模型` `按厂商快速定位`. Search placeholder `搜索模型名称 / DisplayName / modelId`. Modality chips 全部/对话/生图/语音/视频. Vendor chips (20): Z-ai, deepseek-ai, meituan-longcat, Kimi, nex-agi, MiniMaxAI, Tongyi-MAI, Baidu, Qwen, Stepfun-ai, inclusionAI, ChinaTelecom, hunyuan, ByteDance, Wan, openmoss, FunAudioLLM, BAAI, Kolors. **对话模型** table columns: `厂商 · 模型 · 输入价格（M Tokens） · 输出价格（M Tokens） · 缓存价格（M Tokens）`. **生图模型**: `输出价格（/张）`. **语音模型**: `输出价格（/千字符 UTF-8）`. **视频模型**: `输出价格（/个）`. | Vendor chip = scroll/jump anchor. Per-vendor group collapses with `展开更多 N 个模型`. | Cells can be **tiered**: by input length (`输入 [0, 32k)` ¥6.00 / `输入 [32k, +∞)` ¥8.00 on GLM-5.1 (Pro); Qwen3.5 tiers at 128k) and by **time window** (`费用发生时段: 2点～8点` ¥1.50/¥4.50/¥0.15 vs `0点～2点/8点～24点` ¥3.00/¥9.00/¥0.30 for DeepSeek-V4-Flash; Hunyuan-A13B 9点～18点 vs off-peak). `免费` rendered as text in the price cell; `-` for N/A. `(Pro)` suffix marks paid tier. Screenshots `02-pricing.png`, `07-pricing-vendor-filter.png`. |
| `https://siliconflow.cn/reserved` | 预留实例 (reserved capacity) | Two spec groups (高性能 / 标准版). Per model card: model id, use-case blurb, `价格 ¥ 772,200 /组/月`, `折合单价 ¥ 3.575 / M tokens`, `TPM 1000 万`, `TTFT 1500 ms`, `TPS 30`. Footnotes: 折合单价 assumes 30 days × 50% utilisation; perf assumes 24k in / 1k out / 80% cache hit. Delivery: 1–7 工作日. | `预约咨询` `立即咨询` (Feishu form) | Pure lead-gen; no self-serve purchase. |
| `https://siliconflow.cn/enterprise` | 私有化大模型服务平台 (on-prem MaaS) | Feature pillars (异构算力纳管, 100+ 预集成模型, 20+ 评测指标, 30+ 预置模板, 3 分钟可视化操作), industry tabs, testimonials, FAQ accordion | `立即咨询` | Lead-gen. |
| `https://siliconflow.cn/ai-gateway` | 私有化大模型服务网关 (AI Gateway) | Diagram nodes: 统一接口 · 智能路由 · Fallback · 限流、配额 · 可观测 · 审计日志 · 鉴权 · 计费 · 多租户 · 权限精控; upstreams: 第三方大模型推理服务 / 私有 MaaS 平台 / 私有模型 / 微调模型. Six advantages: 多模型统一接入, 路由策略 (负载均衡/故障转移), 精细治理 (按用户/API Key/项目/组织 配额), 精确成本核算 (用户/Key/项目/组织/模型/算力 穿透), 全链路观测, 数据安全 (双向脱敏). Mentions A/B、灰度、版本切换. | `预约咨询` | **This page is the closest thing to a spec for our Router admin.** |
| `https://siliconflow.cn/token-factory` | AI 算力运营服务 | 4-layer architecture graphic; two partner modes (联合运营 / 算力消纳) | `预约咨询` | Lead-gen. |
| `https://siliconflow.cn/partner` | 生态共建计划 | 6 partner types (个人/开源开发者/KOL/AI 应用/模型厂商/科研) each with 适用对象·合作方式·核心激励; incentives are 代金券 and raised free-model Rate Limits; 模型厂商 上架 via "GPU 云函数" | `立即加入` `提交合作申请` | BYOK is an explicit ecosystem concept ("产品支持 BYOK 模式接入"). |

### 2.2 Console `cloud.siliconflow.cn` (login-gated; reconstructed from docs/links)

| URL (from docs/links) | Purpose | Known fields / labels | Notes |
|---|---|---|---|
| `https://account.siliconflow.cn/zh/login` (also `/en/login?redirect=…`) | Auth | +86 phone + `Get code`, `I agree with the Terms and Privacy Policy`, `Sign Up / Log In`, `Stay logged in for 30 days`, `WeChat login`, `Email login`. Hero copy: "One API. 100+ Leading Models. Built for Scale.", "Trusted by 10M+ users and 13,000+ enterprise customers". | Google/GitHub login discontinued (FAQ). Virtual-operator numbers restricted. Screenshot `09-console-login-gate.png`. |
| `https://cloud.siliconflow.cn/models` and `/me/models` | Console 模型广场 + detail | Filters via query: `?tags=Reasoning`, `?mfs=ChinaTelecom` (manufacturer), per docs also tags for 工具调用/VLM. Detail page holds context_length, per-model Rate Limits, price. | Blocked (302 → login). |
| `https://cloud.siliconflow.cn/playground/chat` | Playground | No persistent history (docs) | Blocked. |
| `https://cloud.siliconflow.cn/account/ak` | API 密钥 | Button `新建 API 密钥`. Key format `sk-…` (Bearer). | Blocked. |
| `https://cloud.siliconflow.cn/account/authentication` | 实名认证 | 个人认证 (身份证/护照 → 支付宝扫码人脸) / 企业认证 (法人人脸 or 对公打款验证) | Mandatory since 2026-05-15 ("未实名账号无法使用平台"). |
| Billing pages (账户余额 / 充值 / 账单 / 发票申请 / 费用明细) | Finance | Recharge: 在线充值 ≤ ¥100,000/笔 (支付宝/微信); 支付宝自动充值 ≤ ¥2,000/笔, ≤ ¥6,000/日, ≤ ¥100,000/月, threshold ¥5–¥1,000; 对公转账 ≤ ¥1 亿/笔, needs 企业认证 + same-name bank account. Invoice form fields: 申请开票金额 · 费用名称 · 抬头名称和税号 · 发票类型 (增值税专用/普通, 数电发票) · 接收方式. | Blocked; paths not confirmed. |
| Fine-tune console | 模型微调 | Steps: 选择模型类型 → 任务名称 → 基础模型 (Qwen2.5-7B/14B/32B/72B-Instruct) → 上传训练数据 (.jsonl) → 验证集 (默认 10%) → 参数 (LR 0–0.1 建议 0.0001; epochs 1–10 建议 3; batch 1–32 建议 8; max tokens 0–4096; LoRA rank 1–64, alpha 1–128, dropout 0–1) → `开始微调`. Billing: 训练 and 推理 charged separately. | Blocked. |

### 2.3 Docs `api-docs.siliconflow.cn` (public, fully read)

| Section | Pages (exact paths under `/docs/`) |
|---|---|
| User guide | `userguide/introduction`, `userguide/quickstart` |
| Capabilities | `userguide/capabilities/text-generation`, `reasoning`, `stream-mode`, `multimodal-vision`, `images`, `video`, `text-to-speech` |
| Guides | `userguide/guides/function-calling`, `json-mode`, `fim`, `prefix`, `batch`, `fine-tune` |
| FAQs | `userguide/faqs/rate-limit-and-upgradation`, `error-code`, `authentication`, `invoice`, `misc`, `misc_finance`, `misc_use`, `listing_guide` |
| API reference | `api/chat-completions-post`, `api/messages-post` (Anthropic-compatible), `api/embeddings-post`, `api/rerank-post`, `api/images-generations-post`, `api/audio-speech-post`, `api/audio-transcriptions-post`, `api/uploads-audio-voice-post`, `api/audio-voice-list-get`, `api/audio-voice-deletions-post`, `api/video-submit-post`, `api/video-status-post`, `api/files-post`, `api/files-get`, `api/batches-post`, `api/batches-get`, `api/batches-{batch_id}-get`, `api/batches-{batch_id}-cancel-post`, `api/models-get` |
| Release notes | `release-notes/overview` — deprecations (weekly cadence, 7-day notice), price changes, `/user/info` retired 2026-08-14, gifted balance → 代金券 2025-12-17, mandatory 实名 2026-05-15 |

Legacy `docs.siliconflow.cn/cn/...` paths still host 用户协议/隐私协议 only.

## 3. Entities and fields as observed

### Model
- `id`: `vendor/Name` (`deepseek-ai/DeepSeek-V4-Flash`, `Qwen/Qwen3-Embedding-8B`, `zai-org/GLM-5.3`, `Wan-AI/Wan2.2-T2V-A14B`, `fnlp/MOSS-TTSD-v0.5`); paid tier prefix `Pro/` (`Pro/BAAI/bge-m3`); international site uses slug routes `/models/deepseek-v4-flash`.
- Public card: `vendor` (slug + logo), `type` ∈ {对话, 生图, 嵌入, 重排序, 语音, 视频}, `发布时间` (YYYY年MM月DD日), `scene tags[]` (20-value enum above), `输入价格` / `输出价格` (￥ per M Tokens), `context` (`1024 K`, `32K`), `params` (`744 B`, `8B`), description, `支持功能` (🛠️ 工具调用, also Reasoning/VLM tags in console).
- `GET /v1/models?type=text|image|audio|video&sub_type=chat|embedding|reranker|text-to-image|image-to-image|speech-to-text|text-to-video` → `{object:"list", data:[{id, object:"model", created, owned_by}]}`.
- International detail page adds: `Max output` (e.g. 393K), `License` (MIT), reasoning modes (Non-Think / Think High / Think Max), `Cached Input` price, CTAs `Open in Playground`, `API Reference`, related-models table.

### Price
- Currency **CNY**, symbol `¥` / `￥`, 2-decimal in pricing table (`¥ 8.00`), trimmed on cards (`￥6`).
- Units: 对话/嵌入/重排序 = `/ M Tokens` (输入 · 输出 · 缓存); 生图 = `/张`; 语音 = `/千字符 UTF-8` (docs also say per UTF-8 byte); 视频 = `/个`.
- Tiering dimensions seen: input-length bucket (`[0, 32k)` / `[32k, +∞)`; `[0,128k)` / `[128k,+∞)`), time-of-day window (`2点～8点` / `0点～2点/8点～24点`; `9点～18点` / off-peak), `免费`, cache-hit price. Batch = 50% of realtime.
- Formula per docs: `输入tokens × 输入单价 + 输出tokens × 输出单价`; reasoning tokens reported in `usage.completion_tokens_details.reasoning_tokens`, cache in `usage.prompt_tokens_details.cached_tokens`.
- Reserved: `¥ /组/月` + derived `¥ / M tokens`, TPM (万), TTFT (ms), TPS.

### Account / money
- Balances: 充值余额 (recharge) + 代金券 (vouchers, replaced 赠送余额 2025-12). Real-name status enum {未认证, 个人认证, 企业认证}; enterprise-verified account "归属为企业".
- Recharge channels: 支付宝, 微信, 支付宝自动充值 (threshold + amount), 对公转账. Limits listed in §2.2.
- Invoice: type {增值税专用发票 (企业 only), 增值税普通发票}, form 数电发票, only 已消费金额, 2 工作日.
- Usage level `L0…L5` from max(上个自然月消费, 当月1号至今消费): L0 <¥50, L1 ¥50–199, L2 ¥200–1,999, L3 ¥2,000–4,999, L4 ¥5,000–9,999, L5 ≥¥10,000; also 等级包 purchasable.

### Rate limits
- Metrics: RPM, RPH, RPD, TPM, TPD, IPM, IPD. Ranges: chat RPM 1,000–10,000 / TPM 50k–5M; embedding RPM 2,000–10,000 / TPM 500k–10M; rerank RPM 2,000 / TPM 500k; image IPM 2 / IPD 400. Free models = fixed limits, need 实名. 429 body message `Request was rejected due to rate limiting.`

### API key / auth
- Header `Authorization: Bearer sk-…` (same header for `/v1/messages`). Base `https://api.siliconflow.cn/v1`. Trace header `x-siliconcloud-trace-id`.

### Errors
- HTTP 400 参数不正确 · 401 API Key 没有正确设置 · 402 账户欠费 · 403 权限不够 (often 未实名) · 429 rate limit · 500 · 503/504 过载. Body `{code: 20012, message: "Model does not exist. Please check it carefully.", data: null}`; success envelope on files API `{code: 20000, message: "Ok", status: true, data: {...}}`.

### Batch / files / async
- File: `POST /v1/files` (`purpose: "batch"`) → `{id: "file-jkvytbjtow", object:"file", bytes, createdAt, filename, purpose}`.
- Batch: `POST /v1/batches` {input_file_id, endpoint:"/v1/chat/completions", completion_window "24h"–"336h", metadata ≤16 kv, replace.model} → {id, status, request_counts, output_file_id, error_file_id, expires_at, created_at, completed_at, cancelled_at}; status enum `in_queue | in_progress | finalizing | completed | expired | cancelling | cancelled`; ≤1 GB, ≤5,000 lines, results kept 30 days; models DeepSeek-V3.1-Terminus / V3 / R1.
- Video: `POST /v1/video/submit` → `{requestId}`; `POST /v1/video/status` → URL valid 1 h; sizes 1280x720 / 720x1280 / 960x960.
- Image: `POST /v1/images/generations` → `{images:[{url}], timings:{inference}, seed}`; URLs expire after 1 h; `batch_size` 1–4 (Kolors), `image_size` "WxH".
- TTS: `POST /v1/audio/speech` binary; voice `model:name` (`fnlp/MOSS-TTSD-v0.5:alex`); 8 system voices alex/benjamin/charles/david/anna/bella/claire/diana; custom voice via `/v1/uploads/audio/voice` {model, customName, audio, text}, list `/v1/audio/voice/list`, delete `/v1/audio/voice/deletions`; `response_format` mp3|opus|wav|pcm, `speed` 0.25–4.0, `gain` −10–10 dB, input ≤128,000 chars.
- Chat extras: `enable_thinking`, `thinking_budget` 128–32768, `reasoning_effort` high|max, `min_p`, `top_k` (default 50), `frequency_penalty` default 0.5, `response_format` text|json_object|json_schema, `tools` ≤128, `reasoning_content` alongside `content`.

## 4. UX patterns worth copying — and anti-patterns

**Copy**
1. **Two-axis chip filtering on the square** (模型类型 × 应用场景) reflected in the URL (`?type=嵌入`), with a 热门模型 quick-chip row and `20 / page` pagination — lightweight, no sidebar.
2. **Price on the card face**, in the same unit everywhere (`￥ / M Tokens`), plus context and param size as two small stat cells — buyers compare without opening detail.
3. **Pricing page as grouped tables by modality with modality-specific unit in the column header** (`输出价格（/张）`, `（/千字符 UTF-8）`, `（/个）`) rather than forcing everything into tokens; vendor chip row as jump anchors; `展开更多 N 个模型` per vendor group; `免费` as a first-class cell value; explicit tier sub-rows for length buckets and time windows.
4. **Trust badges on the pricing header** (`实时价格同步` `仅展示可用模型`) — states the freshness/availability contract up front.
5. **`Pro/` prefix as a naming convention** for "same weights, paid tier, higher rate limits" instead of a separate SKU page.
6. **Spend-derived rate-limit levels L0–L5** with published thresholds, 7 named metrics, and a documented 429 message — copy the vocabulary (RPM/TPM/IPM/IPD) for Router quota UI.
7. **Marketing CTAs deep-link into console pages** (`/account/ak`, `/me/models?mfs=…`) — no intermediate PDP.
8. **Release-notes page as the deprecation channel** with fixed 7-day notice and model-id lists; price changes announced there too.
9. **Gateway product page vocabulary** for the admin: 统一接口 / 智能路由 / Fallback / 限流、配额 / 可观测 / 审计日志 / 鉴权 / 计费 / 多租户 / 权限精控, and cost attribution by 用户 → API Key → 项目 → 组织 → 模型.
10. **Invoice form field set** (申请开票金额 · 费用名称 · 抬头名称和税号 · 发票类型 · 接收方式) and the rule "only consumed amounts are invoiceable".

**Anti-patterns (do not copy)**
- Public square has **no detail route**: clicking a card flips it in place; deep link / share / SEO of a model is impossible on the CN site (the international site does have `/models/<slug>`).
- Image/video cards reuse the token template (`输入: ￥0 / M Tokens` for a per-image model) — unit mismatch on the card.
- Public models page and pricing page **disagree** (models page: DeepSeek-V4-Flash ￥1/￥2, GLM-5.3 ￥6/￥28; pricing page: ¥3.00/¥9.00 (peak) and ¥8.00/¥28.00) — two sources of truth. Router should render one price service.
- `?series=` and vendor chips on pricing behave as anchors/no-ops rather than filters — filter affordance without filter semantics.
- Everything past the square is behind login (even model detail, playground and price-per-model rate limits) — high friction for evaluation; 302's public 货架 is better here.
- Time-of-day pricing is powerful but shown as six stacked cells per row — hard to scan; if adopted, render as a badge + tooltip.

## 5. Screenshots

Directory: `/Users/tseka_luk/workspace/code/personal/nebutra/nebutra-sailor/seasnake/.trellis/tasks/09-08-router-302-parity/research/shots-siliconflow/`

| File | What |
|---|---|
| `01-home.png` | siliconflow.cn home (hero carousel, nav) |
| `02-pricing.png` | 模型价格中心 default view |
| `03-models-square.png` | `cloud.siliconflow.cn/models` → redirected to login page |
| `04-models-public.png` | Public 模型广场 default (chips, cards, pagination) |
| `05-models-filter-embedding.png` | `?type=嵌入` filtered grid |
| `06-model-detail.png` | Card flipped (back face: description / 支持功能 / 上下文长度 / 尺寸) |
| `07-pricing-vendor-filter.png` | Pricing after clicking vendor chip `deepseek-ai` |
| `08-models-series.png` | `?series=Qwen` (no filtering applied) |
| `09-console-login-gate.png` | `cloud.siliconflow.cn/account/ak` login gate |

## 6. Open questions

1. Console-only surfaces unverified: exact paths and columns of 账户余额/充值/账单/费用明细/用量统计/发票 pages, API-key table columns (name, created, last used, per-key限额?), whether sub-accounts/teams exist (docs FAQ says nothing about teams). Needs a SiliconFlow login (owner action, not this agent).
2. Which price is authoritative when `/models` cards and `/pricing` differ (V4-Flash ￥1/￥2 vs ¥3/¥9)? Possibly the card shows a promo/night price, or is stale.
3. Are 代金券 consumed before 充值余额, and do they expire? Release note only says "赠送余额转为代金券形式".
4. Per-model rate-limit values at each L-level (only ranges are public; detail is in the gated model page).
5. Does `/v1/messages` require `anthropic-version`? Docs show only `Authorization: Bearer`.
6. Fine-tune job status enums and `ft:` model-id format are not documented publicly.
7. Enterprise gateway is on-prem lead-gen only — no self-serve multi-tenant org/project UI exists in the cloud console as far as public docs show; confirm before assuming parity targets there.
