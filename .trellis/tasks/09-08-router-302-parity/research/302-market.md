# 302.AI public market shell — SKU taxonomy & page inventory (2026-09-09)

Builds on `docs/plans/2026-07-23-router-302-full-route-interaction-study.md` (route map, top-bar chrome, hover matrix). This document does **not** repeat that route map; it captures the complete category → brand → SKU taxonomy, the card/detail field model as actually served, and the public data endpoints that drive them.

Companion files in this directory:

- `302-products-dump.json` — all **1,608** published products (`lang=en`, raw API objects).
- `302-category-tree.zh.json` — the `category:home` tree (zh-CN labels, per-brand counts, brand descriptions, brand logos).
- `shots/` — screenshots listed in §5.

## 1. Summary

302.AI's market is one Nuxt 3 SSR shell with two first-level "categories" (`cate=api`, 1,539 SKUs; `cate=tool`, 69 SKUs), each split into fixed **tags** (8 API tags, 9 App tags) and, under each tag, **brands** (33 brands under LLM, 27 under Image Generations, … 16 under Tools API; every App tag's "brands" are just the app names themselves, count 1). A SKU is a `product` row with `product_type ∈ {api_model, api_service, tool}`; `api_model` (680) is a chat-style model priced Input/Output per `1M tokens`, `api_service` (859) is any other endpoint priced by a free-text `special_pricing` string (`$0.06/s`, `$0.028/image`, `$52.5/1M characters`, `Free`, …), and `tool` (69) is an app with a `Pay-As-You-Go / Depends on the specific model used` placeholder. The whole shelf is served by a single public, unauthenticated JSON endpoint — `GET https://302.ai/api/cache/product-list?lang=en&page=N&pageSize=20&category=api|tool[&tag=…][&brand=…][&keyword=…]&type=new|hot|random|created_time_asc|price_desc|price_asc` — with `pageSize` hard-capped at 20 and the list page using infinite scroll (no pager). Card = image + ★ favourite + hover overlay (`View Documentation` / `Try Now`) + `name` (model id, monospace-ish) + 2-line `description` (full text in `title` tooltip) + chips `[Model|API|App] [tag]` + capability icons + price block. Detail page = breadcrumb `API / LLM / OpenAI`, hero (image, name, description, `created_time`, chips, 4-row price incl. Cache Creation/Read, `Bulk order?` upsell, `View Documentation` / `Playground` / `Favorite` / `Copy to AI`), then anchored sections `API Overview · Playground · API Analytics · API Reference · API Pricing · Recommended` plus `Production Environment` / `CN Forward` tabs.

## 2. Page / feature inventory

### 2.1 Market home — `/`, `/?product_type=api`, `/?product_type=tool`

| Item | Observed |
|---|---|
| Purpose | Landing shelf; `product_type` toggles the left category column and the banner set; the bottom shelf is shared (`home:product-list` of the same type). |
| SSR payload keys | `category:{api\|tool}:zh-CN`, `banner-list:{api\|tool}:zh-CN`, `home:product-list:zh-CN:new` (10 products), `category-product-list:{api\|tool}:zh-CN` (8/9 rows: `{key,name,sort_order,products[]}` = per-tag preview products). |
| Top chrome (above shelf) | promo strip (`302 Media Studio: An AI Agent-Powered Multimedia Workspace →`), utility bar `USD $ ▾ · English ▾ · <user name> ▾` left; `Home · Dashboard · Quick-Start · Technical Support ▾ · Change Log · Notify` right (`Notify` opens a rich-text popover "Join the 302.AI Discussion Group" with a Discord QR code). |
| Search | `input placeholder="What do you want AI to do?"` + `Search` (title=搜索) + `AI Search` (title=AI推荐). Search → `/product/list?cate=api&keyword=…` (SSR key `product-list:{"cate":"api","keyword":"claude"}`). |
| Pill nav (home only) | `App Store` (`/?product_type=tool`) · `API Store` (`/?product_type=api`) · `Download` (`https://studio.302.ai/en`) · `Model Leaderboard` (`/model-leaderboard`) · `Github`. Active pill is purple. |
| Left column | `Category` heading; one row per tag: coloured icon + tag name + first N brand chips (as many as fit) + `>` chevron. **No** `API \| App` toggle on the home (that toggle lives on `/product/list`). Hover row → flyout (see below). |
| Middle | Banner carousel (`banner-list`: `id,title,image_url,link_url,description,position,status,sort_order,target_type,created_on,modified_on`); banners link to 302 blog "Benchmark Lab review" posts; last one (`sort_order:1`) is a static key-visual with empty `link_url`. |
| Right (logged-in) | Blank/pale panel in the screenshots — the "Hi~ login card" from the prior study is only rendered logged-out; logged-in it shows a placeholder skeleton. |
| Bottom shelf | Tabs `Latest · Popular · Recommended` (API type values `new · hot · random`), grid/list toggle icons at right, 5-column card grid, 10 cards. `Popular` = `is_hot=true` subset (63 site-wide; 36 of them LLM). |
| Floating rail (fixed right) | `Contact us · Price List · Token Calculator · Client · Help Center` + `Top` (appears after scroll). |
| Ad chip (fixed bottom-left) | `Enterprise Verification 10% OFF · Start Now ›` with an ✕ close. |
| Category row hover flyout | Header = tag name; 4-column grid of **brand cards**: `brand name` (bold) + brand `logo` (right) + one-line `description` (truncated with `…`). Data straight from `category.tags[].brands[] = {name,count,description,logo}`. Card click → `/product/list?cate=api&tag=<Tag>&brand=<Brand>`. |

### 2.2 List page — `/product/list?cate=api|tool[&tag=…][&brand=…][&keyword=…]`

| Item | Observed |
|---|---|
| Title pattern | `LLM - API Marketplace - 302.AI \| Enterprise-Level Integration Optimization, Comprehensive AI Model APIs`; App side: `Robots - App Store - 302.AI \| Pay-As-You-Go, Latest AI Models and Applications`. With no `tag`, the title still names the first tag (LLM / Robots) but the shelf is the whole category (`total_count` 1539 / 69). |
| SSR payload | `product-list:{"cate":"api","tag":"LLM"[,"brand":"OpenAI"][,"page":"2"]}:zh-CN` = `{total_count, returned_count, products[20]}` + `category:home:zh-CN`. **`page` in the URL is echoed into the key but ignored** — SSR always renders page 1. |
| Taxonomy mega-panel | `Category` + segmented toggle `API \| App` (purple pill) + collapse chevron at far right. Body `#categoryRef`: `<ul><li>` per tag → `<h4><a href="/product/list?cate=api&tag=LLM">` then a chip `<a>` per brand `…&brand=OpenAI`. Chips wrap onto multiple lines; the active tag is purple. |
| Shelf header | Current tag as a purple-underlined tab (`LLM` / `Robots`); right: `Date ⇅` · `Price ⇅` sort toggles, then grid ▦ / list ☰ icons. Sort maps to API `type=created_time_asc` / `price_desc|price_asc`. |
| Grid | `div.grid.grid-cols-5.gap-x-4.gap-y-4`; each cell `div.w-full.relative` wraps a hidden `arco-checkbox` (batch-select, hidden on public shelf) + `article.product-item`. |
| Paging | **Infinite scroll**: 20 per fetch, bars-spinner at bottom, `GET /api/cache/product-list?…&page=2` on intersection. No page numbers, no "load more" button, no result count shown to the user. |
| Empty / error | Not observed on the public shelf (every tag×brand chip has ≥1 SKU). The API returns `{"code":-1,"msg":"[{'field': 'type', 'err': \"Input should be 'new', 'hot', 'random', 'created_time_asc', 'price_desc' or 'price_asc'\"}]","data":{}}` on a bad param, `{"code":0,"msg":"商品查询成功",…}` on success. |

### 2.3 Product card (`article.product-item`) — the shelf atom

| Zone | Markup / label | Source field |
|---|---|---|
| Cover | `figure > .product-image-wrap > img[alt=name]` (brand key-visual, gradient background) | `image_url` / `cover` |
| Top-left | `.product-type` — empty on public shelf | — |
| Top-right | ★ `arco-icon-star-fill` (class `unfavorite`, opacity 0 → 1 on `group-hover`) | `is_favorited` (null when logged-out) |
| Hover overlay | `.product-pop` bottom strip `bg-primary-600/80`: `<a target=_blank>View Documentation</a>` ‖ `<div>Try Now</div>` (App side: `View Details` ‖ `Try Now`) | `api_doc_url` / `jump_url_logged_in` (fallback `jump_url_logged_out`) |
| Title | `h2.arco-typography` 1-line clamp, `title=name` | `name` (the **model id**, e.g. `gpt-6-astra`, `sophnet/QwQ-32B`) |
| Description | `.product-desc` 2-line clamp, `title=` full text (native tooltip; a black custom tooltip on hover) | `description` |
| Chips row | `[Model]` (border `#8E47F0`, `bg-primary-100`) or `[API]` or `[App]` → `product_type`; then `.product-cate-icon.<Tag>` chip = tag icon + tag name, coloured by `--color-<Tag>`; then capability icons (image / video / thinking / function-call / audio) | `product_type`, `tag`, `model_capabilities{audio,image,video,thinking,function_call}` |
| Price block | `.product-price-wrap` (min-h 44px). Shape A (`api_model`): `⇥ Input: $10/1M tokens` / `⇤ Output: $50/1M tokens`; if >1 price row → each value gets a trailing `starting from` and shows the lowest. Shape B (`api_service`/`tool`): `Pricing: $0.06 /Second starting from`, `Pricing: $0.075 /image`, `Pricing: Depends on the specific model used` | `price_info[]` (`platform_input_price`, `platform_output_price`, `suffix`, `special_pricing`) |
| Hidden link | `<a class="hidden" href="/product/detail/<alias_name>" target=_blank>` — the whole card is the click target | `alias_name` |
| Not on card | `is_hot` has **no visual badge** on the card (only surfaces via the `Popular` tab / `type=hot`). No "new" badge either — `Latest` tab = `created_time` desc. `view_count`, `usage_count`, `context_length` are not on the card. |

### 2.4 Product detail — `/product/detail/<alias_name>`

| Item | Observed |
|---|---|
| Title | `gpt-6-astra - API: Pricing, Docs & Review \| 302.AI (Pay-as-you-go)` |
| SSR payload | `product-detail:<alias>:zh-CN` (full product + `introduction` rich HTML) and `product-detail-openapi:<alias>:zh-CN` (null for this SKU). |
| Breadcrumb | `API / LLM / OpenAI` — each level links back to the list with the corresponding `cate`/`tag`/`brand`. |
| Hero | cover image (left) · `name` · `description` · `created_time` (`2026-09-07`) · chips `[LLM] [img] [fn]` · price rows `Cache Creation: $12.5/1M tokens · Cache Read: $1/1M tokens · Input: $10/1M tokens · Output: $50/1M tokens` · orange upsell `Bulk order? Contact your manager for exclusive deals` · buttons `View Documentation` (outline) · `Playground` (filled, only when `playground_support`) · `Favorite` (☆) · split-button `Copy to AI ▾` top-right. Right third = skeleton placeholder (analytics widget, empty for a 2-day-old SKU). |
| Left anchor nav | `API Overview · Playground · API Analytics · API Reference · API Pricing · Recommended` (sticky, purple bar on active). Tab strip also exposes `Production Environment` / `CN Forward` (endpoint-host switch: `api.302.ai` vs CN forward). |
| API Overview | `introduction` HTML (Quill markup, `h3` headings coloured purple). |
| API Analytics | Stat tiles `Success Rate (0%) · First Byte Latency (0 s) · Throughput (0 tps) · Average Total Time (0 s)`. |
| API Reference (N) | Table: `API Description · API Endpoint · Request Method · Stability · Parameter Description`; rows from `definition[] = {title,url,method,stability,link}` rendered as `Chat（Talk）· https://api.302.ai/v1/chat/completions · POST · Stable · View Details`. `stability green→Stable`, `yellow` → beta label. |
| API Pricing | Currency quick-switch `$ ￥ 円 ₽`; table `Model · Description · Context · Official Price · 302.AI Price · Official Price Gap`; one row per `price_info[]` entry (`gpt-6-astra · - · 1000000 · Input $10 / 1M tokens, Output $50 / 1M tokens · Cache Creation $12.5…, Cache Read $1…, Input…, Output… · Original Price`). |
| Recommended | 10 more cards (same card component) from the same tag. |
| App detail | Same shell; `definition` empty, pricing row `按量付费 / Pay-As-You-Go`, primary CTA opens `jump_url_logged_in` (e.g. `https://media.302.ai`, `https://gpt-image-canvas.302.ai/`). |

### 2.5 Public data endpoints (Nuxt server routes, no auth)

| Endpoint | Params | Returns |
|---|---|---|
| `GET /api/cache/product-list` | `lang=en\|zh`, `page` (1-based), `pageSize` (**max 20**, larger values silently clamp), `category=api\|tool`, `tag=<en tag label>`, `brand=<brand label>`, `keyword=<free text>`, `type=new\|hot\|random\|created_time_asc\|price_desc\|price_asc` | `{code:0,msg:"商品查询成功",data:{total_count,returned_count,products[]}}` |
| `GET /api/cache/product-detail` | exists, but the alias param name is not `alias` (`{"code":-1,"msg":"商品 undefined 未找到"}`) | — |
| `/api/cache/filter_tags`, `/category`, `/banner-list` | not exposed (redirect to `/`) — the category tree is only in the SSR payload | — |
| Bundle route table (`JMe`) | `/products/list`, `/products/filter_tags`, `/products/detail/{product_id}`, `/products/openapi/{product_id}`, `/products/favorites/{toggle,list,batch}`, `/products/recent-views/{list,batch,{view_id},batch-favorite}`, `/products/feature`, `/products/specialty_products`, `/banner/list` | upstream (dash-api) names behind the cache route |
| Other XHR on load | `dash-api.302.ai/user/info`, `dash-api.302.ai/proxy/announcements`, `dash-api.302.ai/gpt/api/models/ids`, `302.ai/api/captcha-config`, `302.ai/api/user/check-tourist` | account/announcement/model-id list |

## 3. Entities and fields (as served)

### 3.1 Category tree (`category:home`) — `{categories[], total_products}`

```
categories[]: { key: "api"|"tool", name, count, tags[] }
tags[]:       { name, count, brands[] }          # 8 API tags, 9 tool tags, fixed order
brands[]:     { name, count, description, logo } # description = one-liner used in the flyout card
```

Tag labels, zh → en (URL uses the **en** label with `+` for spaces; brand param is the display label as-is, e.g. `brand=Long-Term+Memory(Beta)`, `brand=%E7%BE%8E%E5%9B%A2`):

| cate | zh | en (URL `tag=`) | SKUs | brands |
|---|---|---|---|---|
| api | 语言大模型 | `LLM` | 678 | 33 |
| api | 图片生成 | `Image Generations` | 207 | 27 |
| api | 图片处理 | `Image Processing` | 142 | 25 |
| api | 视频生成 | `Video Generation` | 209 | 25 |
| api | 音视频处理 | `Audio-Video Processing` | 90 | 19 |
| api | 信息处理 | `Data Processing` | 86 | 23 |
| api | RAG相关 | `RAG-related` | 39 | 7 |
| api | 工具API | `Tools API` | 88 | 16 |
| tool | 机器人 | `Robots` | 5 | 5 |
| tool | 工作效率 | `Work Efficiency` | 13 | 13 |
| tool | 学术相关 | `Academic Related` | 3 | 3 |
| tool | 图片处理 | `Image Processing` | 20 | 20 |
| tool | 音频相关 | `Audio Related` | 5 | 5 |
| tool | 视频相关 | `Video Related` | 6 | 6 |
| tool | 代码相关 | `Code Related` | 4 | 4 |
| tool | 信息处理 | `Information Processing` | 9 | 9 |
| tool | 客户端 | `Client` | 4 | 4 |

Brand naming is **not normalised**: `Minimax` and `MiniMax` are two brands (LLM 3 + 9, Video 6 + 5); `Tongyi Qianwen` (通义千问, 117 — "collection of Chinese models" catch-all) vs `Qwen` (42, open-source); `Google` vs `Gemini`; `Kling` appears as `Kling可灵` in Image tags and `可灵` in Video; `Baichuan Al` (typo, capital-I as lowercase-L); tool brands `AI Prompt Expert ` / `AI Prompt Expert 2.0\t` carry trailing whitespace and ` Android APP` a leading space, and the tool `Desktop Client` is filed under brand `Open Source Client` although the chip says `Desktop Client`. Aggregators (`SiliconFlow`/硅基流动 70, `PPIO` 44, `SophNet` 44, `WaveSpeed` 61+73+2+1) are brands, so the same model can appear several times (`deepseek-ai/DeepSeek-R1-0528-Qwen3-8B` under SiliconFlow, `sophnet/QwQ-32B` under SophNet, `baidu/ernie-4.5-300b-a47b-paddle` under PPIO).

### 3.2 Product (SKU) — 1,608 published, `status` always `published`

| Field | Type / format | Notes |
|---|---|---|
| `id` | int (3158) | internal; not in URLs |
| `name` | string | **displayed title** = model id / endpoint name / app name; not unique (aggregator prefixes `sophnet/`, `siliconflow` slugs) |
| `alias_name` | slug (`openai-gpt-6-astra`, `siliconflow-Pro-thudm-glm-4-9b-chat`, `302ai-Gpt-Image-2-Canvas`) | detail URL segment; mixed-case, dots allowed (`gemini-3.8-flash`) |
| `model_id` | int (1740) / 0 for tools | links to the gateway model registry (`/gpt/api/models/ids`) |
| `tool_id` | int / null | 60 for all apps seen |
| `tool_name` | string | = `name` |
| `description` | string | one-liner, localised by `lang` |
| `introduction` | HTML (detail only) | Quill rich text |
| `product_type` | `api_model` (680) · `api_service` (859) · `tool` (69) | chip label `Model` / `API` / `App`. LLM tag is 668 model + 10 service; Image Generations 201 service + 6 model; Data Processing 80 + 6. |
| `tag` | en/zh label per `lang` | one tag per product |
| `brand` | label | one brand per product |
| `definition[]` | `{title, url, method, stability, link}` | endpoints: `method ∈ POST(3186)/GET(549)/DELETE(7)/PUT(3)`, `stability ∈ green(3389)/yellow(355)`, `url` relative to `https://api.302.ai` (top: `/v1/chat/completions` 1543, `/chat/completions` 125, `/ws/api/v3/predictions/{requestId}/result` 118, `/v1/responses` 99, `/v1/messages` 92, `/v1beta/models/{model}:generateContent` 22, `/v1/embeddings` 20, MJ `/mj/submit/*`, Kling `/klingai/task/{id}/fetch`, Aliyun `/aliyun/api/v1/tasks/{task_id}` …); `link` = Apifox doc page |
| `image_url` / `cover` | CDN png (`file.302.ai/gpt/resource302db/…`, sometimes `file.302ai.cn`) | brand key-visual; identical values |
| `video_url` | url / null / "" | 60 products carry a demo video |
| `price_info[]` | see 3.3 | 1 row (1051), 2 (278), 3 (141) … up to 28 rows |
| `api_doc_url` | url | hosts: `302ai-en.apifox.cn` 1503, `302.ai` 58, `doc.302.ai` 16, `s.apifox.cn` 7, `302ai.apifox.cn` 7, `302ai-jp.apifox.cn` 3, `doc-en.302.ai` 3, `github.com` 2, app subdomains, `apps.apple.com` 1; 2 empty |
| `jump_url_logged_in` / `jump_url_logged_out` | url | "Try Now" target; `logged_out` populated for 375 (mostly Apifox pages) |
| `is_hot` | bool | 63 true → `Popular` tab; no badge on card |
| `playground_support` | bool | 724 true → `Playground` button on detail |
| `is_favorited` | bool / null | null when anonymous |
| `model_capabilities` | `{audio,image,video,thinking,function_call}` | image 364, function_call 468, thinking 144, video 46, audio 14 |
| `open_source` / `open_source_url` | always null | present but unused |
| `view_count`, `usage_count`, `sort_order` | ints | `usage_count` always 0; `sort_order` drives Latest tab ties |
| `created_on`, `modified_on` | unix seconds | |
| `created_time` | `YYYY-MM-DD` | shown on detail hero |
| `status` | `published` | |

### 3.3 `price_info[]` row

```
{ name, rate, suffix, description, input_price, output_price, is_multimodal, context_length,
  special_pricing, file_support_type,
  platform_input_price, platform_output_price,
  platform_cache_read_price?, platform_cache_creation_price? }
```

- **Currency**: all numbers are USD; the UI converts via the `USD $ ▾` dropdown / `$ ￥ 円 ₽` quick-switch (client-side, no per-currency fields).
- **`rate`** = 302 markup over official: `1` (2773 rows), `1.1` (113), `1.2` (7), `1.5` (5), `0.3/0.7/0.8` (discounted). Displayed price = `platform_*_price` (= official × rate, e.g. `qwen3.8-max` official 1.8 → shown `$2.16`); `input_price`/`output_price` = official ("Official Price" column; "Official Price Gap" = the delta).
- **`suffix`** (unit) is a free-text enum, mixed-case, not normalised: `call` 1383 · `1M tokens` 1035 · `second` 121 · `Call` 69 · `free` 62 · `1M characters` 40 · `image` 36 · `1M Tokens` 21 · `Point` 18 · `1000 characters` 17 · `min` 16 · `sec` 9 · `MP (megapixel)` 6 · `1 Credits` 6 · `page` 6 · `Pay-As-You-Go` 6 · `Credits`/`credits` 9 · `s`/`S`/`Second` 13 · `picture` 4 · `point` 4 · `minute` 2 · `Page` 2 · `积分` 1 · `URL` 1 · plus junk (`[object Object]` 11, three rows where the suffix is a doc URL, 3 empty).
- **Shape A — token models** (`suffix` matches `/token|character/`): `input_price`/`output_price` > 0; card shows `Input: $X/1M tokens · Output: $Y/1M tokens`; multi-row = effort tiers (`gpt-5-codex-low/medium/high/gpt-5-codex`, all 1.25/10, `context_length` 400000) → card prints the min with `starting from`.
- **Shape B — everything else**: `input_price = output_price = 0`, the price is the **string** `special_pricing` (`$0.06/s`, `$0.075/second`, `$0.028/image`, `$0.01/piece`, `$52.5/1M characters`, `$0.3/1000 characters`, `$0.015/min`, `$0.03/MP (megapixel)`, `$0.15=1Credits`, `$0.005/ point`, `Free`, `Depends on the specific model used`, `Charges are based on the usage model.`), and `description` is the tier label (`480P` / `720P` / `1080P`, `Fetch Task Results`). Card prints `Pricing: <number> /<unit> starting from`.
- `context_length` int tokens (0 for non-LLM); `is_multimodal` bool; `file_support_type ∈ 0/1/2`; cache prices only on 302-served OpenAI/Anthropic/Gemini rows.

### 3.4 Banner — `{id,title,image_url,link_url,description,position:"api"|"tool",status:1,sort_order,target_type:"_self"|"_blank",created_on,modified_on}`.

## 4. UX patterns worth copying / avoiding

**Copy**

- One URL grammar for the whole shelf: `cate → tag → brand → keyword`, every level a plain `<a href>` (SEO + right-click-open works), breadcrumb on detail reverses it.
- The category tree is fetched once (`category:home`) and reused for the home column, the hover flyout **and** the list-page mega-panel — the same JSON drives three renderings. Brand cards carry a one-liner `description` + `logo`, which makes the flyout feel like a catalogue rather than a link list.
- Card discipline: the model id is the title; description is 2-line clamped with the full text in `title`; chips = `[type] [tag] [capabilities]`; price block has a fixed `min-h` so cards align whether they show Input/Output or a single `Pricing:` line; actions live in a hover overlay so the card face stays quiet.
- `starting from` suffix + min price when a SKU has multiple tiers — cheap, honest, no popover needed.
- Detail page: hero facts + sticky anchor nav (`Overview · Playground · Analytics · Reference · Pricing · Recommended`); the API Reference table (`Description · Endpoint · Method · Stability · Params`) is the fastest way to show "what can I call".
- Pricing table with `Official Price · 302.AI Price · Official Price Gap` and a currency quick-switch inline — the value proposition is in the table, not in copy.
- `Popular` = curated `is_hot`, `Latest` = `created_time desc`, `Recommended` = `random` — three tabs, one endpoint param.

**Avoid**

- Infinite scroll with no count, no pager and no URL state; a 678-item tag is un-scannable and un-linkable past page 1. Ship a pager (or at least "Showing 20 of 678").
- `pageSize` capped at 20 and `page` ignored by SSR — deep pages are client-only, so they are neither crawlable nor shareable.
- Free-text unit (`suffix`) and free-text price (`special_pricing`) — 38 distinct unit spellings, `[object Object]` leaks, doc URLs in the unit slot. Model units as an enum (`per_1m_tokens · per_call · per_second · per_image · per_1m_chars · per_minute · per_megapixel · per_credit · per_page · free · pass_through`) with numeric amounts.
- Brand as a label string: `Minimax`/`MiniMax`, `Google`/`Gemini`, `Kling可灵`/`可灵`, trailing-whitespace brands. Brand must be an entity with an id and a display name.
- Aggregator brands (SiliconFlow, PPIO, SophNet, WaveSpeed) mixed into the vendor list → the same model shows 2–3 times with different prices. Separate *vendor* from *provider/route*.
- `is_hot`/"new" have no on-card marker; capability icons are unlabeled (no tooltip text found).
- Hidden batch-select checkbox and hidden detail `<a>` inside every card (leftovers from the dashboard variant of the same component).
- Right-hand home panel renders as an empty skeleton when logged in.

## 5. Screenshots

All under `.trellis/tasks/09-08-router-302-parity/research/shots/`:

- `302-home-api.png` — `/?product_type=api` (category column, banner, `Latest·Popular·Recommended` shelf).
- `302-home-api-flyout-llm.png` — LLM row hovered: brand-card flyout (name + logo + description, 4-col).
- `302-home-tool.png` — `/?product_type=tool` (9 app tags, app banners, app cards).
- `302-list-api.png` — `/product/list?cate=api` top (taxonomy mega-panel, `API|App` toggle).
- `302-list-api-bottom.png` — same page scrolled: card price shapes (`Input/Output`, `Pricing: $6 /1M tokens starting from`, `$0.075 /image`, `$0.0858 /Second starting from`), infinite-scroll spinner, footer.
- `302-list-tool.png` — `/product/list?cate=tool` (full app taxonomy, `Robots` tab, `Date ⇅ Price ⇅` sort, grid/list toggle).
- `302-detail-gpt-6-astra.png` — `/product/detail/openai-gpt-6-astra` hero + anchor nav.

## 6. Open questions

1. `/api/cache/product-detail` exists but the query key is unknown (`alias`, `id` both fail with `商品 undefined 未找到`); `/products/openapi/{product_id}` suggests an OpenAPI spec per SKU (`product-detail-openapi` was null for gpt-6-astra) — worth probing for a SKU with a spec.
2. `type=random` vs the `Recommended` tab — is it seeded per user (`/products/feature` / `specialty_products` exist in the route table but were not observed being called)?
3. What `file_support_type` 0/1/2 and `rate` < 1 (0.3/0.7/0.8) mean commercially (promo discount? cache?).
4. `Production Environment` / `CN Forward` tabs on detail: which host does CN Forward resolve to (`api.302ai.cn` appears in the bundle) and is the price identical?
5. `/model-leaderboard` (linked from the pill nav) was not explored — out of the shelf scope, but likely the source of the "Model Leaderboard" footer link.
6. Logged-out home right panel (login card) and the black description tooltip were not re-captured in this pass (owner session is logged in); the prior study covers them.
7. 48 stray `*.txt` files (help-center page names) were found in the scratchpad `pages/` dir from an earlier run — not part of this dump, ignored.

## 7. Full category → brand → SKU list

Generated from the 1,608-product dump (`lang=en`, `type=new`). Format: `` `name` `` [🔥 = `is_hot`] — price (`$in/$out per unit` for token models; `special_pricing` string otherwise; `(+N more rows)` when `price_info` has tiers). Brand order and counts follow the site's chips; 4 SKUs that do not match any chip because of whitespace/brand drift are listed at the end.

## API (`cate=api`)

### LLM — 678 SKUs · 33 brands

**OpenAI** (80): `gpt-6-astra` — $10/$50 per 1M tokens; `gpt-5.1-codex-mini` — $0.25/$2 per 1M tokens; `gpt-5.1-chat-latest` — $1.25/$10 per 1M tokens; `gpt-5.1-codex` — $1.25/$10 per 1M tokens; `gpt-5.1-2025-11-13` — $1.25/$10 per 1M tokens; `gpt-5.1` — $1.25/$10 per 1M tokens; `gpt-5.1-thinking-plus` — $1.25/$10 per 1M tokens; `gpt-5.1-plus` — $1.25/$10 per 1M tokens; `gpt-5-pro-2025-10-06` 🔥 — $15/$120 per 1M tokens; `gpt-5-pro` 🔥 — $15/$120 per 1M tokens; `gpt-5-codex` 🔥 — $1.25/$10 per 1M tokens (+3 more rows); `gpt-5.6-luna-pro` — $0.2/$1.2 per 1M tokens; `gpt-5.6-luna` — $0.2/$1.2 per 1M tokens; `gpt-5.6-terra-pro` — $2/$12 per 1M tokens; `gpt-5.6-terra` — $2/$12 per 1M tokens; `gpt-5.6-sol-pro` — $5/$30 per 1M tokens; `gpt-5.6-sol` — $5/$30 per 1M tokens; `gpt-5-chat-latest` — $1.25/$10 per 1M tokens; `gpt-5-nano-2025-08-07` — $0.05/$0.4 per 1M tokens; `gpt-5-nano` — $0.05/$0.4 per 1M tokens; `gpt-5-mini-2025-08-07` — $0.25/$2 per 1M tokens; `gpt-5-mini` 🔥 — $0.25/$2 per 1M tokens; `gpt-5-2025-08-07` — $1.25/$10 per 1M tokens; `gpt-5` 🔥 — $1.25/$10 per 1M tokens; `gpt-oss-20b` — $0.1/$0.5 per 1M tokens; `gpt-oss-120b` — $0.2/$1 per 1M tokens; `chat-latest` — $5/$30 per 1M tokens; `gpt-5.5` — $5/$30 per 1M tokens (+1 more rows); `o4-mini-deep-research-2025-06-26` — $2/$8 per 1M tokens; `o4-mini-deep-research` — $2/$8 per 1M tokens; `o3-deep-research-2025-06-26` — $10/$40 per 1M tokens; `o3-deep-research` — $10/$40 per 1M tokens; `o3-pro-2025-06-10` — $20/$80 per 1M tokens; `o3-pro` — $20/$80 per 1M tokens; `gpt-5.4-nano-2026-03-17` 🔥 — $0.2/$1.25 per 1M tokens; `gpt-5.4-nano` 🔥 — $0.2/$1.25 per 1M tokens; `gpt-5.4-mini-2026-03-17` 🔥 — $0.75/$4.5 per 1M tokens; `gpt-5.4-mini` 🔥 — $0.75/$4.5 per 1M tokens; `gpt-4o-mini-search-preview` — $0.15/$0.6 per 1M tokens; `gpt-4o-search-preview` — $2.5/$10 per 1M tokens; `o3-2025-04-16` — $2/$8 per 1M tokens; `o4-mini-2025-04-16` — $1.1/$4.4 per 1M tokens; `o4-mini` — $1.1/$4.4 per 1M tokens; `o3` — $2/$8 per 1M tokens; `gpt-4.1-nano-2025-04-14` — $0.1/$0.4 per 1M tokens; `gpt-4.1-nano` — $0.1/$0.4 per 1M tokens; `gpt-4.1-mini-2025-04-14` — $0.4/$1.6 per 1M tokens; `gpt-4.1-mini` — $0.4/$1.6 per 1M tokens; `gpt-4.1-2025-04-14` — $2/$8 per 1M tokens; `gpt-4.1` 🔥 — $2/$8 per 1M tokens; `gpt-4o-image-generation` — $0.03/call; `gpt-5.4-pro-2026-03-05` — $30/$180 per 1M tokens (+1 more rows); `gpt-5.4-2026-03-05` — $2.5/$15 per 1M tokens (+1 more rows); `gpt-5.4-pro` — $30/$180 per 1M tokens (+1 more rows); `gpt-5.4` — $2.5/$15 per 1M tokens (+1 more rows); `gpt-5.3-chat-latest` — $1.75/$14 per 1M tokens; `gpt-5.3-codex` — $1.75/$14 per 1M tokens; `o3-mini-2025-01-31` — $1.1/$4.4 per 1M tokens; `o3-mini` — $1.1/$4.4 per 1M tokens; `o1-2024-12-17` — $15/$60 per 1M tokens; `o1` — $15/$60 per 1M tokens; `o1-plus` — $0.1/call; `gpt-4o-plus` — $5/$15 per 1M tokens; `gpt-4o-2024-11-20` — $2.5/$10 per 1M tokens; `chatgpt-4o-latest` — $5/$15 per 1M tokens; `gpt-4o-2024-08-06` — $2.5/$10 per 1M tokens; `gpt-4o-mini-2024-07-18` — $0.15/$0.6 per 1M tokens; `gpt-4o-mini` 🔥 — $0.15/$0.6 per 1M tokens; `gpt-4-plus` — $30/$60 per 1M tokens; `gpt-4o-2024-05-13` — $5/$15 per 1M tokens; `gpt-4o` 🔥 — $2.5/$10 per 1M tokens; `gpt-4-turbo-2024-04-09` — $10/$30 per 1M tokens; `gpt-4-turbo` — $10/$30 per 1M tokens; `gpt-3.5-turbo-0125` — $0.5/$1.5 per 1M tokens; `gpt-4` — $30/$60 per 1M tokens; `gpt-5.2-codex` — $1.75/$14 per 1M tokens; `gpt-5.2` — $1.75/$14 per 1M tokens; `gpt-5.2-2025-12-11` — $1.75/$14 per 1M tokens; `gpt-5.2-chat-latest` — $1.75/$14 per 1M tokens; `gpt-5.2-pro` — $21/$168 per 1M tokens

**Anthropic** (25): `claude-opus-5-thinking` 🔥 — $5/$25 per 1M tokens; `claude-opus-5` 🔥 — $5/$25 per 1M tokens; `claude-opus-4-5-20251101` — $5/$25 per 1M tokens; `claude-haiku-4-5-20251001` — $1/$5 per 1M tokens; `claude-sonnet-4-5-20250929-thinking` — $3/$15 per 1M tokens (+1 more rows); `claude-sonnet-4-5-20250929` 🔥 — $3/$15 per 1M tokens (+1 more rows); `claude-sonnet-5` 🔥 — $2/$10 per 1M tokens; `claude-fable-5` 🔥 — $10/$50 per 1M tokens; `claude-opus-4-1-20250805-thinking` 🔥 — $15/$75 per 1M tokens; `claude-opus-4-1-20250805` 🔥 — $15/$75 per 1M tokens; `claude-opus-4-8` 🔥 — $5/$25 per 1M tokens; `claude-opus-4-7` 🔥 — $5/$25 per 1M tokens (+1 more rows); `claude-opus-4-20250514-thinking` — $15/$75 per 1M tokens; `claude-sonnet-4-20250514-thinking` — $3/$15 per 1M tokens; `claude-opus-4-20250514` — $15/$75 per 1M tokens; `claude-sonnet-4-20250514` 🔥 — $3/$15 per 1M tokens; `claude-sonnet-4-6-thinking` 🔥 — $3/$15 per 1M tokens (+1 more rows); `claude-sonnet-4-6` 🔥 — $3/$15 per 1M tokens (+1 more rows); `claude-3-5-haiku-20241022（Claude Code）` 🔥 — $0.8/$4 per 1M tokens; `claude-3-5-haiku` — $0.8/$4 per 1M tokens; `claude-3-5-haiku-latest` — $0.8/$4 per 1M tokens; `claude-3-5-haiku-20241022` — $0.8/$4 per 1M tokens (+1 more rows); `claude-opus-4-6-thinking` — $5/$25 per 1M tokens (+1 more rows); `claude-opus-4-6` — $5/$25 per 1M tokens (+1 more rows); `claude-3-haiku-20240307` — $0.25/$1.25 per 1M tokens

**Gemini** (24): `gemini-3.8-flash` 🔥 — $0.75/$3.75 per 1M tokens; `gemini-3.7-flash` 🔥 — $0.75/$3.75 per 1M tokens; `gemini-3-pro-preview` 🔥 — $2/$12 per 1M tokens (+1 more rows); `gemini-2.5-flash-lite-preview-09-2025` — $0.1/$0.4 per 1M tokens; `gemini-2.5-flash-preview-09-2025` 🔥 — $0.3/$2.5 per 1M tokens; `gemini-3.6-flash` 🔥 — $1.5/$7.5 per 1M tokens; `gemini-3.5-flash-lite` 🔥 — $0.3/$2.5 per 1M tokens; `gemini-2.5-flash-lite` — $0.1/$0.4 per 1M tokens; `gemini-3.1-flash-lite` — $0.25/$1.5 per 1M tokens; `gemini-3.5-flash` 🔥 — $1.5/$9 per 1M tokens; `gemini-2.5-flash-nothink` — $0.3/$2.5 per 1M tokens; `gemini-2.5-flash` 🔥 — $0.3/$2.5 per 1M tokens; `gemini-2.5-pro` 🔥 — $1.25/$10 per 1M tokens (+1 more rows); `gemini-2.0-flash-lite` — $0.075/$0.3 per 1M tokens; `gemini-2.5-flash-search` — $0.3/$2.5 per 1M tokens; `gemini-2.5-pro-deepsearch` — $5/$35 per 1M tokens; `gemini-2.5-flash-deepsearch` — $5/$25 per 1M tokens; `gemini-2.5-pro-search` — $1.25/$10 per 1M tokens; `gemini-3.1-flash-lite-preview` — $0.25/$1.5 per 1M tokens; `gemini-3.1-pro-preview` 🔥 — $2/$12 per 1M tokens (+1 more rows); `gemini-2.0-flash-search` — $0.2/$0.6 per 1M tokens; `gemini-2.0-flash` — $0.1/$0.4 per 1M tokens; `gemini-2.0-flash-exp-search` — $0.2/$0.6 per 1M tokens; `gemini-3-flash-preview` 🔥 — $0.5/$3 per 1M tokens

**Grok** (15): `grok-4.6` — $2/$6 per 1M tokens; `grok-4-1-fast-non-reasoning` — $0.2/$0.5 per 1M tokens; `grok-4-1-fast-reasoning` — $0.2/$0.5 per 1M tokens; `grok-4-fast-non-reasoning` — $0.2/$0.5 per 1M tokens; `grok-4-fast-reasoning` — $0.2/$0.5 per 1M tokens; `grok-4.5` — $2/$6 per 1M tokens; `grok-code-fast-1` — $0.2/$1.5 per 1M tokens; `grok-4.3` — $1.25/$2.5 per 1M tokens; `grok-4-0709` — $3/$15 per 1M tokens; `grok-4.20-multi-agent-beta-0309` — $2/$6 per 1M tokens; `grok-4.20-beta-0309-non-reasoning` — $2/$6 per 1M tokens; `grok-3-mini` — $0.3/$0.5 per 1M tokens; `grok-4.20-beta-0309-reasoning` — $2/$6 per 1M tokens; `grok-3` — $3/$15 per 1M tokens; `grok-2-vision-1212` — $2/$10 per 1M tokens

**Tongyi Qianwen** (117): `qwen3-max` — $0.46/$1.83 per 1M tokens (+2 more rows); `qwen3-vl-235b-a22b-thinking` — $0.286/$2.86 per 1M tokens; `qwen3-max-2025-09-23` — $0.86/$3.43 per 1M tokens (+2 more rows); `qwen3-next-80b-a3b-instruct` — $0.143/$0.5715 per 1M tokens; `qwen-vl-plus-2025-08-15` — $0.12/$0.3 per 1M tokens; `qwen-vl-plus-latest` — $0.12/$0.3 per 1M tokens; `qwen-vl-max-latest` — $0.23/$0.572 per 1M tokens; `qwen3-coder-30b-a3b-instruct` — $0.22/$0.86 per 1M tokens (+2 more rows); `qwen3-235b-a22b-instruct-2507` — $0.29/$1.143 per 1M tokens; `qwen3-30b-a3b-thinking-2507` — $0.11/$1.1 per 1M tokens; `qwen3-235b-a22b-thinking-2507` — $0.286/$2.86 per 1M tokens; `qwen3-30b-a3b-instruct-2507` — $0.11/$0.43 per 1M tokens; `qwen-flash-2025-07-28` — $0.022/$0.22 per 1M tokens (+2 more rows); `qwen-flash` — $0.022/$0.22 per 1M tokens (+2 more rows); `qwen3-coder-flash-2025-07-28` — $0.143/$0.58 per 1M tokens (+3 more rows); `qwen3-coder-flash` — $0.143/$0.58 per 1M tokens (+3 more rows); `qwen-doc-turbo` — $0.086/$0.143 per 1M tokens; `qwen3-coder-480b-a35b-instruct` — $0.86/$3.43 per 1M tokens (+2 more rows); `qwen3-coder-plus-2025-07-22` — $0.572/$2.29 per 1M tokens (+3 more rows); `qwen-mt-turbo` — $0.1/$0.279 per 1M tokens; `qwen-mt-plus` — $0.2572/$0.772 per 1M tokens; `qwen3-coder-plus` — $0.572/$2.29 per 1M tokens (+3 more rows); `qwen-turbo-latest` — $0.05/$0.43 per 1M tokens; `qvq-plus-latest` — $0.29/$0.72 per 1M tokens; `qvq-plus-2025-05-15` — $0.29/$0.72 per 1M tokens; `qvq-plus` — $0.29/$0.72 per 1M tokens; `qvq-max-2025-05-15` — $1.15/$4.58 per 1M tokens; `qvq-max-latest` — $1.15/$4.58 per 1M tokens; `qwen-vl-plus-2025-05-07` — $0.22/$0.65 per 1M tokens; `qwen3-0.6b` — $0.05/$0.5 per 1M tokens; `qwen3-1.7b` — $0.05/$0.5 per 1M tokens; `qwen3-4b` — $0.05/$0.5 per 1M tokens; `qwen3-8b` — $0.072/$0.72 per 1M tokens; `qwen3-14b` — $0.143/$1.43 per 1M tokens; `qwen3-30b-a3b` — $0.11/$1.08 per 1M tokens; `qwen3-32b` — $0.29/$2.86 per 1M tokens; `qwen3-235b-a22b` — $0.29/$2.86 per 1M tokens; `qwen-vl-max-2025-04-08` — $0.43/$1.29 per 1M tokens; `qwen-vl-max-2025-04-02` — $0.43/$1.29 per 1M tokens; `qwen2.5-omni-7b` — $2.3/$6.9 per 1M tokens; `qvq-max-2025-03-25` — $1.15/$4.58 per 1M tokens; `qvq-max` — $1.15/$4.58 per 1M tokens; `qwen2.5-vl-32b-instruct` — $1.2/$3.5 per 1M tokens; `qwen3.5-122b-a10b` — $0.12/$0.92 per 1M tokens (+1 more rows); `qwen3.5-27b` — $0.09/$0.69 per 1M tokens (+1 more rows); `qwen3.5-35b-a3b` — $0.06/$0.46 per 1M tokens (+1 more rows); `qwen3.5-flash` — $0.03/$0.29 per 1M tokens (+2 more rows); `qwen3.5-397b-a17b` — $0.171/$1.03 per 1M tokens (+1 more rows); `qwen3.5-plus` — $0.12/$0.69 per 1M tokens (+2 more rows); `qwq-32b` — $0.29/$0.86 per 1M tokens; `qwq-plus-2025-03-05` — $0.23/$0.58 per 1M tokens; `qwq-plus-latest` — $0.23/$0.58 per 1M tokens; `qwq-plus` — $0.23/$0.58 per 1M tokens; `qwen-omni-turbo` — $2.3/$6.9 per 1M tokens; `qwen2.5-vl-3b-instruct` — $0.2/$0.6 per 1M tokens; `qwen2.5-vl-7b-instruct` — $0.3/$0.8 per 1M tokens; `qwen2.5-vl-72b-instruct` — $2.3/$6.9 per 1M tokens; `qwen-vl-max-2025-01-25` — $0.43/$1.29 per 1M tokens; `qwen-long` — $0.072/$0.286 per 1M tokens; `qwen-vl-max-2024-12-30` — $0.43/$1.29 per 1M tokens; `QVQ-72B-Preview` — $1.72/$5.143 per 1M tokens; `qwen-plus-2024-12-20` — $0.12/$0.286 per 1M tokens; `tongyi-intent-detect-v3` — $0.0572/$0.143 per 1M tokens; `qwen-plus-2024-11-27` — $0.12/$0.286 per 1M tokens; `qwq-32b-preview` — $0.29/$0.86 per 1M tokens; `qwen-plus-2024-11-25` — $0.12/$0.286 per 1M tokens; `qwen-vl-max-2024-11-19` — $0.43/$1.29 per 1M tokens; `qwen-coder-plus-2024-11-06` — $0.5/$1 per 1M tokens; `qwen-coder-plus-latest` — $0.5/$1 per 1M tokens; `qwen-coder-plus` — $0.5/$1 per 1M tokens; `qwen-turbo-2024-11-01` — $0.05/$0.09 per 1M tokens; `qwen-vl-max-2024-10-30` — $2.86/$2.86 per 1M tokens; `qwen-vl-ocr` — $0.72/$0.72 per 1M tokens; `qwen-turbo-2024-09-19` — $0.05/$0.09 per 1M tokens; `qwen-turbo` — $0.05/$0.43 per 1M tokens; `qwen-math-turbo` — $0.29/$0.86 per 1M tokens; `qwen2.5-math-1.5b-instruct` — $0.143/$0.286 per 1M tokens; `qwen2.5-math-7b-instruct` — $0.143/$0.286 per 1M tokens; `qwen-max-2024-09-19` — $2.86/$8.86 per 1M tokens; `qwen-plus-2024-09-19` — $0.12/$0.286 per 1M tokens; `qwen2.5-coder-0.5b-instruct` — Limited-time free; `qwen2.5-coder-1.5b-instruct` — Limited-time free; `qwen2.5-coder-3b-instruct` — Limited-time free; `qwen2.5-coder-14b-instruct` — $0.286/$0.86 per 1M tokens; `qwen-coder-turbo-2024-09-19` — $0.286/$0.86 per 1M tokens; `qwen-coder-turbo-latest` — $0.286/$0.86 per 1M tokens; `qwen-coder-turbo` — $0.286/$0.86 per 1M tokens; `qwen2.5-3b-instruct` — $0.05/$0.13 per 1M tokens; `qwen2.5-14b-instruct` — $0.143/$0.43 per 1M tokens; `qwen2.5-32b-instruct` — $0.29/$0.86 per 1M tokens; `qwen2.5-math-72b-instruct` — $0.572/$1.72 per 1M tokens; `qwen2.5-coder-32b-instruct` — $0.29/$0.86 per 1M tokens; `qwen2.5-coder-7b-instruct` — $0.143/$0.29 per 1M tokens; `qwen2.5-72b-instruct` — $0.58/$1.72 per 1M tokens; `qwen-math-plus` — $0.572/$1.72 per 1M tokens; `qwen2.5-7b-instruct` — $0.072/$0.143 per 1M tokens; `qwen2-vl-72b-instruct` — $2.29/$6.86 per 1M tokens; `qwen2-vl-2b-instruct` — Limited-time free; `qwen-vl-max-2024-08-09` — $2.86/$2.86 per 1M tokens; `qwen-vl-plus-2024-08-09` — $0.22/$0.65 per 1M tokens; `qwen-plus-2024-08-06` — $0.572/$1.72 per 1M tokens; `farui-plus` — $2.9/$2.9 per 1M tokens; `qwen-plus-2024-07-23` — $0.572/$1.72 per 1M tokens; `qwen-plus-latest` — $0.12/$1.2 per 1M tokens (+2 more rows); `qwen-max` — $0.343/$1.372 per 1M tokens; `qwen-plus` — $0.12/$1.2 per 1M tokens (+2 more rows); `qwen3-max-2026-01-23` — $0.36/$1.43 per 1M tokens (+2 more rows); `qwen-turbo-2024-06-24` — $0.29/$0.86 per 1M tokens; `qwen2-57b-a14b-instruct` — $0.5/$1 per 1M tokens; `qwen2-1.5b-instruct` — Limited-time free; `qwen2-0.5b-instruct` — Limited-time free; `qwen2-72b-instruct` — $0.58/$1.72 per 1M tokens; `qwen-max-2024-04-28` — $5.72/$17.143 per 1M tokens; `qwen-max-2024-04-03` — $5.72/$17.143 per 1M tokens; `qwen2-7b-instruct` — $0.143/$0.29 per 1M tokens; `qwen-vl-plus` — $0.12/$0.286 per 1M tokens; `qwen-vl-max` — $0.23/$0.58 per 1M tokens

**Qwen** (42): `qwen3.8-flash` — $0.15/$0.47 per 1M tokens; `qwen3.8-max` — $2/$6 per 1M tokens; `qwen-plus-2025-12-01` — $0.12/$1.2 per 1M tokens (+2 more rows); `qwen-mt-lite` — $0.086/$0.23 per 1M tokens; `qwen-mt-flash` — $0.1/$0.28 per 1M tokens; `qwen3-vl-32b-instruct` — $0.29/$1.143 per 1M tokens; `qwen3-vl-32b-thinking` — $0.29/$2.86 per 1M tokens; `qwen3-vl-flash-2025-10-15` — $0.022/$0.22 per 1M tokens (+2 more rows); `qwen3-vl-flash` — $0.022/$0.22 per 1M tokens (+2 more rows); `qwen3-vl-30b-a3b-thinking` — $0.11/$1.1 per 1M tokens; `qwen3-vl-30b-a3b-instruct` — $0.11/$0.43 per 1M tokens; `qwen3-vl-plus` — $0.143/$1.43 per 1M tokens (+2 more rows); `qwen3-vl-plus-2025-09-23` — $0.143/$1.43 per 1M tokens (+2 more rows); `qwen3-vl-235b-a22b-instruct ` — $0.286/$1.143 per 1M tokens; `qwen3-coder-plus-2025-09-23` — $0.572/$2.29 per 1M tokens (+3 more rows); `qwen-plus-2025-09-11` — $0.12/$1.2 per 1M tokens (+2 more rows); `qwen3.7-plus` — $0.285/$1.15 per 1M tokens (+1 more rows); `qwen3-max-preview` — $0.86/$3.43 per 1M tokens (+2 more rows); `qwen-vl-max-2025-08-13` — $0.23/$0.58 per 1M tokens; `qwen-plus-2025-07-28` — $0.12/$1.2 per 1M tokens (+2 more rows); `qwen3.7-max` — $2.5/$7.5 per 1M tokens; `qwen3.6-flash` — $0.17/$1.03 per 1M tokens (+1 more rows); `qwen3.6-35b-a3b` — $0.26/$1.55 per 1M tokens; `qwen-turbo-2025-07-15` — $0.05/$0.43 per 1M tokens; `qwen-plus-2025-07-14` — $0.12/$1.2 per 1M tokens; `qwen-vl-plus-2025-07-10` — $0.022/$0.22 per 1M tokens; `qwen3.6-plus` — $0.3/$1.8 per 1M tokens (+1 more rows); `qwen-turbo-2025-04-28` — $0.05/$0.43 per 1M tokens; `qwen-plus-2025-04-28` — $0.12/$1.2 per 1M tokens; `qwen-plus-character` — $0.12/$0.286 per 1M tokens; `qwen-turbo-2025-02-11` — $0.05/$0.09 per 1M tokens; `qwen2.5-7b-instruct-1m` — $0.072/$0.143 per 1M tokens; `qwen2.5-14b-instruct-1m` — $0.143/$0.43 per 1M tokens; `qwen-vl-plus-2025-01-25` — $0.22/$0.65 per 1M tokens; `qwen-long-2025-01-25` — $0.072/$0.286 per 1M tokens; `qwen-long-latest` — $0.072/$0.286 per 1M tokens; `qwen-max-2025-01-25` — $0.343/$1.372 per 1M tokens; `qwen-max-latest` — $0.343/$1.372 per 1M tokens; `qwen-plus-2025-01-25` — $0.12/$0.286 per 1M tokens; `qwen-plus-2025-01-12` — $0.12/$0.286 per 1M tokens; `qwen-vl-plus-2025-01-02` — $0.22/$0.65 per 1M tokens; `qwen3-vl-plus-2025-12-19` — $0.143/$1.43 per 1M tokens (+2 more rows)

**ZHIPU** (36): `glm-5.3-flash` — $0.075/$0.25 per 1M tokens; `glm-5.3` — $1.4/$4.4 per 1M tokens; `glm-4.6v-flash` — Free; `glm-4.6v` — $0.145/$0.43 per 1M tokens (+1 more rows); `glm-for-coding` — $0.286/$1.142 per 1M tokens (+2 more rows); `glm-4.6` — $0.286/$1.142 per 1M tokens (+2 more rows); `glm-5.2` — $1.4/$4.4 per 1M tokens; `glm-4.5v` — $0.29/$0.86 per 1M tokens (+1 more rows); `glm-4.5-flash` — 1M tokens; `glm-4.5-airx` — $0.572/$1.714 per 1M tokens (+2 more rows); `glm-4.5-air` — $0.1143/$0.286 per 1M tokens (+2 more rows); `glm-4.5-x` — $1.143/$2.29 per 1M tokens (+2 more rows); `glm-4.5` — $0.286/$1.143 per 1M tokens (+2 more rows); `glm-5.1` — $1.4/$4.4 per 1M tokens; `glm-5v-turbo` — $0.72/$3.2 per 1M tokens (+1 more rows); `glm-5-turbo` — $0.72/$3.2 per 1M tokens (+1 more rows); `glm-4.1v-thinking-flashx` — $0.3/$0.3 per 1M tokens; `glm-4.1v-thinking-flash` — 1M tokens; `glm-4-flash-250414` — $0.0014/$0.0014 per 1M tokens; `glm-4-air-250414` — $0.07/$0.07 per 1M tokens; `glm-z1-flash` — 1M tokens; `glm-z1-airx` — $0.7/$0.7 per 1M tokens; `glm-z1-air` — $0.07/$0.07 per 1M tokens; `glm-4-airx` — $1.4/$1.4 per 1M tokens; `glm-4-air` — $0.07/$0.07 per 1M tokens; `glm-zero-preview` — $1.5/$1.5 per 1M tokens; `glm-5` — $0.6/$2.6 per 1M tokens (+1 more rows); `glm-4v-plus` — $1.4/$1.4 per 1M tokens; `glm-4-plus` — $7/$7 per 1M tokens; `glm-4-flash` — $0.014/$0.014 per 1M tokens; `glm-4-long` — $0.14/$0.14 per 1M tokens; `codegeex-4` — $0.014/$0.014 per 1M tokens; `glm-4v` — $7/$7 per 1M tokens; `glm-4-0520` — $14/$14 per 1M tokens; `glm-4.7-flashx` — $0.0715/$0.429 per 1M tokens; `glm-4.7` — $0.286/$1.142 per 1M tokens (+2 more rows)

**Moonshot** (14): `kimi-for-coding` — $1.143/$4.57 per 1M tokens; `kimi-k2-thinking-turbo` — $1.15/$8.29 per 1M tokens; `kimi-k2-thinking` — $0.575/$2.3 per 1M tokens; `kimi-k3` — $3/$15 per 1M tokens; `kimi-k2.7-code` — $0.95/$4 per 1M tokens; `kimi-k2-0905-preview` — $0.5714/$2.286 per 1M tokens; `kimi-k2-250711` — $0.575/$2.3 per 1M tokens; `kimi-k2-turbo-preview` — $1.143/$8.29 per 1M tokens; `kimi-k2.6` — $0.95/$4 per 1M tokens; `kimi-k2-0711-preview` — $0.575/$2.3 per 1M tokens; `kimi-latest` — $0.286/$1.43 per 1M tokens (+2 more rows); `moonshot-v1-8k-vision-preview` — $1.9/$1.9 per 1M tokens; `kimi-k2.5` — $0.57/$3 per 1M tokens; `moonshot-v1-8k` — $1.9/$1.9 per 1M tokens

**Baidu** (10): `ernie-x1.1-preview` — $0.142/$0.57 per 1M tokens; `ernie-5.0-thinking-latest` — $0.86/$1.43 per 1M tokens (+1 more rows); `ernie-5.0-thinking-preview` — $0.86/$1.43 per 1M tokens (+1 more rows); `ernie-4.5-turbo-128k` — $0.12/$0.5 per 1M tokens; `ernie-4.5-turbo-vl-32k` — $0.45/$1.3 per 1M tokens; `ernie-x1-turbo-32k` — $0.15/$0.6 per 1M tokens; `ernie-4.5-8k-preview` — $0.6/$2.3 per 1M tokens; `ernie-4.0-turbo-8k` — $3/$8.6 per 1M tokens; `ernie-4.0-turbo-128k` — $3/$8.6 per 1M tokens; `ernie-4.0-8k` — $5/$13 per 1M tokens

**Deepseek** (24): `deepseek-v4-flash-vision-exp` — $0.22/$0.66 per 1M tokens (+1 more rows); `deepseek-v4-pro` — $0.66/$1.98 per 1M tokens (+1 more rows); `deepseek-v4-flash` — $0.22/$0.66 per 1M tokens (+1 more rows); `deepseek-v3.2-thinking` — $0.29/$0.43 per 1M tokens (+1 more rows); `deepseek-v3.2` — $0.29/$0.43 per 1M tokens (+1 more rows); `deepseek-v3.2-exp` — $0.29/$0.43 per 1M tokens (+1 more rows); `deepseek-v3.2-exp-thinking` — $0.29/$0.43 per 1M tokens (+1 more rows); `deepseek-v3.1-huoshan` — $0.57/$1.71 per 1M tokens; `deepseek-v3.1-thinking` — $0.286/$1.15 per 1M tokens (+1 more rows); `deepseek-v3.1` — $0.286/$1.15 per 1M tokens (+1 more rows); `deepseek-r1-huoshan-0528` — $0.6/$2.3 per 1M tokens; `DeepSeek-R1-0528` — $0.6/$2.3 per 1M tokens; `deepseek-v3-0324` — $0.5/$1.2 per 1M tokens; `deepseek-v3-aliyun` — $0.3/$1.2 per 1M tokens; `deepseek-v3-baidu` — $0.3/$1.2 per 1M tokens; `deepseek-v3-huoshan` — $0.3/$1.2 per 1M tokens; `deepseek-r1-aliyun` — $0.6/$2.3 per 1M tokens; `deepseek-r1-baidu` — $0.6/$2.3 per 1M tokens; `deepseek-r1-huoshan` — $0.6/$2.3 per 1M tokens; `deepseek-vl2` — $0.15/$0.15 per 1M tokens; `deepseek-r1` — $0.6/$2.3 per 1M tokens; `deepseek-reasoner` — $0.6/$2.2 per 1M tokens (+1 more rows); `deepseek-v3` — $0.3/$1.2 per 1M tokens; `deepseek-chat` — $0.3/$1.2 per 1M tokens (+1 more rows)

**Doubao** (28): `doubao-seed-evolving` — $0.86/$4.3 per 1M tokens; `doubao-seed-code-preview-latest` — $0.1715/$1.1429 per 1M tokens (+2 more rows); `doubao-seed-code-preview-251028` — $0.1715/$1.1429 per 1M tokens (+2 more rows); `doubao-seed-1-6-vision-250815` — $0.1143/$0.1143 per 1M tokens (+2 more rows); `doubao-seed-2-1-turbo-260628` — $0.43/$2.14 per 1M tokens; `doubao-seed-2-1-pro-260628` — $0.86/$4.28 per 1M tokens; `doubao-1.5-vision-lite-250315` — $0.21/$0.64 per 1M tokens; `doubao-1.5-vision-pro-250328` — $0.43/$1.29 per 1M tokens; `doubao-seed-1-6-flash-250615` — $0.021/$0.21 per 1M tokens (+2 more rows); `doubao-seed-1-6-250615` — $0.11/$0.3 per 1M tokens (+3 more rows); `doubao-seed-1-6-thinking-250615` — $0.11/$1.1 per 1M tokens (+2 more rows); `doubao-1-5-thinking-vision-pro-250428` — $0.5/$1.3 per 1M tokens; `doubao-1.5-ui-tars-250328` — $0.5/$1.7 per 1M tokens; `doubao-1-5-thinking-pro-vision-250415` — $0.6/$2.3 per 1M tokens; `doubao-1-5-thinking-pro-250415` — $0.6/$2.3 per 1M tokens; `doubao-seed-2-0-code-preview-260215` — $0.46/$2.29 per 1M tokens (+2 more rows); `doubao-seed-2-0-mini-260215` — $0.0285/$0.285 per 1M tokens (+2 more rows); `Doubao-1.5-pro-256k` — $0.8/$1.3 per 1M tokens; `Doubao-1.5-lite-32k` — $0.05/$0.09 per 1M tokens; `Doubao-1.5-pro-32k` — $0.12/$0.29 per 1M tokens; `Doubao-1.5-vision-pro-32k` — $0.43/$1.3 per 1M tokens; `Doubao-Vision-Lite-32k` — $1.5/$1.5 per 1M tokens; `Doubao-vision-pro-32k` — $3/$3 per 1M tokens; `doubao-seed-2-0-lite-260215` — $0.86/$0.514 per 1M tokens (+2 more rows); `doubao-seed-2-0-pro-260215` — $0.46/$2.28 per 1M tokens (+2 more rows); `Doubao-pro-128k` — $0.8/$1.4 per 1M tokens; `Doubao-pro-32k` — $0.12/$0.31 per 1M tokens; `doubao-seed-1-8-251215` — $0.1143/$0.286 per 1M tokens (+3 more rows)

**Stepfun** (10): `step-3` — $0.2142/$0.5715 per 1M tokens (+2 more rows); `step-3.7-flash` — $0.2/$1.15 per 1M tokens; `step-r1-v-mini` — $2.2/$10 per 1M tokens; `step-1o-vision-32k` — $2.2/$10 per 1M tokens; `step-2-mini` — $0.143/$0.29 per 1M tokens; `step-2-16k-exp` — $5.5/$17 per 1M tokens; `step-3.5-flash` — $0.1/$0.3 per 1M tokens; `step-2-16k` — $5.5/$17 per 1M tokens; `step-1v-32k` — $2.15/$10 per 1M tokens; `step-1v-8k` — $0.72/$2.86 per 1M tokens

**Sense** (5): `SenseNova-V6-Reasoner` — $0.6/$2.3 per 1M tokens; `SenseNova-V6-Turbo` — $0.25/$0.65 per 1M tokens; `SenseNova-V6-Pro` — $0.5/$1.3 per 1M tokens; `SenseChat-Turbo` — $0.3/$0.7 per 1M tokens; `SenseChat-5` — $6/$14 per 1M tokens

**Minimax** (3): `abab7-chat-preview` — $1.4/$1.4 per 1M tokens; `M2-Her` — $0.3/$1.2 per 1M tokens; `abab6.5s-chat` — $0.14/$0.14 per 1M tokens

**MiniMax** (9): `MiniMax-M2` — $0.3/$1.2 per 1M tokens; `MiniMax-M3` — $0.6/$2.4 per 1M tokens (+1 more rows); `MiniMax-M1` — $0.12/$1.14 per 1M tokens; `MiniMax-M2.7-highspeed` — $0.6/$4.8 per 1M tokens; `MiniMax-M2.7` — $0.3/$1.2 per 1M tokens; `MiniMax-Text-01` — $0.14/$1.12 per 1M tokens; `MiniMax-M2.5-highspeed` — $0.6/$4.8 per 1M tokens; `MiniMax-M2.5` — $0.3/$1.2 per 1M tokens; `MiniMax-M2.1` — $0.3/$1.2 per 1M tokens (+1 more rows)

**Hunyuan** (13): `hunyuan-turbos-20250716` — $0.12/$0.3 per 1M tokens; `hunyuan-t1-20250711` — $0.15/$0.6 per 1M tokens; `hunyuan-t1-20250321` — $0.15/$0.6 per 1M tokens; `hunyuan-t1-latest` — $0.15/$0.6 per 1M tokens; `hunyuan-turbos-20250226` — $0.12/$0.3 per 1M tokens; `hunyuan-functioncall` — $0.57/$1.14 per 1M tokens; `hunyuan-role` — $0.57/$1.14 per 1M tokens; `hunyuan-standard-256K` — $2.2/$8.6 per 1M tokens; `hunyuan-vision` — $26/$26 per 1M tokens; `hunyuan-code` — $0.57/$1.14 per 1M tokens; `hunyuan-pro` — $4.3/$14.3 per 1M tokens; `hunyuan-standard` — $0.64/$0.72 per 1M tokens; `hunyuan-lite` — $0.1/$0.1 per 1M tokens

**Google** (1): `gemma-2-27b` — $0.18000000000000002/$0.18000000000000002 per 1M tokens

**Meta** (9): `llama-4-maverick` — $1/$1 per 1M tokens; `llama-4-scout` — $0.5/$0.5 per 1M tokens; `llama3.3-70b` — $0.9/$0.9 per 1M tokens; `marco-o1` — $0.2/$0.2 per 1M tokens; `llama3.2-11b` — $0.5/$0.5 per 1M tokens; `llama3.2-90b` — $2/$2 per 1M tokens; `llama3.1-8b` — $0.5/$0.5 per 1M tokens; `llama3.1-70b` — $1.5/$1.5 per 1M tokens; `llama3.1-405b` — $5/$5 per 1M tokens

**Mistral AI** (16): `devstral-medium-2507` — $0.4/$2 per 1M tokens; `devstral-small-2507` — $0.1/$0.3 per 1M tokens; `devstral-small-2505` — $0.1/$0.3 per 1M tokens; `mistral-medium-latest` — $0.4/$6 per 1M tokens; `mistral-small-2503` — $0.5/$0.5 per 1M tokens; `pixtral-large-latest` — $2/$6 per 1M tokens; `mistral-large-latest` — $2/$6 per 1M tokens; `mistral-small-latest` — $0.5/$0.5 per 1M tokens; `mistral-large-2411` — $2/$6 per 1M tokens; `pixtral-large-2411` — $2/$6 per 1M tokens; `mistral-large-2` — $5/$10 per 1M tokens; `devstral-2512` — $1/$3 per 1M tokens; `ministral-14b-2512` — $0.3/$0.3 per 1M tokens; `ministral-8b-2512` — $0.3/$0.3 per 1M tokens; `ministral-3b-2512` — $0.3/$0.3 per 1M tokens; `mistral-large-2512` — $1/$3 per 1M tokens

**Microsoft** (3): `MAI-DS-R1` — $0.6/$2.3 per 1M tokens; `Phi-4-reasoning` — $1/$2 per 1M tokens; `Phi-4-mini-reasoning` — $0.1/$0.5 per 1M tokens

**01.AI** (2): `yi-lightning` — $0.15/$0.15 per 1M tokens; `yi-vision-v2` — $0.86/$0.86 per 1M tokens

**Baichuan Al** (6): `Baichuan-M2-Plus` — $1.43/$4.29 per 1M tokens; `Baichuan-M2` — $0.29/$2.9 per 1M tokens; `Baichuan3-Turbo-128k` — $3.4/$3.4 per 1M tokens; `Baichuan4` — $14.3/$14.3 per 1M tokens; `Baichuan3-Turbo` — $1.7/$1.7 per 1M tokens; `Baichuan-M3` — $1.43/$4.29 per 1M tokens

**v0** (3): `v0-1.0-md` — $3/$15 per 1M tokens; `v0-1.5-lg` — $15/$75 per 1M tokens; `v0-1.5-md` — $3/$15 per 1M tokens

**Perplexity** (5): `sonar-deep-research` — $2/$8 per 1M tokens; `sonar-reasoning-pro` — $2/$8 per 1M tokens; `sonar-reasoning` — $1/$5 per 1M tokens; `sonar` — $1/$1 per 1M tokens; `sonar-pro` — $3/$15 per 1M tokens

**Expert Model** (4): `zzkj-genetics` — $22/$86 per 1M tokens; `zzkj-lite` — $3.5/$14 per 1M tokens; `zzkj-think` — $22/$86 per 1M tokens; `zzkj` — $17/$69 per 1M tokens

**PPIO** (44): `deepseek/deepseek-v3.2` — $0.286/$0.429 per 1M tokens; `moonshotai/kimi-k2-thinking` — $0.572/$2.286 per 1M tokens; `kat-coder` — $0.3/$1.2 per 1M tokens; `minimax/minimax-m2` — $0.3/$1.2 per 1M tokens; `qwen/qwen3-vl-8b-instruct` — $0.072/$0.286 per 1M tokens; `zai-org/glm-4.6` — $0.57/$2.286 per 1M tokens; `deepseek/deepseek-v3.2-exp` — $0.286/$0.4286 per 1M tokens; `qwen/qwen3-vl-235b-a22b-instruct` — $0.286/$1.143 per 1M tokens; `qwen/qwen3-vl-235b-a22b-thinking` — $0.286/$2.86 per 1M tokens; `deepseek/deepseek-v3.1-terminus` — $0.5715/$1.715 per 1M tokens; `baidu/ernie-4.5-21b-a3b-thinking` — $0.072/$0.286 per 1M tokens; `moonshotai/kimi-k2-0905` — $0.572/$2.286 per 1M tokens; `zai-org/glm-4.5v` — $0.643/$1.86 per 1M tokens; `deepseek/deepseek-v3.1` — $0.572/$1.72 per 1M tokens; `baidu/ernie-4.5-300b-a47b-paddle` — $0.28600000000000003/$1 per 1M tokens; `baidu/ernie-4.5-21B-a3b` — $0.0715/$0.286 per 1M tokens; `baidu/ernie-4.5-0.3b` — 1M tokens; `baidu/ernie-4-5-vl-424b-a47b` — $0.429/$1.29 per 1M tokens; `zai-org/glm-4.5` — $0.5720000000000001/$2.2880000000000003 per 1M tokens; `qwen/qwen3-coder-480b-a35b-instruct` — $2.14/$2.14 per 1M tokens; `moonshotai/kimi-k2-instruct` — $0.57/$2.29 per 1M tokens; `qwen/qwen3-4b-fp8` — 1M tokens; `qwen/qwen-2.5-72b-instruct` — $0.4/$0.4 per 1M tokens; `deepseek/deepseek-r1/community` — $0.6/$2 per 1M tokens; `deepseek/deepseek-v3/community` — $0.3/$1 per 1M tokens; `deepseek/deepseek-v3-turbo` — $0.3/$1.1 per 1M tokens; `deepseek/deepseek-r1-turbo` — $0.6/$2.3 per 1M tokens; `deepseek/deepseek-prover-v2-671b` — $0.6/$2.3 per 1M tokens; `qwen/qwen3-30b-a3b-fp8` — $0.1/$0.5 per 1M tokens; `qwen/qwen3-32b-fp8` — $0.1/$0.5 per 1M tokens; `qwen/qwen3-235b-a22b-fp8` — $0.2/$0.8 per 1M tokens; `deepseek/deepseek-v3-0324` — $0.3/$1.2 per 1M tokens; `deepseek/deepseek-r1-0528` — $0.6/$2.3 per 1M tokens; `qwen/qwen2.5-vl-72b-instruct` — $0.6/$0.6 per 1M tokens; `qwen/qwen3-coder-next` — $0.2/$1.5 per 1M tokens; `deepseek/deepseek-ocr-2` — $0.031/$0.031 per 1M tokens; `moonshotai/kimi-k2.5` — $0.572/$3 per 1M tokens; `zai-org/glm-4.7-flash` — $0.0715/$0.429 per 1M tokens; `minimax/minimax-m2.1` — $0.3/$1.2 per 1M tokens; `zai-org/glm-4.7` — $0.572/$2.286 per 1M tokens; `xiaomimimo/mimo-v2-flash` — $0.1/$0.3 per 1M tokens; `zai-org/autoglm-phone-9b-multilingual` — $0.036/$0.143 per 1M tokens; `baidu/ernie-4.5-vl-28b-a3b` — $0.143/$0.572 per 1M tokens; `zai-org/glm-4.6v` — $0.143/$0.429 per 1M tokens (+1 more rows)

**SophNet** (44): `sophnet/DeepSeek-V3.2-Fast` — $1.143/$3.429 per 1M tokens (+2 more rows); `sophnet/DeepSeek-V3.2` — $0.286/$0.429 per 1M tokens; `sophnet/kimi-k2-thinking` — $0.572/$2.286 per 1M tokens; `sophnet/DeepSeek-V3.2-Exp` — $0.286/$0.43 per 1M tokens; `sophnet/Qwen3-235B-A22B-Thinking-2507` — $0.286/$2.86 per 1M tokens; `sophnet/Qwen3-VL-235B-A22B-Thinking` — $0.286/$2.86 per 1M tokens; `sophnet/Qwen3-VL-235B-A22B-Instruct` — $0.286/$1.143 per 1M tokens; `sophnet/Qwen3-Next-80B-A3B-Thinking` — $0.143/$1.43 per 1M tokens; `sophnet/Qwen3-Next-80B-A3B-Instruct` — $0.143/$0.5715 per 1M tokens; `sophnet/Qwen3-30B-A3B-Thinking-2507` — $0.1/$0.4 per 1M tokens; `sophnet/Qwen3-30B-A3B-Instruct-2507` — $0.1/$0.4 per 1M tokens; `sophnet/LongCat-Flash-Thinking` — $0.143/$1.429 per 1M tokens; `sophnet/Kimi-K2-0905` — $0.572/$2.286 per 1M tokens; `sophnet/LongCat-Flash-Chat` — $0.143/$0.714 per 1M tokens; `sophnet/Seed-OSS-36B-Instruct` — $0.172/$1.715 per 1M tokens; `sophnet/DeepSeek-V3.1-Fast` — $1.143/$3.4286 per 1M tokens; `sophnet/DeepSeek-V3.1` — $0.5715/$1.7143 per 1M tokens; `sophnet/GLM-4.5V` — $0.286/$0.8572 per 1M tokens; `sophnet/Qwen3-235B-A22B-Instruct-2507` — $0.28600000000000003/$1.14 per 1M tokens; `sophnet/Qwen3-32B` — $0.1429/$0.5715 per 1M tokens; `sophnet/Qwen3-Coder` — $0.86/$3.43 per 1M tokens (+2 more rows); `sophnet/Kimi-K2` — $0.57/$2.29 per 1M tokens; `sophnet/Qwen2-VL-7B-Instruct` — $0.29/$0.71 per 1M tokens; `sophnet/Qwen2-VL-72B-Instruct` — $2.29/$6.86 per 1M tokens; `sophnet/Qwen2.5-VL-7B-Instruct` — $0.29/$0.86 per 1M tokens; `sophnet/Qwen2.5-VL-32B-Instruct` — $1.14/$3.43 per 1M tokens; `sophnet/Qwen2.5-VL-72B-Instruct` — $2.29/$6.86 per 1M tokens; `sophnet/DeepSeek-R1-Distill-Qwen-7B` — $0.07/$0.14 per 1M tokens; `sophnet/DeepSeek-R1-Distill-Qwen-32B` — $0.29/$0.86 per 1M tokens; `sophnet/Qwen2.5-7B-Instruct` — $0.07/$0.14 per 1M tokens; `sophnet/Qwen2.5-32B-Instruct` — $0.29/$0.86 per 1M tokens; `sophnet/Qwen2.5-72B-Instruct` — $0.57/$1.71 per 1M tokens; `sophnet/QwQ-32B` — $0.29/$0.86 per 1M tokens; `sophnet/Qwen3-235B-A22B` — $0.57/$1.71 per 1M tokens; `sophnet/Qwen3-14B` — $0.07/$0.29 per 1M tokens; `sophnet/DeepSeek-v3` — $0.29/$1.14 per 1M tokens; `sophnet/DeepSeek-V3-Fast` — $0.571/$2.28 per 1M tokens; `sophnet/DeepSeek-R1` — $0.57/$2.29 per 1M tokens; `sophnet/DeepSeek-R1-0528` — $0.57/$2.29 per 1M tokens; `sophnet/GLM-5` — $0.572/$2.286 per 1M tokens (+2 more rows); `sophnet/MiniMax-M2.1` — $0.3/$1.2 per 1M tokens; `sophnet/GLM-4.7` — $0.286/$1.143 per 1M tokens (+2 more rows); `sophnet/MiMo-V2-Flash` — $0.1/$0.3 per 1M tokens; `sophnet/GLM-4.6` — $0.286/$1.143 per 1M tokens

**SiliconFlow** (70): `Pro/deepseek-ai/DeepSeek-V3.2` — $0.286/$0.429 per 1M tokens; `deepseek-ai/DeepSeek-V3.2` — $0.286/$0.429 per 1M tokens; `Pro/moonshotai/Kimi-K2-Thinking` — $0.572/$2.286 per 1M tokens; `deepseek-ai/DeepSeek-OCR` — 1M tokens; `Qwen/Qwen3-VL-32B-Thinking` — $0.143/$1.429 per 1M tokens; `Qwen/Qwen3-VL-32B-Instruct` — $0.143/$0.572 per 1M tokens; `Qwen/Qwen3-VL-8B-Thinking` — $0.072/$0.715 per 1M tokens; `Kwaipilot/KAT-Dev` — $0.143/$0.572 per 1M tokens; `Qwen/Qwen3-VL-30B-A3B-Instruct` — $0.1/$0.4 per 1M tokens; `Qwen/Qwen3-VL-30B-A3B-Thinking` — $0.1/$0.4 per 1M tokens; `Qwen/Qwen3-Omni-30B-A3B-Instruct` — $0.1/$0.4 per 1M tokens; `Qwen/Qwen3-Omni-30B-A3B-Thinking` — $0.1/$0.4 per 1M tokens; `Qwen/Qwen3-Omni-30B-A3B-Captioner` — $0.1/$0.4 per 1M tokens; `Pro/deepseek-ai/DeepSeek-V3.1-Terminus` — $0.5715/$1.715 per 1M tokens; `inclusionAI/Ring-flash-2.0` — $0.143/$0.572 per 1M tokens; `inclusionAI/Ling-flash-2.0` — $0.143/$0.572 per 1M tokens; `Qwen/Qwen3-Next-80B-A3B-Thinking` — $0.143/$0.572 per 1M tokens; `Qwen/Qwen3-Next-80B-A3B-Instruct` — $0.143/$0.572 per 1M tokens; `inclusionAI/Ling-mini-2.0` — $0.0715/$0.286 per 1M tokens; `Pro/moonshotai/Kimi-K2-Instruct-0905` — $0.5715/$2.286 per 1M tokens; `ByteDance-Seed/Seed-OSS-36B-Instruct` — $0.2143/$0.5715 per 1M tokens; `tencent/Hunyuan-MT-7B` — Free for a limited time; `sf/zai-org/GLM-4.5V` — $0.143/$0.857 per 1M tokens; `Qwen/Qwen3-Coder-30B-A3B-Instruct` — $0.1/$0.4 per 1M tokens; `Qwen/Qwen3-30B-A3B-Thinking-2507` — $0.1/$0.4 per 1M tokens; `Qwen/Qwen3-235B-A22B-Thinking-2507` — $0.36/$1.43 per 1M tokens; `Qwen/Qwen3-30B-A3B-Instruct-2507` — $0.1/$0.4 per 1M tokens; `sf/zai-org/GLM-4.5-Air` — $0.143/$0.857 per 1M tokens; `Qwen/Qwen3-235B-A22B-Instruct-2507` — $0.36/$1.43 per 1M tokens; `THUDM/GLM-4.1V-9B-Thinking` — Free for a limited time; `ascend-tribe/pangu-pro-moe` — $0.143/$0.572 per 1M tokens; `tencent/Hunyuan-A13B-Instruct` — $0.14/$0.6 per 1M tokens; `baidu/ERNIE-4.5-300B-A47B` — $0.3/$1.14 per 1M tokens; `Pro/Qwen/Qwen2.5-VL-7B-Instruct` — $0.05/$0.05 per 1M tokens; `Qwen/Qwen2.5-VL-32B-Instruct` — $0.3/$0.3 per 1M tokens; `Qwen/Qwen3-8B` — 1M tokens; `Qwen/Qwen3-14B` — $0.07/$0.3 per 1M tokens; `Qwen/Qwen3-32B` — $0.14/$0.6 per 1M tokens; `deepseek-ai/DeepSeek-R1-0528-Qwen3-8B` — Free for a limited time; `THUDM/GLM-4-32B-0414` — $0.06999999999999999/$0.06999999999999999 per 1M tokens; `THUDM/GLM-4-9B-0414` — 1M tokens; `THUDM/GLM-Z1-9B-0414` — 1M tokens; `THUDM/GLM-Z1-32B-0414` — $0.06999999999999999/$0.06999999999999999 per 1M tokens; `Qwen/QwQ-32B` — $0.6/$0.6 per 1M tokens; `deepseek-ai/deepseek-vl2` — $0.142/$0.142 per 1M tokens; `Pro/deepseek-ai/DeepSeek-R1` — $0.6/$2.3 per 1M tokens; `Pro/deepseek-ai/DeepSeek-V3` — $0.3/$1.2 per 1M tokens; `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B` — 1M tokens; `deepseek-ai/DeepSeek-R1-Distill-Qwen-14B` — $0.1/$0.1 per 1M tokens; `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B` — $0.18/$0.18 per 1M tokens; `deepseek-ai/DeepSeek-R1` — $0.6/$2.3 per 1M tokens; `deepseek-ai/DeepSeek-V3` — $0.3/$1.2 per 1M tokens; `Pro/zai-org/GLM-5` — $0.572/$2.58 per 1M tokens (+1 more rows); `Pro/Qwen/Qwen2.5-7B-Instruct` — $0.05/$0.05 per 1M tokens; `Pro/Qwen/Qwen2.5-Coder-7B-Instruct` — $0.05/$0.05 per 1M tokens; `Qwen/Qwen2.5-Coder-7B-Instruct` — 1M tokens; `Qwen/Qwen2.5-7B-Instruct` — 1M tokens; `Qwen/Qwen2.5-14B-Instruct` — $0.1/$0.1 per 1M tokens; `Qwen/Qwen2.5-32B-Instruct` — $0.18/$0.18 per 1M tokens; `Qwen/Qwen2.5-72B-Instruct-128K` — $0.59/$0.59 per 1M tokens; `Qwen/Qwen2.5-Coder-32B-Instruct` — $0.18/$0.18 per 1M tokens; `deepseek-ai/DeepSeek-V2.5` — $0.15/$0.3 per 1M tokens; `Qwen/Qwen2-VL-72B-Instruct` — $0.59/$0.59 per 1M tokens; `internlm/internlm2_5-7b-chat` — 1M tokens; `Pro/moonshotai/Kimi-K2.5` — $0.572/$3 per 1M tokens; `Pro/THUDM/glm-4-9b-chat` — $0.086/$0.086 per 1M tokens; `THUDM/glm-4-9b-chat` — 1M tokens; `Pro/Qwen/Qwen2-7B-Instruct` — $0.05/$0.05 per 1M tokens; `Qwen/Qwen2-7B-Instruct` — $0.16/$0.22 per 1M tokens; `Pro/zai-org/GLM-4.7` — $0.572/$2.286 per 1M tokens

**Long-Term Memory(Beta)** (1): `Long-Term Memory(Beta)` — Free (+11 more rows)

**302.AI** (9): `MCP Call` — Free; `Claude Format` — Free; `Asynchronous` — Free; `Tool Call` — Free; `Link Parsing` — Charge by model; `Deep Search` — Charge by model; `Reasoning mode` — Charge by model; `Image analysis` — Charge by model; `Online search` — $0.001/call

**Unifuncs** (2): `u1-pro` — $1.2/$1.2 per 1M tokens; `u1` — $0.6/$0.6 per 1M tokens

**美团** (1): `LongCat-Flash-Chat` — $0.2/$1 per 1M tokens

**StreamLake** (3): `KAT-Coder-Pro-V1` — $0.57/$2.28 per 1M tokens (+2 more rows); `KAT-Coder-Exp-72B-1010` — Free; `KAT-Coder-Air-V1` — Free

### Image Generations — 207 SKUs · 27 brands

**General Interface** (1): `General Interface` — Charged according to the corresponding image model (+2 more rows)

**Grok** (1): `Grok-Imagine-Image` — $0.05/call (+1 more rows)

**DALL.E** (3): `dall-e-2-i2i` — $0.016/call (+8 more rows); `dall-e-3-t2i` — $0.04/call (+5 more rows); `dall-e-2-t2i` — $0.016/call (+8 more rows)

**302.AI** (21): `Z-Image-Turbo` — $0.05/call; `Qwen-Image-Lora` — $0.05/call (+2 more rows); `Official Qwen Image` — $0.05/call; `omnigen-v1` — $0.1/call; `playground-v25` — $0.01/call; `lumina-image-v2` — $0.1/call; `SD3.5-Medium(Open Source Deployment Version)` — $0.05/call; `sd3.5-large-turbo` — $0.05/call; `302ai-sd35-large-t2i` — $0.1/call; `Lora(Open Source Deployment Version)` — $0.05/call (+1 more rows); `QRCode(Open Source Deployment Version)` — $0.01/call; `kolors` — $0.05/call (+1 more rows); `Z-Image` — $0.05/call; `SDXL-Lightning(Open Source Deployment Version)` — $0.005/call; `SD3-V2(Open Source Deployment Version)` — $0.05/call; `SD3(Open Source Deployment Version)` — $0.05/call; `302ai-aura-flow-t2i` — $0.01/call; `302ai-sdxl-lighting-t2i` — $0.005/call; `SDXL-Lora(Open Source Deployment Version)` — $0.01/call; `302ai-sdxl-t2i` — $0.015/call; `Qwen-Image-2512 (Image Generation)` — $0.05/call

**Glif** (1): `Glif` — $0.1/call (+4 more rows)

**Baidu** (2): `baidu-irag-i2i` — $0.05/call; `baidu-irag-t2i` — $0.05/call

**GPT-Image-1** (3): `gpt-image-1-mini` 🔥 — $2/$8 per 1M tokens (+3 more rows); `gpt-image-1-t2i` 🔥 — $5/$40 per 1M tokens (+2 more rows); `gpt-image-1-i2i` 🔥 — $5/$40 per 1M tokens (+2 more rows)

**GPT-Image-1.5** (1): `gpt-image-1.5` — $5/$32 per 1M tokens (+3 more rows)

**gpt-image-2** (1): `gpt-image-2` — $5/$30 per 1M tokens (+3 more rows)

**Bagel** (2): `bagel-image-t2i` — $0.15/call; `bagel-image-i2i` — $0.15/call

**SiliconFlow** (1): `kolors` — Free

**Higgsfield** (1): `higgsfield-t2i` — $0.1/call (+3 more rows)

**Flux** (31): `Flux-2-Pro (official format)` — $0.03/MP (megapixel) (+1 more rows); `Flux-2-Flex (Official format)` — $0.06/MP (megapixel) (+1 more rows); `Flux-1-SRPO` — $0.03 /call; `Flux-1-Krea-Redux` — $0.05/call; `Flux-1-Krea` — $0.05/call; `flux-krea-t2i` — Billing is based on model usage (+1 more rows); `flux-dev-t2i` — Billing is based on model usage (+1 more rows); `flux-pro-1.1-ultra-t2i` — Billing is based on model usage (+1 more rows); `flux-pro-1.1-t2i` — Billing is based on model usage (+1 more rows); `flux-kontext-pro-t2i` — Billing is based on model usage (+1 more rows); `flux-kontext-max-t2i` — Billing is based on model usage (+1 more rows); `302ai-flux-pro-t2i` — $0.1/call; `Finetune(Official API)` — Billing is based on model usage (+1 more rows); `Generate(Official API)` — Billing is based on model usage (+1 more rows); `Flux-Lora-Training` — $3call (+1 more rows); `Flux-General-Inpainting` — $0.1call; `Flux-V1-Pro-Fill` — $0.1call; `Flux-V1-Pro-Depth` — $0.1call; `Flux-V1-Pro-Canny` — $0.1call; `Flux-Schnell-Redux` — $0.05call; `Flux-V1.1-Pro-Redux` — $0.1call; `Flux-General` — $0.1/call; `302ai-flux-kontext-lora-t2i` — $0.1call; `302ai-flux-realism-t2i` — $0.05call; `302ai-flux-schnell-t2i` — $0.1/call; `302ai-flux-dev-t2i` — $0.1/call; `302ai-flux-v1.1-pro-t2i` — $0.1/call; `302ai-flux-v1.1-ultra-t2i` — $0.1/call; `Flux-2-Klein-4B` — $0.014 per time (+1 more rows); `Flux-2-Klein-9B` — $0.015 per time (+1 more rows); `Flux-2-Max (official format)` — $0.07/MP (megapixel) (+1 more rows)

**Ideogram** (10): `Generate (subject reference)` — $0.2/call (+2 more rows); `deogram-v3-quality-t2i` — $0.09/call (+1 more rows); `ideogram/V_3_DEFAULT` — $0.06/call (+1 more rows); `ideogram-v3-turbo-t2i` — $0.03/call (+1 more rows); `ideogram-v2-turbo-t2i` — $0.025/call; `ideogram/V_2A` — $0.04/call; `ideogram/V_1_TURBO` — $0.02/call; `ideogram-v1-t2i` — $0.06/call; `ideogram-v1-turbo-t2i` — $0.05/call; `ideogram-v2-t2i` — $0.08/call

**Tongyi Wanxiang** (11): `qwen-image-plus` — $0.05/image (+1 more rows); `wan2.5-t2i-preview` — $0.05/image (+1 more rows); `qwen-image` — $0.05/image (+1 more rows); `wan2.2-t2i-plus` — $0.05/image (+1 more rows); `wan2.2-t2i-flash` — $0.03/image (+1 more rows); `wan2.7-image-pro` — $0.08/image (+1 more rows); `wan2.7-image` — $0.03/image (+1 more rows); `wanx2.1-t2i-plus` — $0.05/image (+1 more rows); `wanx2.1-t2i-turbo` — $0.03/image (+1 more rows); `qwen-t2i` — $0.01/image (+1 more rows); `wan2.6-image` — $0.03/image (+1 more rows)

**Qwen** (2): `qwen-image-3.0-pro` — $0.01/piece; `qwen-image-max` — $0.08/piece

**Google** (10): `gemini-3-pro-image-preview` 🔥 — $2/$120 per 1M Tokens (+5 more rows); `gemini-2.5-flash-image ` 🔥 — $0.3/$30 per 1M Tokens (+4 more rows); `gemini-3.1-flash-lite-image` 🔥 — $0.25/$1.5 per 1M Tokens (+2 more rows); `gemini-2.5-flash-image-preview` 🔥 — $0.3/$30 per 1M Tokens (+10 more rows); `Imagen-4-Preview-Ultra` — $0.1/call; `Imagen-4-Preview-Fast` — $0.05/call; `google-v4-preview-t2i` — $0.1/call; `gemini-3.1-flash-image-preview` 🔥 — $0.5/$60 per 1M Tokens (+5 more rows); `google-v3-fast-t2i` — $0.05/call; `google-v3-t2i` — $0.1/call

**Midjourney** (12): `Midjourney（Turbo）` — $0.1/call (+8 more rows); `midjourney-v7-i2i` — $0.05/call (+8 more rows); `midjourney-v7-t2i` — $0.05/call (+8 more rows); `Midjourney（Relax）` — $0.02/call (+8 more rows); `midjourney-v6-i2i` — $0.05/call (+8 more rows); `midjourney-v6-1-i2i` — $0.05/call (+8 more rows); `midjourney-v6-t2i` — $0.05/call (+8 more rows); `midjourney-v6-1-t2i` — $0.05/call (+8 more rows); `nijijourney-v6-i2i` — $0.05/call (+8 more rows); `nijijourney-v6-t2i` — $0.05/call (+8 more rows); `Midjourney V5.1` — $0.05/call (+8 more rows); `Midjourney V5.2` — $0.05/call (+8 more rows)

**Jimeng** (9): `doubao-seedream-4-5-251128` 🔥 — $0.04/call; `doubao-seedream-5-0-pro-260628` 🔥 — $0.043/call; `doubao-seedream-4-0-250828` 🔥 — $0.03/call; `doubao-seededit-v3.0-i2i` — $0.05/call; `doubao-seedream-3-0-t2i-250415` — $0.05/call; `doubao-v3-t2i` — $0.05/call; `doubao-v2-t2i` — $0.05/call; `doubao-v2-l-t2i` — $0.05/call; `doubao-v2.1-l-t2i` — $0.05/call

**Recraft** (3): `recraft-20b-t2i` — $0.03/call; `Create-Style` — $0.04/call; `recraft-v3-t2i` — $0.05/call

**Luma AI** (3): `luma-flash-t2i` — $0.01/call; `photon-flash-1` — $0.01/call; `luma-t2i` — $0.05/call

**ZHIPU** (3): `cogview-4-250304-t2i` — $0.02/call; `cogview-4-t2i` — $0.02/call; `GLM-Image` — $0.016/call

**Kling** (8): `Kling Image O1` — $0.028/image (+1 more rows); `kling-v2-new` — $0.04/image (+1 more rows); `kling-v2-1` — $0.02/image (+1 more rows); `kling-v2-t2i` — $0.02/image (+1 more rows); `kling-v1-5-t2i` — $0.02/image (+1 more rows); `kling-v2-i2i` — $0.04/image (+1 more rows); `kling-v1` — $0.005/image (+1 more rows); `Kling Image O3` — $0.028/image (+2 more rows)

**Hidream** (3): `hidream-i1-full-t2i` — $0.05/call; `hidream-i1-dev-t2i` — $0.03/call; `hidream-i1-fast-t2i` — $0.01/call

**Minimax** (1): `minimaxi-t2i` — $0.01/call

**Vidu** (2): `Viduq2 (Image Generation)` — $0.021 /call (+9 more rows); `Vidu（Reference to Image）` — $0.07 /call (+1 more rows)

**WaveSpeed** (61): `wavespeed-ai/flux-2-dev` — $0.012/call (+2 more rows); `wavespeed-ai/flux-2-flex` — $0.06/call (+2 more rows); `wavespeed-ai/flux-2-pro` — $0.03/call (+2 more rows); `Universal interface for image generation` — Same with Wavespeed (+1 more rows); `google/gemini-2.5-flash-image/text-to-image` — $0.038/call (+1 more rows); `runwayml/gen4-image` — $0.05/call (+2 more rows); `runwayml/gen4-image-turbo` — $0.03/call (+1 more rows); `wavespeed-ai/flux-dev-lora-ultra-fast` — $0.006/picture (+1 more rows); `google/gemini-2.5-flash-image-preview/text-to-image` — $0.038/call (+1 more rows); `wavespeed-ai/wan-2.2/text-to-image-lora` — $0.025/call (+1 more rows); `stability-ai/sdxl` — $0.0026/call (+1 more rows); `stability-ai/stable-diffusion` — $0.0035/call (+1 more rows); `stability-ai/stable-diffusion-3` — $0.03/call (+1 more rows); `wavespeed-ai/qwen-image/text-to-image-lora` — $0.025/call (+1 more rows); `openai/gpt-image-1/text-to-image` — $0.011/call (+6 more rows); `openai/dall-e-3` — $0.04/call (+4 more rows); `openai/dall-e-2` — $0.12/call (+1 more rows); `wavespeed-ai/flux-1-srpo` — $0.025/call (+1 more rows); `leonardoai/lucid-origin` — $0.02/call (+1 more rows); `wavespeed-ai/neta-lumina` — $0.01/call (+1 more rows); `wavespeed-ai/flux-1.1-pro` — $0.04 /call (+1 more rows); `wavespeed-ai/flux-1.1-pro-ultra` — $0.06/call (+1 more rows); `wavespeed-ai/flux-krea-dev-lora` — $0.025/call (+1 more rows); `bytedance/seedream-v3.1` — $0.027/call (+1 more rows); `wavespeed-ai/qwen-image/text-to-image-lora` — $0.025/call (+1 more rows); `bytedance/seedream-v4/sequential` — $0.027/picture (+1 more rows); `wavespeed-ai/wan-2.2/text-to-image-lora` — $0.025/call (+1 more rows); `google/imagen4-fast` — $0.018/call (+1 more rows); `google/imagen4-ultra` — $0.058/call (+1 more rows); `ideogram-ai/ideogram-v3-turbo` — $0.03/call (+1 more rows); `ideogram-ai/ideogram-v2a-turbo` — $0.04/call (+1 more rows); `ideogram-ai/ideogram-v3-balanced` — $0.06/call (+1 more rows); `wavespeed-ai/wan-2.1/text-to-image-lora` — $0.025/call (+1 more rows); `luma/photon` — $0.015/call (+1 more rows); `luma/photon-flash` — $0.005/call (+1 more rows); `google/imagen3` — $0.038/call (+1 more rows); `google/imagen3-fast` — $0.018/call (+1 more rows); `wavespeed-ai/hidream-i1-full` — $0.024/call (+1 more rows); `wavespeed-ai/hidream-i1-dev` — $0.012/call (+1 more rows); `wavespeed-ai/step1x-edit` — $0.03/call (+1 more rows); `wavespeed-ai/imagen4` — $0.04/call (+1 more rows); `wavespeed-ai/flux-kontext-pro/text-to-image` — $0.04/call (+1 more rows); `wavespeed-ai/flux-kontext-max/text-to-image` — $0.08/call (+1 more rows); `bytedance/seedream-v3` — $0.027/call (+1 more rows); `wavespeed-ai/flux-schnell` — $0.003/call (+1 more rows); `wavespeed-ai/wan-2.1/text-to-image` — $0.02/call (+1 more rows); `wavespeed-ai/any-llm/vision` — $0.05/call (+1 more rows); `wavespeed-ai/hunyuan-image-2.1` — $0.025/call (+1 more rows); `wavespeed-ai/female-human` — $0.015/call (+1 more rows); `wavespeed-ai/flux-dev-ultra-fast` — $0.01/call; `google/imagen4` — $0.038/picture (+1 more rows); `openai/gpt-image-1-high-fidelity` — $0.167/call (+1 more rows); `bytedance/dreamina-v3.1/text-to-image` — $0.027/picture (+1 more rows); `bytedance/dreamina-v3.0/text-to-image` — $0.027/call (+1 more rows); `leonardoai/phoenix-1.0` — $0.038/call (+1 more rows); `reve/text-to-image` — $0.025/call (+1 more rows); `Kling O3(Text-to-Image)` — $0.028/image (+3 more rows); `stability-ai/stable-diffusion-3.5-medium` — $0.035/call (+1 more rows); `stability-ai/stable-diffusion-3.5-large` — $0.06/call (+1 more rows); `stability-ai/stable-diffusion-3.5-large-turbo` — $0.04/call (+1 more rows); `stability-ai/sdxl-lora` — $0.001/call (+1 more rows)

### Image Processing — 142 SKUs · 25 brands

**Recraft** (4): `Generative Upscale` — $0.8/call; `Clarity Upscale` — $0.04/call; `Remove Background` — $0.04/call; `Vectorize Image` — $0.04/call

**Vectorizer.AI** (1): `Vectorize` — $0.3/call

**Stepfun** (1): `Step1x-Edit` — $0.1/call

**BRIA** (16): `Delayer Image` — $0.1/call (+1 more rows); `Presenter info` — $0.1/call (+1 more rows); `Mask` — $0.1/call (+1 more rows); `Caption` — $0.1/call; `Scene` — $0.1/call; `Shadow` — $0.1/call; `Packshot` — $0.1/call; `Cutout` — $0.1/call; `Crop` — $0.1/call; `Increase Resolution` — $0.1/call; `Expand Image` — $0.1/call; `Eraser` — $0.1/call; `Erase Foregroundround` — $0.1/call; `Generate Background` — $0.1/call; `Generate Background` — $0.1/call; `Remove Background` — $0.1/call

**Bagel** (1): `bagel-image-t2i` — $0.15/call

**Hunyuan3D** (2): `Hunyuan3d-v21(Generate 3D Model)` — $0.3/call (+1 more rows); `Hunyuan3d (Multi-Interface Integration` — $0.02/Point (+13 more rows)

**302.AI** (41): `Upscale-Fast` — $0.005/call; `Upscale-V6` — $0.05/call; `Upscale-V5` — $0.01/call; `Qwen-Image-Edit-Plus` — $0.1/call (+1 more rows); `Virtual-Tryon （Virtual Clothing V2）` — $0.06 /call; `Qwen-Image-Edit` — $0.05/call; `Image Merge` — $0.001/call; `Moondream2 (Image Prompt Generation)` — $0.01/characters; `Retouch（Portrait beautification）` — $0.01/call; `SAM（AI-generated MASK image）` — $0.01/call; `Deblur（AI Deblurring）` — $0.05/call; `Denoise（AI Denoising）` — $0.05/call; `Relight-V2` — $0.15/call; `Virtual-Tryon` — $0.15/call (+1 more rows); `Pose-Transfer（Human Pose Transformation）` — $0.15/call (+1 more rows); `Trellis（Image to 3D model）` — $0.05/call; `flux-selfie` — $0.05/call; `image-translate-redo` — $0.02/call; `image-translate-query` — Free; `image-translate` — $0.02/call; `SvgToPng` — Free; `HtmltoPng` — Free; `Upscale-V4` — $0.01/call; `Erase` — $0.01/call; `Inpaint` — $0.05/call; `Removebg-V3` — $0.01/call; `Removebg-V2` — $0.01/call; `Colorize-V2` — $0.05/call; `Upscale-V3` — $0.01/call; `Relight-background` — $0.1/call; `Relight` — $0.05/call; `Llava` — $0.01/call; `Face-to-many` — $0.05/call; `Removebg` — $0.01/call; `Super-Upscale-V2` — $0.1/call; `Super-Upscale` — $0.1/call; `Face-upscale` — $0.01/call; `Upscale-V2` — $0.01/call; `Upscale` — $0.01/call; `Colorize` — $0.01/call; `Qwen-Image-Layered` — $0.05/call (+1 more rows)

**Hidream** (1): `hidream-e1-i2i` — $0.1/call

**Gongji Computing** (7): `Image Eliminater` — $0.01/call (+1 more rows); `style_transfer` — $0.1/call (+1 more rows); `Image2Reality` — $0.1/call (+1 more rows); `Anything Changer` — $0.1/call (+3 more rows); `Clothes Changer` — $0.1/call (+3 more rows); `Flux Kontext Dev` — $0.03/call (+3 more rows); `Flux Dev` — $0.03/call (+1 more rows)

**Kling** (2): `Images-expand` — $0.04/image (+1 more rows); `Virtual-Try-On` — $0.1/call (+1 more rows)

**Jimeng** (6): `Seed3D（Image generation 3D model）` — $11/1M Tokens (+1 more rows); `doubao-seed3d-2-0-260328` — $11/1M Tokens (+1 more rows); `SeedEdit_v3.0 (Result Acquisition)	` — $0.05/call (+3 more rows); `Portrait (Portrait Photography)` — $0.05/call (+1 more rows); `SeedEdit（Image Command Editing）` — $0.05/call; `Character（Character Feature Preservation）` — $0.05/call

**Ideogram** (13): `Remix (subject reference)` — $0.2/call (+2 more rows); `Edit (subject reference)` — $0.2/call (+2 more rows); `ideogram-v3-turbo-i2i` — $0.03/call (+5 more rows); `Ideogram 1.0 Turbo` — $0.02/call (+1 more rows); `Ideogram 1.0` — $0.06/call (+1 more rows); `Ideogram 2.0 Turbo` — $0.05/call (+1 more rows); `Ideogram 2.0` — $0.08/call (+1 more rows); `Describe（Image Description）` — $0.01/call; `Upscale（Image Upscaling）` — $0.06/call; `Ideogram V2 Turbo` — $0.025/call; `Ideogram V1` — $0.04/call; `ideogram-v3-quality-i2i` — $0.2/call (+5 more rows); `Ideogram v3 default` — $0.15/call (+5 more rows)

**FASHN** (2): `Fashn-Tryon-v1.5（Virtual Try-On 1.5）` — $0.1/call; `Fashn-Tryon（Virtual Try-On）` — $0.1/call

**Tripo3D** (1): `Tripo3D V2.0` — $0.15/call (+15 more rows)

**Hyper3d** (1): `Hyper3d-Rodin（Generate 3D models）` — $0.7/call (+1 more rows)

**Flux** (14): `flux-dev-i2i` — $0.08/call (+2 more rows); `flux-kontext-pro-i2i` — $0.08/call (+2 more rows); `flux-kontext-max-i2i` — $0.08/call (+2 more rows); `Generate（Image Edit Official API）` — $0.08/call (+2 more rows); `302ai-flux-kontext-dev-i2i` — $0.03/call; `302ai-flux-kontext-max-i2i` — $0.1/call; `302ai-flux-kontext-pro-i2i` — $0.05/call; `Flux-V1-Pro-Fill` — $0.1/call; `Flux-V1-Pro-Depth` — $0.1/call; `Flux-V1-Pro-Canny` — $0.1/call; `Flux-Schnell-Redux` — $0.05/call; `Flux-Dev-Redux` — $0.05/call; `Flux-V1.1-Pro-Redux` — $0.1/call; `Flux-V1.1-Ultra-Redux` — $0.1/call

**Clipdrop** (4): `Uncrop` — $0.5/call; `Remove-background` — $0.5/call; `Upscale` — $0.5/call; `Cleanup` — $0.5/call

**Glif** (6): `Glif（Photo Pixelation）` — $0.01/call; `Glif（Image-to-GIF）` — $0.1/call; `Glif（Logo Materialization）` — $0.1/call; `Glif（Photo Pixelation）` — $0.1/call; `Glif（Photo-to-Sculpture）` — $0.1/call; `Glif（Portrait Photo Stylization）` — $0.1/call

**302.AI-ComfyUI** (5): `Image Removal Task` — $0.1/call (+1 more rows); `Style Transfer Task` — $0.1/call (+1 more rows); `Transform Cartoon Characters into Real People` — $0.1/call (+1 more rows); `Replace Any Item` — $0.1/call (+2 more rows); `Outfit Change Task` — $0.1/call (+2 more rows)

**Tongyi Wanxiang** (4): `wan2.5-i2i-preview` — $0.05/image (+1 more rows); `Qwen-MT-Image (Image Translation)` — $0.001/image; `qwen-image-edit` — $0.05/image; `wanx2.1-imageedit` — $0.05/image (+1 more rows)

**Qwen** (1): `qwen-image-edit-plus-2025-12-15` — $0.03/image

**WaveSpeed** (2): `wavespeed-ai/image-captioner` — $0.001/call (+1 more rows); `General interface for image processing` — Same with Wavespeed (+1 more rows)

**Topazlabs** (5): `Image Lighting` — $0.15=1Credits (+2 more rows); `Image Restore` — $0.15=1Credits (+2 more rows); `Image Denoise` — $0.15=1Credits (+2 more rows); `Image Enhance` — $0.15=1Credits (+3 more rows); `Image Sharpen` — $0.15=1Credits (+3 more rows)

**Topview** (1): `Product Image Replacement` — $0.125/image (+10 more rows)

**Photoroom** (1): `Remove Background` — $0.022/call

### Video Generation — 209 SKUs · 25 brands

**General Interface** (1): `General Interface` — Charge based on the corresponding suppliers (+1 more rows)

**OpenAI** (4): `Sora-2-pro（Official Format）` 🔥 — $0.3/ second (+7 more rows); `Sora-2（Official Format）` 🔥 — $ 0.1/ second (+4 more rows); `Sora-2（Asynchronous request）` — $0.525/Call (+2 more rows); `Sora-2（Chat Format）` — $0.525/call

**Luma AI** (1): `Luma AI` — $0.4/call (+2 more rows)

**Genmo** (1): `Genmo Mochi-v1` — $0.5/call (+1 more rows)

**Kunlun Tech** (1): `Skyreels(Image to Video)` — $0.5/call (+1 more rows)

**302.AI** (5): `Wan-2.2-i2v-fast (Get Video Result)` — $0.05/call (+2 more rows); `Video-To-Video Style Transfer (Open Source Deployment Version)` — $0.4/call (+1 more rows); `Live-portrait Portrait-to-Video (Open Source Deployment Version)` — $0.1/call (+1 more rows); `Upscale-Video High-Definition Enhancement (Open Source Deployment Version)` — $0.15/second (+1 more rows); `Image-to-Video Conversion (Open Source Deployment Version)` — $0.4/call (+1 more rows)

**ZHIPU** (2): `cogvideox-3` — $0.15/call (+3 more rows); `cogvideox-2 ` — $0.1/call (+2 more rows)

**Runway** (7): `Runway Aleph` — $0.5/call (+1 more rows); `Runway Act-two` — $0.25/call (+1 more rows); `Runway Gen-4-Turbo` — $0.2/call (+1 more rows); `Runway Gen-4` — $0.5/call (+1 more rows); `Runway Gen-3-Turbo` — $0.25/call (+2 more rows); `Runway Expand` — $0.25/call (+1 more rows); `Runway Gen-3` — $0.5/call (+3 more rows)

**Kling** (22): `Kelingtu Image to Video 2.6` — $0.07/second (+2 more rows); `Keling Text to Video 2.6` — $0.07/second (+2 more rows); `Kling O1` — $0.112/Second (+2 more rows); `Kling Image video 2.5` 🔥 — $0.35/call (+4 more rows); `Kling Txt2Video 2.5` — $0.35/call (+4 more rows); `Effects (Official API Format)` — $0.3/call (+5 more rows); `Kling MultiImage2Video (Official API Format)` — $0.3/call (+4 more rows); `Kling Image-to-Video 2.1` — $1.5/call (+2 more rows); `Kling Text-to-Video 2.1` — $1.5/call (+2 more rows); `Kling Image-to-Video (Official API Format)` — $0.15 / point (+1 more rows); `Kling Image video 2.1` 🔥 — $0.3/call (+4 more rows); `Kling Image-to-Video 2.0` — $1.5/call (+2 more rows); `Kling Text-to-Video 2.0` — $0.15 / point (+1 more rows); `Kling Image to Video 1.6` — $0.3/call (+4 more rows); `Kling Txt2Video 1.6` — $0.3/call (+4 more rows); `Kling Text to Video 1.5` — $0.5/call (+2 more rows); `Kling Extend Video` — $0.15/call (+1 more rows); `Kling Image to Video 1.5` — $0.3/call (+4 more rows); `Kling O3 video generation` — $0.252/second (+12 more rows); `Kling Image to Video 1.0` — $0.15/call (+2 more rows); `Kling Text to Video 1.0` — $0.15/call (+1 more rows); `Kling Text-to-Video (Official API Format)` — $0.15 / point (+1 more rows)

**Minimax** (6): `S2V-01` — $0.7/call (+2 more rows); `I2V-01-Director` — $0.5/call (+4 more rows); `I2V-01-live` — $0.5/call (+4 more rows); `I2V-01` — $0.5/call (+4 more rows); `T2V-01-Director` — $0.5/call (+3 more rows); `T2V-01` — $0.5/call (+2 more rows)

**MiniMax** (5): `MiniMax-H3-Max` — $0.06/s (+1 more rows); `MiniMax-H3` — $0.0858/s (+2 more rows); `MiniMax-Hailuo-2.3` — $0.3/call (+4 more rows); ` MiniMax-Hailuo-2.3-Fast` — $0.2/call (+4 more rows); `MiniMax-Hailuo-02` — $0.1/call (+6 more rows)

**Pika** (4): `Pika 2.2 Generate` — $0.3/call (+12 more rows); `Pika 2.1 Generate` — $0.6/call (+2 more rows); `Pika Turbo Generate` — $0.3/call (+2 more rows); `Pika 1.5 pikaffects` — $0.7/call (+1 more rows)

**PixVerse** (6): `PixVerse v5.5` — $0.1/call (+17 more rows); `PixVerse v5` 🔥 — $0.1/call (+14 more rows); `PixVerse Lipsync` — $0.05/second (+1 more rows); `PixVerse v4.5` 🔥 — $0.1/call (+8 more rows); `PixVerse v4` — $0.1/call (+8 more rows); `PixVerse v3.5` — $0.1/call (+8 more rows)

**Lightricks** (4): `Lightricks Ltx-Video-v095-I2V` — $0.1/call; `Lightricks Ltx-Video-v095` — $0.1/call; `Lightricks Ltx-Video-I2V` — $0.05/call; `Text-to-video model from Lightricks` — $0.05/call

**Hunyuan** (1): `Hunyuan（Text-to-Video）` — $0.6/call (+1 more rows)

**Vidu** (9): `viduq2-turbo` — $0.005/ point (+1 more rows); `viduq2-pro` — $0.005/ point (+1 more rows); `Vidu（AI Ultra HD – Premium）` — $0.005/ point (+1 more rows); `Vidu vidu1.5` — $0.005/ point (+1 more rows); `Vidu vidu2.0` — $0.005/ point (+1 more rows); `Vidu viduq1 ` — $0.005/ point (+1 more rows); `viduq3-turbo` — $0.005/ point (+3 more rows); `viduq3-pro` — $0.005/ point (+3 more rows); `viduq2-pro-fast` — $0.005/ point (+2 more rows)

**Jimeng** (11): `doubao-seedance-2-5-260628` — $10/1M tokens (+1 more rows); `doubao-seedance-1-0-pro-fast-251015` — $0.6/1M tokens (+1 more rows); `doubao-seedance-1-0-pro-250528` — $2.2/1M tokens (+1 more rows); `doubao-seedance-1-0-lite-i2v-250428` — $1.5/1M tokens (+3 more rows); `doubao-seedance-1-0-lite-t2v-250428` — $1.5/1M tokens (+1 more rows); `doubao-seedance-2-0-fast-260128` — $6.516/1M tokens (+5 more rows); `doubao-seedance-2-0-260128` — $7.884/1M tokens (+5 more rows); `Seaweed` — $5/1M tokens (+1 more rows); `Jimeng Video Generation 3.0` — $0.05/second (+2 more rows); `Jimeng Video Generation 3.0 pro` — $0.16/second (+1 more rows); `doubao-seedance-1-5-pro-251215` — $0.6/1M tokens (+4 more rows)

**SiliconFlow** (2): `Wan-AI/Wan2.2-T2V-A14B` — $0.286/call (+1 more rows); `Wan-AI/Wan2.2-I2V-A14B` — $0.286/call (+1 more rows)

**Google** (10): `veo3.1-pro` — $1/call (+2 more rows); `Veo3.1` 🔥 — $0.5/call (+2 more rows); `Veo3-V2 (V2 version API format)` — Billing is based on the respective model used. (+8 more rows); `Veo3-Fast-Frames (Text and Image to Video) ` — $0.5/call (+1 more rows); `Veo3-Pro-Frames（Image and Text to Video Generation）` — $1.0/call (+1 more rows); `Veo3-Fast (Text-to-Video Generation)` — $0.5/call (+1 more rows); `Veo3-Pro(Text-to-Video Generation)` — $1.0/call (+1 more rows); `Veo3(Text-to-video)` — $7.0/call (+1 more rows); `Veo2-i2vImage to video generation)` — $5.0/call (+1 more rows); `Veo2(Text-to-video)` — $5.0/call (+1 more rows)

**Higgsfield** (1): `Higgsfield (Image-to-Video)` — $0.138/call (+3 more rows)

**Midjourney** (1): `MJ-Video` — $0.3/call (+2 more rows)

**Topview** (4): `Image2Video Best` — $4/call (+3 more rows); `Image2Video Plus` — $2/call (+3 more rows); `Image2Video Pro` — $1.4/call (+3 more rows); `Image2Video Lite` — $1.0/calll (+3 more rows)

**Tongyi Wanxiang** (26): `wan2.5-i2v-preview` — $0.05/sec (+3 more rows); `wan2.2-animate-move` — $0.07/second (+2 more rows); `wan2.2-animate-mix` — $0.105/second (+2 more rows); `wan2.2-i2v-flash` — $0.02/sec (+2 more rows); `wan2.2-i2v-plus` — $0.03/sec (+2 more rows); `wanx2.1-i2v-plus` — $0.15/sec (+1 more rows); `wanx2.1-i2v-turbo` — $0.05/sec (+1 more rows); `wan2.2-t2v-plus` — $0.03/sec (+2 more rows); `wanx2.1-t2v-plus` — $0.15/sec (+1 more rows); `wan2.2-5b-i2v` — $0.2/call (+1 more rows); `wan2.2-5b-t2v` — $0.2/call (+1 more rows); `wan2.2-a14b-i2v` — $0.5/call (+1 more rows); `happyhorse-1.0-video-edit` — $0.156/second (+2 more rows); `happyhorse-1.0-r2v` — $0.156/second (+2 more rows); `happyhorse-1.0-i2v` — $0.156/second (+2 more rows); `happyhorse-1.0-t2v` — $0.156/sec (+2 more rows); `wan2.7-videoedit` — $0.1/second (+2 more rows); `wan-vace` — $0.4/call (+1 more rows); `wan2.7-r2v` — $0.1/second (+2 more rows); `wan2.7-t2v` — $0.1/sec (+2 more rows); `wan2.7-i2v` — $0.1/second (+2 more rows); `wan-i2v` — $0.5/call (+1 more rows); `wan-t2v` — $0.5/call (+1 more rows); `wan2.6-t2v` — $0.1/sec (+2 more rows); `wan2.6-r2v` — $0.1/second (+2 more rows); `wan2.6-i2v` — $0.1/second (+2 more rows)

**Qwen** (2): `wan3.0-video-prime` — $0.075/second (+3 more rows); `wan3.0-video` — $0.05/second (+3 more rows)

**WaveSpeed** (73): `bytedance/video-upscaler` — $0.018/s
 (+3 more rows); `google/veo3.1/image-to-video` — $1.6/call (+3 more rows); `google/veo3.1/text-to-video` — $1.6/call (+3 more rows); `google/veo3.1/reference-to-video` — $3.2/call (+1 more rows); `google/veo3.1-fast/image-to-video` — $ 0.6/call (+3 more rows); `google/veo3.1-fast/text-to-video` — $ 0.6/call (+3 more rows); `alibaba/wan-2.5/image-to-video` — $0.05/second (+3 more rows); `Universal interface for video generation` — Same with Wavespeed (+1 more rows); `openai/sora-2/image-to-video-pro` — $1.2/Call (+6 more rows); `vidu/start-end-to-video-q2-turbo` — $0.05/Call (+2 more rows); `openai/sora-2/image-to-video` — $0.4/Call (+3 more rows); `openai/sora-2/text-to-video` — $0.4/Call (+3 more rows); `character-ai/ovi/text-to-video` — $0.15/Call (+1 more rows); `kwaivgi/kling-v2.5-turbo-pro/text-to-video` — $0.35/call (+1 more rows); `wavespeed-ai/wan-2.2/speech-to-video` — Free (+12 more rows); `alibaba/wan-2.5/text-to-video-fast` — $0.34/Call (+4 more rows); `kwaivgi/kling-lipsync/text-to-video` — $ 0.6/次 (+1 more rows); `bytedance/dreamina-v3.0/text-to-video-1080p` — $0.6/call (+1 more rows); `kwaivgi/kling-v2.1-t2v-master` — $1.3/call (+1 more rows); `wavespeed-ai/infinitetalk` — $0.24192/call (+2 more rows); `wavespeed-ai/wan-2.2/i2v-720p` — $0.3/call (+2 more rows); `wavespeed-ai/wan-2.2/t2v-5b-720p-lora` — $0.1/call; `wavespeed-ai/wan-2.2/t2v-480p-lora-ultra-fast` — $0.1/call (+1 more rows); `wavespeed-ai/wan-2.2/t2v-5b-720p` — $0.05/call; `wavespeed-ai/wan-2.2/t2v-720p` — $0.3/call (+1 more rows); `bytedance/seedance-v1-pro-t2v-1080p` — $0.12/second; `wavespeed-ai/wan-2.2/t2v-480p-ultra-fast ` — call (+1 more rows); `alibaba/wan-2.2/t2v-plus-1080p` — $0.8/Call (+1 more rows); `wavespeed-ai/wan-2.2/t2v-720p-lora-ultra-fast` — $0.15/call (+1 more rows); `bytedance/dreamina-v3.0/text-to-video-720p` — $0.3/s; `leonardoai/motion-2.0` — $0.3/Call (+1 more rows); `vidu/reference-to-video-q2` — $0.003/s (+4 more rows); `wavespeed-ai/wan-2.2-spicy/image-to-video` — $0.15/Call (+4 more rows); `wavespeed-ai/wan-2.2-spicy/image-to-video-lora` — $0.2/Call (+4 more rows); `kwaivgi/kling-v2.5-turbo-std/image-to-video` — $0.21/Call (+2 more rows); `lightricks/ltx-2-pro/image-to-video` — $0.06/s (+1 more rows); `lightricks/ltx-2-fast/image-to-video` — $0.04/s (+3 more rows); `midjourney/image-to-video` — $0.6/Call (+2 more rows); `google/veo3-fast` — $1.2/Call (+1 more rows); `minimax/hailuo-02/t2v-standard` — $0.23/s (+1 more rows); `minimax/hailuo-02/i2v-pro` — $0.49/call; `bytedance/seedance-v1-pro-t2v-720p` — $0.06/second; `character-ai/ovi/image-to-video` — $0.15/call (+1 more rows); `wavespeed-ai/wan-2.1/t2v-480p-lora` — $ 0.2/次 (+1 more rows); `luma/ray-2-flash-t2v` — $0.2/s (+2 more rows); `pixverse/pixverse-v4.5-t2v-fast` — $0.5/call (+2 more rows); `wavespeed-ai/wan-2.2/i2v-480p` — $0.15/s (+2 more rows); `pixverse/pixverse-v4.5-t2v` — $ 0.25/次 (+6 more rows); `bytedance/seedance-v1-lite-t2v-480p` — $0.016/s; `bytedance/seedance-v1-lite-t2v-1080p` — $0.09/second; `bytedance/seedance-v1-lite-t2v-720p` — $0.032/s; `vidu/text-to-video-q1` — $0.4/call (+1 more rows); `google/veo2` — $0.5/Call (+1 more rows); `pixverse/pixverse-v5-t2v` — $0.15/call (+5 more rows); `kwaivgi/kling-v2.0-t2v-master` — $1.3/call (+2 more rows); `wavespeed-ai/hunyuan-video/t2v` — $0.4/s; `pika/v2.2-t2v` — $0.2/Call (+2 more rows); `wavespeed-ai/wan-2.1/t2v-720p-ultra-fast` — $0.225/次 (+2 more rows); `pika/v2.1-t2v` — $0.2/Call (+2 more rows); `vidu/text-to-video-2.0` — $0.6/call; `luma/ray-1.6-t2v` — $0.3/Call (+2 more rows); `luma/ray-2-t2v` — $0.4/s (+2 more rows); `wavespeed-ai/wan-2.1/t2v-480p` — $0.2/call (+1 more rows); `wavespeed-ai/wan-2.1/t2v-720p` — $0.3/call; `kwaivgi/kling-v1.6-t2v-standard` — $0.225/call (+2 more rows); `pika/v2.0-turbo-t2v` — $0.2/s (+1 more rows); `Kling V3(Image-to-video)` — $0.084/Second (+4 more rows); `Kling V3(Text-to-video)` — $0.084/Second (+4 more rows); `Kling O3(reference-to-video)` — $0.084/Second (+6 more rows); `Kling O3(video-edit)` — $0.126/Second (+2 more rows); `Kling O3(Image-to-video)` — $0.084/Second (+4 more rows); `Kling O3(Text-to-video)` — $0.084/Second (+4 more rows); `vidu/text-to-video` — $0.2/call (+1 more rows)

### Audio-Video Processing — 90 SKUs · 19 brands

**General Interface** (1): `General Interface` — Charge based on the corresponding suppliers (+2 more rows)

**Kling** (2): `Kling Video-to-Audio` — $0.05/call (+1 more rows); `Kling Text-to-Audio` — $0.05/call (+1 more rows)

**Microsoft** (1): `AzureTTS（Text to Speech）` — $20.0/1M characters (+1 more rows)

**SiliconFlow** (3): `fnlp/MOSS-TTSD` — $7/1M tokens (+2 more rows); `FunAudioLLM/CosyVoice2-0.5B` — $7/1M tokens (+2 more rows); `FunAudioLLM/SenseVoiceSmall` — Free (+2 more rows)

**302.AI** (15): `Audio-Translation(Audio-Translation)` — Depends on the specific model used (+1 more rows); `Video-Utils` — $0.0001/second (+1 more rows); `IndexTTS-2` — $15/1M tokens (+1 more rows); `Higgs Audio V2` — 1M tokens (+3 more rows); `Video-Understanding（Video understanding）` — $0.003/second (+1 more rows); `Diffrhythm（Song Generation）` — $0.2/call; `mmaudio（AI Video Voiceover）` — $0.05/call (+1 more rows); `whisper-v3-turbo` — $0.002/min (+1 more rows); `WhisperX` — $0.002/min; `Stable-Audio（instrumental generation）` — $0.05/call; `whisper-v3` — $0.002/min; `mmaudio（Text-to-Speech）` — $0.05/call; `F5-TTS（Text to Speech）` — $50.0/1M characters (+2 more rows); `Alignments（Subtitle Timing）` — $0.002/min; `Transcript (Audio/Video to Text)` — $0.01/min

**Minimax** (16): `music-2.0` — $0.05/call; `speech-2.6-hd` — $52.5/1M characters (+3 more rows); `speech-2.6-turbo` — $30/1M characters (+3 more rows); `music-1.5` — $0.05/call; `speech-2.5-hd-preview` — $52.5/1M characters (+2 more rows); `speech-2.5-turbo-preview` — $30/1M characters (+2 more rows); `music-2.5+` — $0.15/call; `speech-2.8-hd` — $52.5/1M characters (+3 more rows); `speech-2.8-turbo` — $30/1M characters (+3 more rows); `speech-01-turbo-240228` — $30/1M characters (+2 more rows); `speech-01-turbo` — $30/1M characters (+2 more rows); `speech-02-turbo` — $30/1M characters (+2 more rows); `speech-02-hd` — $52.5/1M characters (+2 more rows); `speech-01-hd` — $52.5/1M characters (+2 more rows); `T2V（Wen Sheng Tone）` — Free (+1 more rows); `music-2.5` — $0.15/call

**OpenAI** (12): `gpt-4o-transcribe-diarize` — $3/$5 per 1M tokens; `gpt-4o-mini-transcribe` — $6/$10 per 1M tokens; `gpt-4o-transcribe` — $6/$10 per 1M tokens; `gpt-realtime-mini-2025-10-06` — $10/$20 per 1M characters; `gpt-realtime-mini` — $10/$20 per 1M characters; `gpt-realtime` — $32/$64 per 1M characters (+1 more rows); `gpt-4o-mini-realtime-preview` — $10/$20 per 1M characters; `gpt-4o-realtime-preview` — $40/$80 per 1M characters (+2 more rows); `whisper-1` — $0.006/min (+1 more rows); `gpt-4o-mini-tts` — $0.6/$12 per 1M characters; `tts-1-hd ` — $30/$0 per 1M characters; `tts-1` — $15/$0 per 1M characters

**Suno** (6): `Suno V5` — $0.12/call (+10 more rows); `Suno V5.5` — $0.12/call (+10 more rows); `Song Continuation` — $0.12/call (+1 more rows); `Generate Lyrics` — $0.012/call (+1 more rows); `Custom Mode` — $0.12/call (+1 more rows); `Automatic Mode` — $0.12/call (+1 more rows)

**Doubao** (4): `Recognize (Rapid Audio File Recognition)` — $0.015/min; `vc（Audio and video caption generation）` — $0.01/min (+1 more rows); `vc-ata（Automatic subtitle timing）` — $0.01/min (+1 more rows); `tts_hd（Text to Speech）` — $35.0/1M characters

**Dubbingx** (1): `TTS（Text to Speech）` — $40.0/1M characters (+2 more rows)

**Elevenlabs** (9): `Sound-Generation` — $0.06/call; `Audio-Isolation` — $0.3/minute; `Music（Music Generation）` — $0.01/Second; `Text-to-Dialogue（Create multi-person conversations）` — Free (+8 more rows); `Speech-to-text (Official Format)` — $0.01/min (+3 more rows); `Text-to-speech (official format)` — Free (+8 more rows); `TTS-Flash-v2.5` — $0.05/1000 characters (+1 more rows); `TTS-Multilingual-v2` — $0.1/1000 characters (+1 more rows); `Speech-to-text（Asynchronously fetch results）` — $0.05/minute (+1 more rows)

**Google** (3): `Text-to-Speech` — $40.0/One million characters; `gemini-2.5-pro-preview-tts` — 1M tokens; `gemini-2.5-flash-preview-tts` — 1M tokens

**Chanjing** (2): `cicada3.0` — $0.001/second (+4 more rows); `cicada1.0` — $0.0006/second (+4 more rows)

**Mureka** (7): `mureka-7.5` — $0.05/call (+3 more rows); `mureka-o1` — $0.2/call (+3 more rows); `mureka-6` — $0.015/call (+4 more rows); `Generate Lyrics from a Prompt` — $0.015/call; `Create Podcast Audio` — $0.0025/second; `Text-to-Speech` — $0.002/second; `Separate Music Stems` — Free (+1 more rows)

**Tongyi Wanxiang** (2): `Qwen3-TTS-Flash（Speech Synthesis）` — $15/$0 per 1M character; `Qwen-TTS (Speech Synthesis)` — $0.5/$2 per 1M tokens

**Topazlabs** (1): `Video enhancement to high definition` — $0.15=1Credits (+1 more rows)

**Stability** (2): `stable-audio-2.5` — $0.02/credits (+2 more rows); `stable-audio-2.0` — $0.02/credits (+1 more rows)

**WaveSpeed** (1): `Universal interface for video processing` — Same with Wavespeed (+1 more rows)

**ZHIPU** (2): `GLM-ASR-2512` — $0.025/M tokens; `GLM-TTS` — $0.03/1000 characters

### Data Processing — 86 SKUs · 23 brands

**General Interface** (1): `General Interface` — Charges based on the corresponding search provider

**Jina** (4): `Classify` — $0.02 PTC / 1M Token; `Grounding` — $0.02 PTC / 1M Token; `Search` — $0.02 PTC / 1M Token; `Reader` — $0.02 PTC / 1M Token

**Exa** (3): `Answer（回答）` — Return costDollars settlement by API
; `Exa（Contents）` — Settlement is based on the costDollars returned by the API; `Exa (Search)` — Settlement is based on the costDollars returned by the API

**Bocha AI** (2): `Ai-search` — $0.01/call; `Web-search` — $0.01/call

**302.AI** (34): `Link-to-Image` — $0.001/call; `PDF Translation` — The token consumed for translating the LLM model + 0.001PTC * the number of PDF pages translated (+1 more rows); `MiniCPM-V 4.5` — $1 /1M tokens
 (+1 more rows); `Dots.OCR` — $1/1M Tokens (+1 more rows); `LLMxMapReduce` — Refer to related model prices (+1 more rows); `LangExtract` — Calculate based on the price of model calls (+1 more rows); `Paper2Poster` — Refer to related model prices (+2 more rows); `Paper2Code` — Refer to related model prices (+2 more rows); `Parsing` — $0.02/1M tokens; `Upload-File` — $0.001/call; `Markitdown (File conversion to md format)` — $0.01/1M tokens; ` Get video data` — $0.001/call; `Zhihu Hot List` — $0.001/call
; `Get Zhihu AI search results` — $0.001/call
; ` Zhihu AI Search` — $0.001/call; `Virtual Machine Sandbox` — Sandbox runtime (seconds) * 0.001 PTC + Exporting sandbox files to the 302 file system (0.001 PTC/call) (+8 more rows); `Remote Browser` — 0.001 PTC/second + Model Invocation Fee (+2 more rows); `Retrieve WeChat Official Account articles` — $0.001/call
; `Bilibili Obtain Video Information` — $0.001/call; `Get subtitles from YouTube` — $0.001/call; `Static Sandbox` — $0.005/call; `Search_Video` — $0.001/call; `Youtube_Info` — $0.001/call; `Twitter_Post（X_Post）` — $0.001/call; `Tiktok search for videos` — $0.001/call
; `Xiaohongshu_Comments` — $0.01/call; `Xiaohongshu Note Retrieval` — $0.01/call (+2 more rows); `Xiaohongshu_Search` — $0.02/call (+2 more rows); `Dots.OCR` — 1M Tokens (+1 more rows); `Get the list of WeChat official account articles` — $0.01/call; `Admin Dashboard` —  Free (+7 more rows); `Douyin Video Search` — $0.001/call; `Weibo_Post` — $0.001/call; `Twitter_User（X_User）` — $0.001/call

**Search1API** (5): `Trending (Popular Trends)` — $0.001/call; `Sitemap（Site Map）` — $0.001/call; `Crawl` — $0.001/call; `News` — $0.001/call; `Search` — $0.001/call

**RSSHub** (1): `RSSHub` — $0.001/call

**Firefly card** (1): `saveImg（Card Generation）` — Free

**Youdao** (1): `Youdao（Youdao Translate）` — $8.0/1M characters

**Mistral** (1): `OCR（PDF Parsing)` — $0.002/page

**MetaSota Search** (3): `Chat（Question & Answer）` — $0.0005=1 point; `Reader（Web Searching）` — $0.0005=1 point; `Search` — $0.0005=1 point

**MinerU** (3): `MinerU-2.5` — $0.001/Page (+1 more rows); `MinerU Free Version` — Free (+1 more rows); `MinerU-2.0` — $0.001/Page (+1 more rows)

**Tavily** (2): `Extract` — $0.002/URL; `Search` — $0.01/call

**Glif** (1): `Glif` — $0.1/call

**Firecrawl** (6): `Search` — $0.005/call; `Scrape Errors` — Free; `Scrape Status` — Free; `Map` — $0.005/call; `Batch Scrape` — $0.005/page; `Scrape` — $0.005/page

**SerpApi** (8): `Search（Baidu）` — $0.005/call; `Search（Patents）` — $0.005/call; `Search（Scholar）` — $0.005/call; `Search（Videos）` — $0.005/call; `Search（Lens）` — $0.005/call; `Search（Images）` — $0.005/call; `Search（News）` — $0.005/call; `Search` — $0.005/call

**Doc2x** (1): `Doc2x v2` — $0.005/page (+3 more rows)

**ZHIPU Agent** (2): `Zhipu PPT` — $0.8/1M tokens (+1 more rows); `GLM-OCR Layout analysis` — $0.03/M Tokens

**Unifuncs** (2): `Web-Reader (Webpage Reading)` — $0.01 /call; `Web-Reader (Webpage Reading)` — $0.015/call

**SophNet** (2): `PaddleOCR-VL` — $0.002/call; `Document recognition` — 1M  character

**Doubao** (1): `doubao-seed-translation-250915` — $0.2/$0.6 per 1M  token

**Perplexity** (1): `Search` — $0.005/call

**Aminer** (1): `Aminer academic search` — $0.008/call (+27 more rows)

### RAG-related — 39 SKUs · 7 brands

**OpenAI** (3): `text-embedding-3-large` — $0.13/$0 per 1M tokens; `text-embedding-3-small` — $0.02/$0 per 1M tokens; `text-embedding-ada-002` — $0.1/$0 per 1M tokens

**Jina** (6): `jina-embeddings-v4` — 1M tokens; `jina-reranker-m0` — 1M tokens; `jina-embeddings-v3` — 1M tokens; `jina-colbert-v2` — 1M tokens; `Tokenizer` — Free; `jina-reranker-v2-base-multilingual` — 1M tokens

**China AI Model** (12): `BAAI/bge-m3` — $0.01/$0.01 per 1M tokens; `BAAI/bge-reranker-v2-m3` — $0.01/$0.01 per 1M tokens; `BAAI/bge-large-en-v1.5` — $0.01/$0.01 per 1M tokens; `BAAI/bge-large-zh-v1.5` — $0.01/$0.01 per 1M tokens; `qwen3-rerank` — 1M tokens; `bge-reranker-v2-m3` — 1M tokens; `bce-reranker-base_v1` — 1M tokens; `bce-embedding-base_v1` — 1M tokens; `Baichuan-Text-Embedding` — 1M tokens; `zhipu-embedding-2` — 1M tokens; `netease-youdao/bce-embedding-base_v1` — $0.02/$0.02 per 1M tokens; `netease-youdao/bce-reranker-base_v1` — $0.02/$0.02 per 1M tokens

**302.AI** (1): `Knowledge Base API` — Refer to LLM (+8 more rows)

**SiliconFlow** (6): `Qwen/Qwen3-Embedding-0.6B` — $0/$0.01 per 1M tokens; `Qwen/Qwen3-Reranker-0.6B` — $0/$0.01 per 1M tokens; `Qwen/Qwen3-Embedding-4B` — $0/$0.02 per 1M tokens; `Qwen/Qwen3-Reranker-4B` — $0/$0.02 per 1M tokens; `Qwen/Qwen3-Reranker-8B` — $0/$0.04 per 1M tokens; `Qwen/Qwen3-Embedding-8B` — $0/$0.04 per 1M tokens

**Google** (1): `gemini-embedding-001` — $0.15/$0.15 per 1M tokens

**Voyage** (10): `rerank-2.5` — $0.1/$0.1 per 1M tokens; `voyage-3-large` — $0.2/$0.2 per 1M tokens; `rerank-2.5-lite` — $0.05/$0.05 per 1M tokens; `voyage-context-3` — $0.2/$0.2 per 1M tokens; `voyage-code-2` — $0.2/$0.2 per 1M tokens; `voyage-law-2` — $0.2/$0.2 per 1M tokens; `voyage-finance-2` — $0.2/$0.2 per 1M tokens; `voyage-code-3` — $0.2/$0.2 per 1M tokens; `voyage-3.5-lite` — $0.05/$0.05 per 1M tokens; `voyage-3.5` — $0.1/$0.1 per 1M tokens

### Tools API — 88 SKUs · 16 brands

**AI Document Editor** (1): `AI Document Editor` — Refer to LLM (+1 more rows)

**AI 3D Modeling** (1): `AI 3D Modeling` — $0.01/call

**AI Search Master 3.0** (1): `AI Search Master 3.0` — 0.01 PTC/call + charge according to model price

**AI Podcast Production** (1): `AI Podcast Production` — Refer to LLM (+3 more rows)

**AI Writing Assistant** (1): `AI Writing Assistant` — Refer to LLM (+1 more rows)

**AI Video Deep Translation** (1): `AI Video Deep Translation` — $0.001/call (+6 more rows)

**AI Video Creation Hub** (1): `AI Video Creation Hub` — Refer to LLM (+3 more rows)

**AI Answer Machine** (1): `AI Answer Machine` — Charge based on the model price

**Web Data Extraction Tool** (1): `Web Data Extraction Tool` — Refer to LLM (+2 more rows)

**AI Prompt Expert** (1): `AI Prompt Expert` — Calculated based on the tokens used by the model (+3 more rows)

**AI Vector Graphics Generation** (1): `AI Vector Graphics Generation` — $0.01/call

**AI PPT Generator** (1): `AI PPT Generator` — $0.07/call

**Deploy web pages by one-click** (1): `Deploy web pages by one-click` — $0.001/call (+7 more rows)

**AI Avatar Maker** (1): `AI Avatar Maker` — Optimize the interface cost of tokens+avatars generated by prompts (+1 more rows)

**AI Card Generation** (1): `AI Card Generation` — Calculated based on the tokens used by the model (+3 more rows)

**AI Image Creative Station** (73): `Anime to Real Person` — Optimize tokens generated by prompts + image generation API costs; `Clothing Flat Lay` — Optimize tokens generated by prompts + image generation API costs; `3D Doll` — Optimize tokens generated by prompts + image generation API costs; `City in Toy Box` — Optimize tokens generated by prompts + image generation API costs; `MonsterLetter` — Optimize tokens generated by prompts + image generation API costs; `Fun Balloon` — Optimize tokens generated by prompts + image generation API costs; `Emotion Pastry` — Optimize tokens generated by prompts + image generation API costs; `Gold Coin` — Optimize tokens generated by prompts + image generation API costs; `Retro Sci-Fi Book Cover` — Optimize tokens generated by prompts + image generation API costs; `Succulent Planter` — Optimize tokens generated by prompts + image generation API costs; `Floral Sculpture` — Optimize tokens generated by prompts + image generation API costs; `Creative Drawstring Bag` — Optimize tokens generated by prompts + image generation API costs; `Glass Shard` — Optimize tokens generated by prompts + image generation API costs; `Creative Minimalist Ad` — Optimize tokens generated by prompts + image generation API costs; `Claw Machine` — Optimize tokens generated by prompts + image generation API costs; `Neon Graffiti` — Optimize tokens generated by prompts + image generation API costs; `FlowInk` — Optimize tokens generated by prompts + image generation API costs; `Rusty Iron Plate` — Optimize tokens generated by prompts + image generation API costs; `Frosted Glass Silhouette` — Optimize tokens generated by prompts + image generation API costs; `Custom Anime Figure` — Optimize tokens generated by prompts + image generation API costs; `Animal Landmark Selfie` — Optimize tokens generated by prompts + image generation API costs; `3D chromed badge` — Optimize tokens generated by prompts + image generation API costs; `Word and Graphic Fusion` — Optimize tokens generated by prompts + image generation API costs; `LEGO City Attractions` — Optimize tokens generated by prompts + image generation API costs; `Pin on T-shirt` — Optimize tokens generated by prompts + image generation API costs; `Nail Painting` — Optimize tokens generated by prompts + image generation API costs; `3D miniature shop` — Optimize tokens generated by prompts + image generation API costs; `Chibi-toolapi-style keychain` — Optimize tokens generated by prompts + image generation API costs; `Mini Tilt-Shift Landscape` — Optimize tokens generated by prompts + image generation API costs; `Fashion Magazine Cover` — Optimize tokens generated by prompts + image generation API costs; `Retro Promotional Poster` — Optimize tokens generated by prompts + image generation API costs; `Colorful Vector Art Poster` — Optimize tokens generated by prompts + image generation API costs; `Silhouette Art` — Optimize tokens generated by prompts + image generation API costs; `3D scroll miniature scene` — Optimize tokens generated by prompts + image generation API costs; `Plastic Garbage Bag` — Optimize tokens generated by prompts + image generation API costs; `AlphabetBox` — Optimize tokens generated by prompts + image generation API costs; `Original Product Image` — Optimize tokens generated by prompts + image generation API costs; `Brand Pill Chart` — Optimize tokens generated by prompts + image generation API costs; `Ultra-Realistic Figurine Image` — Optimize tokens generated by prompts + image generation API costs; `Cute Enamel Pin Image` — Optimize tokens generated by prompts + image generation API costs; `Fictional Tweet Screenshot Prompt Optimization` — Optimize tokens generated by prompts + image generation API costs; `Miniature 3D building` — Optimize tokens generated by prompts + image generation API costs; `Cloud Art` — Optimize tokens generated by prompts + image generation API costs; `Journal Notes` — Optimize tokens generated by prompts + image generation API costs; `Sticker Design` — Optimize tokens generated by prompts + image generation API costs; `Microscopic World` — Optimize tokens generated by prompts + image generation API costs; `CrystalBall` — Optimize tokens generated by prompts + image generation API costs; `LEGO Collection` — Optimize tokens generated by prompts + image generation API costs; `Ghibli` — Optimize tokens generated by prompts + image generation API costs; `Hand-drawn Style Infographic Card` — Optimize tokens generated by prompts + image generation API costs; `Character Dual Exposure` — Optimize tokens generated by prompts + image generation API costs; `3D stereoscopic model creation` — Optimize tokens generated by prompts + image generation API costs; `Clay Style Generation` — Optimize tokens generated by prompts + image generation API costs; `3D avatar pose generation` — Optimize tokens generated by prompts + image generation API costs; `Movable Doll Generation` — Optimize tokens generated by prompts + image generation API costs; `Change Character Age` — Optimize tokens generated by prompts + image generation API costs; `3D Relief Papercut Style Generation` — Optimize tokens generated by prompts + image generation API costs; `Chibi-style 3D character creation` — Optimize tokens generated by prompts + image generation API costs; `Blister Tablet Food Generation` — Optimize tokens generated by prompts + image generation API costs; `City Isometric View Generation` — Optimize tokens generated by prompts + image generation API costs; `Unfolded Ancient Book Miniature Scene Generation` — Optimize tokens generated by prompts + image generation API costs; `Isometric Miniature Scene Generation` — Optimize tokens generated by prompts + image generation API costs; `Sculpture Generation` — Optimize tokens generated by prompts + image generation API costs; `Typography` — Optimize tokens generated by prompts + image generation API costs; `Low Polygon` — Optimize tokens generated by prompts + image generation API costs; `Themed Keycap Scene Generation` — Optimize tokens generated by prompts + image generation API costs; `Passport Stamp Generator` — Optimize tokens generated by prompts + image generation API costs; `Product Model Image` — Optimize tokens generated by prompts + image generation API costs; `Physical Destruction Effect Card` — Optimize tokens generated by prompts + image generation API costs; `Visual Recipe` — Optimize tokens generated by prompts + image generation API costs; `English Word Flashcards` — Optimize tokens generated by prompts + image generation API costs; `Style Modification` — Optimize tokens generated by prompts + image generation API costs; `Basic Text-to-Image (Optional Prompt Optimization)` — Optimize tokens generated by prompts + image generation API costs

## App (工具) (`cate=tool`)

### Robots — 5 SKUs · 5 brands

**Chat-bot** (1): `Chat-bot` 🔥 — free

**Drawing-bot** (1): `Drawing-bot` 🔥 — free

**Knowledge Base-bot** (1): `Knowledge Base-bot` — free

**APP-bot** (1): `APP-bot` — free

**302 Media Studio** (1): `302 Media Studio` 🔥 — Depends on the specific model used

### Work Efficiency — 13 SKUs · 13 brands

**Model Arena** (1): `Model Arena` 🔥 — free

**AI Writing Assistant** (1): `AI Writing Assistant` — free

**AI E-Commerce Writing Assistant** (1): `AI E-Commerce Writing Assistant` — free

**AI Document Editor** (2): `Nano Banana MD` — Depends on the specific model used; `AI Document Editor` — free

**Nano Banana MD** (0)

**AI PPT Generator** (2): `Nano Banana PPT` — Depends on the specific model used; `AI PPT Generator` — free

**Nano Banana PPT** (0)

**AI Webpage Summary** (1): `AI Webpage Summary` — free

**AI Whiteboard** (1): `AI Whiteboard` — free

**AI Financial Information Assistant** (1): `AI Financial Information Assistant` — free

**AI Excel** (1): `AI Excel` — free

**AI Resume Creation** (1): `AI Resume Creation` — free

**AI Novel Writing** (1): `AI Novel Writing` — free

### Academic Related — 3 SKUs · 3 brands

**PDF Toolbox** (1): `PDF Toolbox` — free

**AI Patent Search** (1): `AI Patent Search` — free

**Al Answer Machine** (1): `Al Answer Machine` — free

### Image Processing — 20 SKUs · 20 brands

**3D Camera Stuido** (1): `3D Camera Stuido` — Depends on the specific model used

**Nano Banana Canvas** (1): `Nano Banana Canvas` — Depends on the specific model used

**GPT Image 2 Canvas** (1): `GPT Image 2 Canvas` — Depends on the specific model used

**AI Old-Photo Restoration** (1): `AI Old-Photo Restoration` — free

**AI E-commerce Scene Generation** (1): `AI E-commerce Scene Generation` — free

**AI Image Toolbox** (1): `AI Image Toolbox` 🔥 — free

**AI Image Translation** (1): `AI Image Translation` — free

**ID Photo Generation** (1): `ID Photo Generation` — free

**AI Avatar Maker** (1): `AI Avatar Maker` — free

**AI Talking Photo** (1): `AI Talking Photo` — free

**AI Red Pocket Cover Generation** (1): `AI Red Pocket Cover Generation` — free

**AI Virtual Try On** (1): `AI Virtual Try On` — free

**AI Vector Graphics Generation** (1): `AI Vector Graphics Generation` — free

**Image Arena** (1): `Image Arena` 🔥 — free

**AI 3D Modeling** (1): `AI 3D Modeling` — free

**Lora Style Creative Hub** (1): `Lora Style Creative Hub` — free

**ComfyUI Toolbox** (1): `ComfyUI Toolbox` — free

**AI drawing prompt word expert** (1): `AI drawing prompt word expert` — free

**AI Image Creative Station** (1): `AI Image Creative Station` — free

**AI Portrait Studio** (1): `AI Portrait Studio` — free

### Audio Related — 5 SKUs · 5 brands

**AI Voice Generator** (1): `AI Voice Generator` — free

**AI Music Production** (1): `AI Music Production` — free

**AI Podcast Production** (1): `AI Podcast Production` — free

**AI Voice Call** (1): `AI Voice Call` — free

**Voice Arena** (1): `Voice Arena` — free

### Video Related — 6 SKUs · 6 brands

**AI Video Creation Hub** (1): `AI Video Creation Hub` — free

**AI Video Generator** (1): `AI Video Generator` 🔥 — free

**AI Audio/Video Summarization** (1): `AI Audio/Video Summarization` — free

**AI Video Real-Time Translation** (1): `AI Video Real-Time Translation` — free

**AI Video Deep Translation** (1): `AI Video Deep Translation` — free

**Video Arena** (1): `Video Arena` — free

### Code Related — 4 SKUs · 4 brands

**AI Web Page Generator** (1): `AI Web Page Generator` — free

**AI Web Page Generator 2.0** (1): `AI Web Page Generator 2.0` — free

**Code Arena** (1): `Code Arena` — free

**Deploy web pages by one-click** (1): `Deploy web pages by one-click` — free

### Information Processing — 9 SKUs · 9 brands

**302 Search** (1): `302 Search` — Subject to the specific service and model used.

**AI Prompt Expert** (0)

**AI Search Master 3.0** (1): `AI Search Master 3.0` — free

**Web Data Extraction Tool** (1): `Web Data Extraction Tool` — free

**AI Prompt Expert 2.0** (0)

**AI Facts Proof** (1): `AI Facts Proof` — free

**AI Card Generation** (1): `AI Card Generation` — free

**AI Model Judge** (1): `AI Model Judge` — free

**AI Translate Master** (1): `AI Translate Master` — free

### Client — 4 SKUs · 4 brands

**Desktop Client** (0)

**iOS APP** (1): `iOS APP` — free

**Android APP** (0)

**AI Omni Toolbox** (1): `AI Omni Toolbox` 🔥 — free

### Not matched to a chip (brand/tag naming drift) — 4
- tool / Client /  Android APP: `Android APP`
- tool / Client / Open Source Client: `Desktop Client`
- tool / Information Processing / AI Prompt Expert 2.0	: `AI Prompt Expert 2.0	`
- tool / Information Processing / AI Prompt Expert : `AI Prompt Expert `
