# Canonical entity model — model-relay station (Router)

Date: 2026-09-09. Synthesis of the eight sweep reports in this directory
(`302-market`, `302-price`, `302-docs`, `302-console`, `302-help`, `openrouter`,
`siliconflow`, `our-router`) plus `docs/plans/2026-07-23-router-302-full-route-interaction-study.md`
and `docs/plans/2026-07-23-nebutra-router-forge-design.md` §5.

**Design rule**: 1:1 with 302.AI where 302 has a surface; converge on
OpenRouter / SiliconFlow only where those two agree with each other and 302 is
weaker (units, cache/batch price slots, spend-derived rate-limit tiers,
per-endpoint observability, error contract). Where 302's shape is demonstrably
broken (free-text price grammar, unnormalised brand names, tiers as duplicate
rows) the canonical model takes the OR/SF shape and keeps 302's *presentation*.

**Closure constraint** (`docs/architecture/2026-08-27-closure-phase.md`): no new
workspace packages, no new product nouns, no new infra categories. Every entity
below lands in an **existing** Prisma model, an **existing** package
(`packages/platform/router-supply`, `packages/platform/prepaid-wallet`,
`packages/commerce/{billing,metering}`, `packages/platform/db`), or an existing
app directory (`apps/router`). "missing" in the tables below means *no storage
or code exists yet* — not *a new package is authorised*. Names like "Wallet",
"Shelf", "Supply" are **internal vocabulary for existing modules**, not new
product nouns.

---

## 0. Conventions

### 0.1 Provenance legend

| Code | Source |
|---|---|
| `302m` | 302 market shell (`302-market.md`) |
| `302p` | 302 price table (`302-price.md`) |
| `302d` | 302 API docs / doc.302.ai (`302-docs.md`) |
| `302c` | 302 logged-in console (`302-console.md`) |
| `302h` | 302 help center (`302-help.md`) |
| `OR` | OpenRouter (`openrouter.md`) |
| `SF` | SiliconFlow (`siliconflow.md`) |
| `us` | already in our repo (`our-router.md` + schema read) |

### 0.2 Identity and money conventions (fixed here, once)

| Decision | Value | Why |
|---|---|---|
| Money unit of account | **1 credit = 1 USD**, `Decimal(10,4)` for balances, `Decimal(10,6)` for per-request cost | 302 `1 PTC = 1 USD` [302h]; OR `credits` = USD [OR]. Our `CreditBalance.balance Decimal(10,4)` and `RequestLog.cost Decimal(10,6)` already match. **Do not coin a token name** (no "PTC" clone) — closure forbids new product nouns; the field is `credits`. |
| Display currency | `USD \| CNY \| JPY \| RUB` display-only, FX table server-side | 302 precomputes ×7/×147/×78 at build and has two desynced controls [302p] — copy the switch, not the mechanism. Ours is a dead dropdown today [us]. |
| Price quotation unit | canonical `perMillionTokens` for token SKUs; everything else carries an explicit `unit` enum | 302's free-text `suffix` has ~35 spellings incl. `[object Object]` [302m,302p]; SF puts the unit in the *column header* per modality [SF]; OR switches the unit word per modality [OR]. |
| Model id | bare provider id, `/` and `:` allowed (`anthropic/claude-fable-5.1`, `Pro/BAAI/bge-m3`) | OR `author/slug[:variant]`, SF `vendor/Name`, 302 uses the raw id as the card title [302m]. Our `listing-catalog.ts` currently **filters out** ids containing `/`, `:`, `@` — that filter must go. |
| Slug | separate URL slug (`alias_name`) from the model id | 302 `alias_name` (`openai-gpt-6-astra`) vs `name` (`gpt-6-astra`) [302m]. Needed because ids contain `/`. |
| Time | store UTC; render in tenant TZ; daily quota resets at 00:00 **tenant** TZ | 302 resets at *browser* TZ [302h] — an anti-pattern; OR resets midnight UTC [OR]. |

---

## 1. Product / SKU

The shelf atom. One row per sellable thing: a chat model, a non-token endpoint
(image/video/TTS/search), or an app. 302 calls it `product` with
`product_type ∈ {api_model, api_service, tool}` [302m]; OR calls it `Model` and
splits the host into a separate `Endpoint` entity [OR]; SF has one flat `model`
with a `type` chip [SF].

**Canonical: `Sku`** — one table, discriminated by `kind`.

| Field | Type / enum | Source | Notes |
|---|---|---|---|
| `id` | cuid | — | internal |
| `slug` | string, unique, URL-safe | `302m` (`alias_name`) | detail route `/product/detail/{slug}` |
| `modelId` | string ≤128 | `302m`,`OR`,`SF` | the callable id; **not unique** across supply paths |
| `kind` | `MODEL \| SERVICE \| APP` | `302m` (`api_model \| api_service \| tool`) | chip label `[模型] [API] [应用]` |
| `displayName` | string | `OR` (`"Anthropic: Claude Fable 5.1"`) | 302 shows the raw id as title; OR shows `Author: Name`. Keep both fields, render id-first (302) with `displayName` as tooltip/detail hero. |
| `vendorId` | FK → `Vendor` | `302m` (`brand`), `OR` (`author`), `SF` (`vendor`) | see §1.1 |
| `hostId` | FK → `Vendor` (nullable) | `OR` (`provider` ≠ author) | who actually serves it. 302 conflates them (`SiliconFlow`, `PPIO`, `SophNet` are "brands") [302m] — **converge on OR**: author ≠ host. |
| `categoryKey` | enum, see §3.1 | `302m` (`tag`) | exactly one per SKU |
| `sceneTags` | string[] | `SF` (20-value 应用场景), `OR` (11-value `category`) | secondary facet; 302 has none |
| `description` | string (one-liner, i18n) | `302m` | 2-line clamp on card, full text in `title` |
| `introduction` | rich text / MD (i18n) | `302m` | detail "API Overview" |
| `inputModalities` | `text \| image \| file \| audio \| video`[] | `OR` (`architecture.input_modalities`) | 302 only has 5 boolean capability icons |
| `outputModalities` | `text \| image \| audio \| video \| embeddings \| rerank \| speech \| transcription`[] | `OR` | drives the modality tab counts on the shelf |
| `capabilities` | flags `{ thinking, functionCall, vision, audio, video, webSearch, structuredOutput, caching, batch, distillable }` | `302m` (`model_capabilities` 5 flags), `OR` (`supported_parameters`), `SF` (`支持功能`) | 302's five + OR's parameter-derived set |
| `supportedParameters` | string[] | `OR` | `tools, temperature, top_p, reasoning, response_format, …`; powers a real filter facet |
| `contextTokens` | int, nullable | `302m` (`context_length`), `OR`, `SF` | `0` means unknown → render `—`, never `0` |
| `maxOutputTokens` | int, nullable | `OR` (`top_provider.max_completion_tokens`), `SF` (`Max output`) | |
| `paramSizeB` | decimal, nullable | `SF` (`744 B`) | open-weight models only |
| `licenseName` | string, nullable | `SF` international (`MIT`) | |
| `releasedAt` | date | `302m` (`created_time`), `OR` (`created`), `SF` (`发布时间`) | |
| `knowledgeCutoff` | date, nullable | `OR` | |
| `status` | `NEW \| ACTIVE \| HOT \| DEPRECATED \| RETIRED` | `302m` (`is_hot`, Latest tab), `OR` (`expiration_date`, "Show deprecated"), `SF` (release-notes 7-day deprecation notice) | 302 has **no deprecation concept at all** — take OR/SF's. `NEW` is derived (`releasedAt` < 30d), `HOT` is curated. |
| `deprecatedAt` / `retiresAt` | datetime, nullable | `OR`,`SF` | drives the deprecation notice + migration hint |
| `replacedBySkuId` | FK, nullable | `OR` (deprecated cards carry the migration snippet) | |
| `coverImageUrl` / `videoUrl` | url | `302m` | brand key-visual; `video_url` on 60 SKUs |
| `docUrl` | url | `302m` (`api_doc_url`) | per-SKU deep link into docs — 302 does this on **every** price row too [302p] |
| `tryUrl` | url, nullable | `302m` (`jump_url_logged_in/out`) | apps only |
| `playgroundSupported` | bool | `302m` | gates the `Playground` button |
| `sortOrder`, `viewCount` | int | `302m` | tie-break on Latest |
| `visibility` | `PUBLISHED \| HIDDEN \| INTERNAL` | `302m` (`status` always `published`) | |
| `weeklyTokens` / `weeklyCalls` | bigint, nullable | `OR` (card shows `305B tokens`) | populates "Popular" honestly instead of 302's curated `is_hot`; **derive from our own `RequestLog`** |

**Where it lives today**: **missing as storage.** Closest:
- `apps/router/src/lib/listing-catalog.ts` — `ListingModel` computes
  `{publicModel, name, description, category, provider, context, inputPerMTok, outputPerMTok, routes[], routed, sellable, source}`
  at request time from models.dev ∩ engine inventory. This is the de-facto SKU today; it has no
  slug, kind, capabilities, modalities, status, or deprecation.
- `packages/ai/ai-providers/src/{catalog,meta,frontier}.ts` — model metadata source.
- Prisma `ModelConfig` (`model_configs`) — `modelName, provider(AIProvider), inputPricePerMillion, outputPricePerMillion, currency, isActive`. **This is the only persisted model row we have** and it is price-only.
- Prisma `Product` (`products`) exists but is the **ecommerce template model** (tenant-scoped, `price Decimal`, `inventory Int`). Do **not** overload it — a catalog SKU is platform-global, not tenant-scoped.

**Verdict**: the Sku table is the single biggest gap. Landing it means extending
`ModelConfig` (rename-free: add columns) or adding one table in
`packages/platform/db` — a schema change, not a new package.

### 1.1 Vendor (brand / author / host)

302 calls it `brand`, OR splits `author` (`/anthropic`) from `provider`
(`/provider/anthropic`), SF calls it `厂商`.

| Field | Type | Source | Notes |
|---|---|---|---|
| `key` | slug, unique | `OR` | **normalised** — 302 ships `Minimax` and `MiniMax` as two brands, `Kling可灵` vs `可灵`, `Baichuan Al` (typo), trailing-whitespace names [302m]. Do not copy that. |
| `displayName` (i18n) | string | all | |
| `role` | `AUTHOR \| HOST \| BOTH` | `OR` | lets SiliconFlow/PPIO/SophNet be hosts, not fake brands |
| `logoUrl` | url | `302m` (flyout brand cards) | |
| `description` | one-liner | `302m` | the flyout card's subtitle — the thing that makes the taxonomy read as a catalogue |
| `homepage`, `tosUrl`, `privacyUrl` | url | `OR` (`/providers` table) | |
| `headquarters` | ISO country | `OR` | trust column |
| `trainsOnPrompts` | bool | `OR` | trust column |
| `retentionPolicy` | `ZERO \| N_DAY \| RETAINS \| UNKNOWN` (+ `retentionDays`) | `OR` | also a request-time routing knob (`provider.zdr`) |
| `supportsByok` | bool | `OR` | |
| `skuCount` | int (derived) | `302m` (per-brand counts in the tree) | |

**Where it lives today**: `apps/router/src/lib/market-taxonomy.ts` holds a
hard-coded tag/brand tree; `ListingModel.provider` is a 19-value string enum.
No vendor table, no logos, no descriptions, no trust columns. **missing.**

---

## 2. Price

The hardest entity to get right. 302 stores the price as a **free-text string**
(`$0.0005=1 point`, `Sandbox runtime (seconds) * 0.001 PTC`) with ~35 unit
spellings and encodes tiers as duplicate rows with the condition buried in the
description [302p]. OR stores `pricing{}` as **USD-per-single-token strings** and
renders per 1M [OR]. SF stores CNY per M tokens with explicit
input-length and time-of-day tiers [SF].

**Canonical: `Price` (one row per SKU × unit × tier), numeric, never prose.**

| Field | Type / enum | Source | Notes |
|---|---|---|---|
| `skuId` | FK | — | |
| `supplyPathId` | FK, nullable | `OR` (price is per endpoint = provider×model) | null = list price |
| `component` | `INPUT \| OUTPUT \| CACHE_READ \| CACHE_WRITE \| CACHE_WRITE_1H \| REQUEST \| REASONING \| IMAGE_INPUT \| IMAGE_OUTPUT \| AUDIO_INPUT \| AUDIO_OUTPUT \| WEB_SEARCH \| INTERNAL` | `OR` (`pricing{}` has 15 keys), `302m` (`platform_cache_read_price`, `platform_cache_creation_price`) | 302 exposes cache price on **2 rows out of 3,695** in the price table but on the *detail hero* for served models — so the slot exists, it is just unpopulated. Take OR's full key set. |
| `unit` | enum: `TOKEN_1M \| CHARACTER_1M \| CALL \| IMAGE \| MEGAPIXEL \| SECOND \| MINUTE \| PAGE \| FRAME \| URL \| VOICE \| DAY \| GB_MONTH \| CREDIT_POINT` | `302p` (unit_enum, normalised), `SF` (`/张`, `/千字符 UTF-8`, `/个`), `OR` (`/hour`, `/second`, `characters`) | **This enum is the fix for 302's biggest data flaw.** Free text is forbidden. |
| `amount` | `Decimal(18,10)` | `OR` (they need 10 dp because they quote per single token) | quoted **per `unit`** |
| `currency` | `USD` (storage) | all | display FX at render |
| `tierKind` | `NONE \| CONTEXT_LENGTH \| INPUT_LENGTH \| TIME_OF_DAY \| VOLUME \| EFFORT \| RESOLUTION` | `302p` (`<272K` / `>272K`, `0<Token≤32K`, `-low/-medium/-high`), `SF` (`[0,32k)`, `2点～8点`) | **structured**, not a duplicate row with a prose note |
| `tierFrom` / `tierTo` | int / time, nullable | `SF` | e.g. `[0, 32000)`; time window `02:00–08:00` |
| `tierLabel` | string (i18n) | `302p` (`480P`/`720P`/`1080P`) | render as a badge + tooltip, **not** six stacked cells (SF anti-pattern) |
| `mode` | `REALTIME \| BATCH \| FLEX \| PRIORITY` | `OR` (`:batch` = 50 % off, `service_tier`), `SF` (batch = 50 % of realtime) | 302 has **no batch pricing at all** [302p] — converge on OR/SF. |
| `upstreamAmount` | Decimal, nullable | `302p` (`OpenAI Price` column — mislabelled, means *vendor list price*) | the trust device |
| `markup` | Decimal (1.0 = at-cost) | `302m` (`rate`: 1 ×2773, 1.1 ×113, 1.2, 1.5, 0.3/0.7/0.8) | renders 302's `Compare` column (`Original Price` / `Original Price＋10%`) as a computed value, not an enum string |
| `discountPct` | Decimal 0–1, nullable | `OR` (`pricing.discount`, `50% off` badge, `Discounted` facet) | |
| `freeQuota` | json, nullable | `SF` (`免费` models), `302p` (`FREE`, "限时免费") | `免费` must be a first-class value, not the string "Free" |
| `effectiveFrom` / `effectiveTo` | datetime | `SF` (price changes in release notes) | price history — OR charts it ("Price History", Effective vs Listed) |
| `note` | i18n text + `docUrl` | `302p` (every Description cell links to its Apifox page) | keep the per-row doc link |

**Derived, not stored** (OR's honesty device, worth copying once we have traffic):
`effectiveInputPrice` / `effectiveOutputPrice` = cache-hit-weighted actual paid
price, shown beside the listed price with a cache-hit-rate column [OR].

**Where it lives today**:
- `ModelConfig.inputPricePerMillion / outputPricePerMillion / currency` — two components, one unit, no tiers, no cache, no batch, no upstream, no markup. **partial.**
- `ListingModel.inputPerMTok / outputPerMTok` (runtime, from models.dev). **partial.**
- `packages/commerce/billing/src/money.ts` + `catalog/` — money helpers, plan catalog (subscription-shaped, not per-token). **adjacent.**
- `UsageLimitDefinition.overageRate Decimal(10,8)` — the only per-unit overage price slot in the schema. **adjacent.**
- Everything else: **missing.**

---

## 3. Catalog / Shelf

The public listing surface. 302's URL grammar is the thing to copy verbatim; the
filter/sort vocabulary is OR's.

### 3.1 Taxonomy

Three levels, exactly as 302 [302m, prior study §1.4]:

```
cate  = api | tool                      (product_type)
tag   = category                        (8 API + 9 App)
brand = vendor                          (33 under LLM, …)
```

`CategoryKey` enum (302's 8 API tags, kept 1:1 — these are *our* tags too because
`listing-catalog.ts` already has the same 11-value list in Chinese):

| key | zh | en | 302 SKUs |
|---|---|---|---|
| `llm` | 语言大模型 | LLM | 678 |
| `image_gen` | 图片生成 | Image Generations | 207 |
| `image_edit` | 图片处理 | Image Processing | 142 |
| `video_gen` | 视频生成 | Video Generation | 209 |
| `av_processing` | 音视频处理 | Audio-Video Processing | 90 |
| `data_processing` | 信息处理 | Data Processing | 86 |
| `rag` | RAG相关 | RAG-related | 39 |
| `tools_api` | 工具API | Tools API | 88 |

App tags (`cate=tool`): `robots, work_efficiency, academic, image_processing,
audio, video, code, information, client` [302m].

`Category` fields: `key`, `zh`/`en` label, `iconKey`, `colorToken`, `sortOrder`,
`skuCount` (derived), `brands[] {name, count, description, logo}` — the last one
is what makes 302's hover flyout read as a catalogue rather than a link list.

**Where it lives today**: `apps/router/src/lib/market-taxonomy.ts` (hard-coded
tree, `TOOL_TAXONOMY` rows all point at `http://localhost:3105`) +
`ListingModel.category` (11-value enum, labels already match). **partial —
in-code, not data; no brand descriptions or logos.**

### 3.2 Listing rules

| Rule | Value | Source |
|---|---|---|
| Public visibility | `visibility = PUBLISHED` **and** at least one healthy supply path | `302m` (`status: published`); ours already computes `sellable = catalog ∩ inventory` [us] |
| Page size | 20, infinite scroll, no page numbers | `302m` (hard-capped at 20) — SF uses `20/page` with numbered pagination [SF]; **prefer SF's numbered pagination** (deep-linkable), keep 20 |
| Dedup | one card per `(modelId, vendorId)`; multiple hosts collapse into the detail page's provider table | `OR` — 302 shows the same model 4× because aggregators are "brands" [302m] |
| Card price | show the **minimum** across tiers with a `starting from` suffix | `302m` — cheap, honest, no popover |
| Price block height | fixed `min-h` so cards align whether they show in/out or a single `Pricing:` line | `302m` |
| Freshness contract | badge stating price sync + availability filter | `SF` (`实时价格同步` `仅展示可用模型`) |

### 3.3 Filters and sort

| Facet | Type | Source | Ours |
|---|---|---|---|
| `q` keyword | substring over id + displayName + description | `302m`, `302p` (typeahead over ids, endpoint names, sidebar labels **and** description text) | partial (`?q=` inline filter) |
| `cate` / `tag` / `brand` | enum | `302m` | ✅ URL-synced already |
| output modality | tabs with live counts (`Text 429 · Image 50 …`) | `OR` | missing |
| input modality | checkbox multi | `OR` | missing |
| context length | range slider | `OR` | missing |
| input / output price | range slider, `FREE` at the low end | `OR` | missing |
| capabilities / supported params | checkbox multi (`tools`, `reasoning`, …) | `OR` | missing |
| scene tag | chip row | `SF` (20 chips) | missing |
| discounted / free | boolean facet | `OR`, `SF` (`免费`) | missing |
| show deprecated | boolean, default off | `OR` | missing |
| host / vendor | checkbox multi | `OR`, `SF` (vendor chips) | missing |
| data policy (ZDR, trains, region) | checkbox | `OR` | missing |
| **sort** | `new \| hot \| random \| price_asc \| price_desc \| created_asc` (302) ∪ `popularity \| context \| latency \| throughput \| released` (OR) | `302m`, `OR` | ours: price tri-state only; `热门` is faked as price-desc |
| view | `grid \| list` (302) / `list \| table` (OR) | both | ✅ grid/list exists, not URL-synced |

**Contract rule from OR worth adopting**: every UI facet is a query param that
the *public* `GET /v1/models` also accepts. 302 has this too
(`/api/cache/product-list?…`) — an unauthenticated JSON shelf endpoint.

**Where it lives today**: `apps/router/src/app/models/page.tsx` +
`components/models-catalog.tsx` — real URL-state for `cate/tag/brand/q/sort`,
no pagination (renders the whole list), a documented refetch race, and
`view` not persisted [us]. **partial.**

---

## 4. Endpoint families

The callable surface. 302's philosophy — *drop-in replacement + exclusive
suffix/param features* — is the single most reusable idea [302d].

### 4.1 Compatibility surfaces

| Family | Path | Auth header | Source | Ours |
|---|---|---|---|---|
| OpenAI chat | `POST /v1/chat/completions` | `Authorization: Bearer` | `302d`,`OR`,`SF` | ✅ allow-listed, proxied to New-API |
| OpenAI completions (legacy) | `POST /v1/completions` | Bearer | `302d` | ✅ |
| OpenAI Responses | `POST /v1/responses[/{id}[/cancel]]` | Bearer | `302d`,`OR` | ✅ |
| Anthropic messages | `POST /v1/messages`, `/v1/messages/count_tokens` | `x-api-key` **or** Bearer | `302d`,`OR`,`SF` | ✅ (both header forms) |
| Gemini raw | `POST /v1beta/models/{model}:generateContent` (+`streamGenerateContent`) | `x-goog-api-key` | `302d` | **missing** |
| Models list | `GET /v1/models[/{id}]`, `?llm=1\|0&include_custom_models=1` | Bearer | `302d`,`OR`,`SF` | ✅ (no query filters) |
| Model status / TTFB | `GET /v1/status?model=` | Bearer | `302d` | **missing** — cheap health signal per model |
| Embeddings | `POST /v1/embeddings` | Bearer | `302d`,`OR`,`SF` | ✅ |
| Rerank | `POST /v1/rerank` | Bearer | `302d` (also `/v1/reranks` — do **not** copy the plural inconsistency), `SF` | ✅ |
| Images | `POST /v1/images/{generations,edits,variations}` | Bearer | `302d`,`OR` | ✅ |
| Audio | `POST /v1/audio/{speech,transcriptions,translations}` | Bearer | `302d`,`SF` | ✅ |
| Realtime | `wss /v1/realtime?model=` | Bearer | `302d` | **missing** |
| Files | `POST/GET /v1/files` | Bearer | `SF` (302 has no `/v1/files` — it has `/302/upload-file`) | **missing** |
| Batch | `POST /v1/batches`, `GET /v1/batches/{id}`, `…/cancel` | Bearer | `SF` (302 has none) | **missing** |
| Video (async) | `POST …/video/create` → `GET …/video/fetch/{task_id}` | Bearer | `302d`,`SF` | **missing** |
| Codex sub-base | `POST /codex/v1/responses` (base `…/codex`) | Bearer | `302d` (priced at 30 % of list) | **missing** |

**Endpoint entity** (what the detail page's "API Reference" table renders,
1:1 with 302's `definition[]` [302m]):

| Field | Type | Source |
|---|---|---|
| `title` | i18n string (`Chat（聊天）`) | `302m` |
| `method` | `GET \| POST \| PUT \| DELETE` | `302m` |
| `path` | string, relative to base | `302m` |
| `stability` | `STABLE \| BETA \| DEPRECATED` (302: green 3389 / yellow 355) | `302m` |
| `docUrl` | url | `302m` |
| `family` | enum above | — |

**Ours**: `apps/router/src/app/api/v1/[...path]/route.ts` holds the allow-list
(9 families, 404 `unknown_endpoint` otherwise), and the PDP renders **2
hard-coded rows** (`Chat（聊天）`, `Chat（流式）`) with `稳定` stability [us].
So the *shape* exists as a placeholder; the data does not.

### 4.2 Cross-cutting conventions (adopt as contract)

| Convention | Rule | Source |
|---|---|---|
| **Feature = suffix ≡ param** | `model: "x-web-search"` is exactly equivalent to `{"web-search": true}`. Suffixes seen: `-web-search, -ocr, -deep-search, -fusion, -file-parse, -thinking`, combinable | `302d` — the single most reusable router idea |
| Variant grammar | OR's `:free :nitro :floor :exacto :online :thinking :extended :batch`, `~author/family-latest` alias, `@preset/slug` | `OR` |
| Paid-tier prefix | `Pro/<id>` = same weights, higher rate limit | `SF` |
| Async convention | `?run_async=true`, `?webhook=URL`, `GET …/fetch/{task_id}`; uniform task object `{task_id, status: pending\|processing\|completed\|failed, created_at/started_at/completed_at, execution_time, attempts, upstream_task_id, raw_response, *_url, *_urls[]}`; webhook: any 200 acks, retry 3× with 2·N s backoff | `302d` |
| Model-name tolerance | case-insensitive, `-`/`_` interchangeable, legacy suffixes tolerated | `302d` |
| Base-URL story | "replace `api.openai.com` with `router.…`"; one sub-base per non-OpenAI format | `302d` (but **fix** the `/v1` vs `/v1/chat/completions` inconsistency 302's own docs suffer from [302h]) |
| Request tracing | response header `request-id` → `GET /dashboard/record/{id}` returns `{cost, input_token, output_token, model, process_time}` | `302d` — ours already echoes `x-request-id` |
| Error envelope | `{error:{code:<HTTP status>, message, type/metadata{error_type, provider_name, model_slug}}}` with a documented `error_type` enum (OR ships 29 values) | `OR` (302 has 5 mixed envelope shapes — anti-pattern) — ours already mirrors OpenAI's `{error:{message,type}}` |
| Zero-completion insurance | not billed when `completion_tokens == 0` with blank finish reason, or `finish_reason == "error"` | `OR` |
| Usage payload | OpenAI `{prompt_tokens, completion_tokens, total_tokens}` + `prompt_tokens_details{cached_tokens, cache_write_tokens, audio_tokens}` + `completion_tokens_details{reasoning_tokens, …}`; Anthropic `{input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens}` | `302d`,`OR`,`SF` | ours parses both OpenAI + Anthropic shapes already [us] |

---

## 5. Supply

Internal only — the customer never picks a supply class (forge design §5.2/§5.7).
Three kinds, the third **interface-only** per the task brief.

### 5.1 `SupplyEngine`

| Field | Type / enum | Source | Ours |
|---|---|---|---|
| `id` | `newapi \| cliproxyapi \| sub2api \| official` | `us` (`SupplyEngineKind`) | ✅ `packages/platform/prepaid-wallet/src/router-adapter-types.ts` |
| `label`, `internalUrl`, `adminToken` | string / secret | `us` | ✅ `router-supply/src/engines.ts` (`loadEnginesFromEnv`) |
| `class` | `A_OFFICIAL_KEY \| B_ACCOUNT_RELAY \| C_PARTNER_CAPACITY` | forge §5.2 | ✅ header `X-Nebutra-Supply-Class: A\|B\|C` in `resolve.ts` |
| `status` | `healthy \| degraded \| down` + `latencyMs` + `detail` | `us` | ✅ `/api/admin/v1/supply/engines` |

### 5.2 Kind 1 — upstream API relay (class A: provider key)

| Field | Type | Source | Ours |
|---|---|---|---|
| `provider` | `OPENAI \| ANTHROPIC \| GOOGLE \| SILICONFLOW \| CUSTOM` | `us` (`AIProvider` enum) | ✅ Prisma `AIProvider` |
| `baseUrl`, `credentials` (envelope-encrypted) | string / json | `302c` (Custom Model: API Base URL + key "securely encrypted") | ✅ `TenantProviderKey.credentials` + `@nebutra/vault` |
| `apiFormat` | `OPENAI \| CLAUDE \| GEMINI` | `302c` (Custom Model `API Format`) | **missing** |
| `alwaysUse` | bool ("never fall back to platform key") | `OR` (BYOK "Never use shared capacity") | ✅ `TenantProviderKey.alwaysUse` |
| `forwardRegion` | `HK \| SG \| US_EAST \| CUSTOM_PROXY` | `302c`,`302h` (`代理地址:端口:用户名:密码`) | **missing** |
| `backupModel` | string | `302c` | **missing** |
| `relayFee` | `0.05 credits/day per key` | `302h` (custom-model relay is a **billable line item**) | **missing** |
| `lastTestedAt` | datetime + a `Check` action | `302c` (【检查】 button) | ✅ field exists, no action |

### 5.3 Kind 2 — account relay (class B: OAuth/subscription capacity)

| Field | Type | Source | Ours |
|---|---|---|---|
| `id` | auth-file id | `us` | ✅ `/api/admin/v1/supply/accounts` |
| `provider` | `codex \| antigravity \| anthropic \| gemini \| kimi \| xai` | `us` (`login.ts`) | ✅ |
| `account` | email / display name | `us` | ✅ |
| `status` | `healthy \| expired \| disabled \| unknown` | `us` | ✅ |
| `lastUsed`, `requests` | datetime / int | `us` | ✅ |
| `PendingLogin` | `{state, provider, url, status: wait\|ok\|error, callbackHost, startedAt, startedBy}` | `us` | ✅ but **in-memory** (lost on restart, not shared across instances) |

This is the most complete part of our repo and has **no 302 analogue** — 302's
"Custom Model" is BYO-key only. Keep it internal.

### 5.4 Kind 3 — partner capacity (class C) — **interface only**

Per the brief, define the contract and stop. Peer New-API-compatible stations
and OpenAI-compatible partners.

```ts
interface PartnerCapacity {
  id: string;
  label: string;
  baseUrl: string;              // OpenAI-compatible
  credentialRef: string;        // vault ref, never inline
  models: string[] | "*";
  priority: number;             // lower = preferred
  healthProbe: { path: string; intervalMs: number };
  balanceProbe?: { path: string };   // forge §5.2: "health + balance probes required"
  status: "healthy" | "degraded" | "down" | "unfunded";
}
```

No storage, no UI, no admin action. `resolveUpstreamChain()` already returns a
priority list — class C slots into it when a real partner exists.

### 5.5 `SupplyPath` (the route: SKU × engine × upstream model)

| Field | Type | Source | Ours |
|---|---|---|---|
| `skuId` / `publicModel` | FK / string | `us` | ✅ alias table |
| `engineId` | FK | `us` | ✅ |
| `upstreamModel` | string | `us` | ✅ |
| `priority` | int (wildcard `*` = 1000) | `us` | ✅ `parseAliasTableJson(NEBUTRA_MODEL_ALIASES)` |
| `pricingOverride` | FK → Price | `OR` (price is per endpoint) | **missing** |
| `latencyP50/P90`, `throughputTps`, `uptime5m/30m/1d` | metrics | `OR` (`/endpoints` API), `302m` (Analytics tiles: Success Rate / First Byte / Throughput / Avg Total Time) | **missing** — PDP shows the placeholder "运行探针…当前无上报数据" |
| `quantization` | `int4 … fp32 \| unknown` | `OR` | **missing** |
| `supportsToolChoice`, `supportsImplicitCaching` | bool | `OR` | **missing** |

**Routing knobs the request can pass** (OR's `provider{}` object — the whole
value proposition of a relay): `order[], only[], ignore[], allow_fallbacks,
require_parameters, data_collection: allow|deny, zdr, quantizations[],
sort: price|throughput|latency, max_price{prompt, completion, request, image}`.
Plus `models[]` as an explicit fallback array. **All missing.** Ours has
`proxyChatCompletions()` with fallback on 408/409/425/429/5xx — real, but
**unused by the app** (the edge proxies raw to New-API).

**Where it lives today**: `packages/platform/router-supply/src/{alias,engines,
inventory,proxy,resolve}.ts` + `apps/router/src/lib/supply/*` + `infra/nebutra-router`.
**mostly real** — the strongest area of the repo.

---

## 6. Customer

### 6.1 User

| Field | Source | Ours |
|---|---|---|
| `id`, `email`, `name`, `avatarUrl` | `302c` (User Settings) | ✅ Prisma `User` |
| `phone` + verified | `302h` ($1 trial credit gated on phone binding; SF: phone is the primary login) | partial |
| `password` / passkey / OAuth | `302c`, `SF` (WeChat login), `OR` (passkey) | ✅ `AuthAccount`, `BAPasskey` |
| `locale` | `zh-CN \| en \| ja \| ru` | `302c` | ✅ 37 message files |
| `displayCurrency` | `USD \| CNY \| JPY \| RUB` | `302c`,`302p` | ✅ field-less UI state only — **not persisted** |
| `referralCodeBound` | string | `302c` | ✅ `Referral.code` |
| `resourceStorageRegion` | `OVERSEAS \| CN` | `302c` | **missing** |
| `kycStatus` | `NONE \| PERSONAL \| ENTERPRISE` | `302c` (Identity Verification), `SF` (**mandatory** since 2026-05-15) | **missing** — but it gates enterprise discount (302: 10 % off) and, on SF, all usage |

### 6.2 Organisation / sub-account

Two different shapes in the wild:

- **302**: main account → *sub-accounts*, generated logins `<10 digits>@sub.302ai`,
  bulk create (`Quantity`, ≤200 per batch), roles `Regular User | Administrator`,
  **9 module permission switches** (Online Applications, API, Agent, MCP Server,
  Custom Models, Custom APIs, Developer⚠, Wallet⚠, Team Management⚠), and
  Total/Monthly/Daily quota per sub-account. Three modules (Developer, Wallet,
  Team) *share data* with the main account. Free. [302c, 302h]
- **OpenRouter**: Organization (≤10 members, roles Admin/Member, shared credit
  pool) → **Workspaces** (isolated keys, guardrails, BYOK, presets, budgets) →
  Guardrails (assigned to members and/or keys, strictest wins). [OR]
- **SiliconFlow**: no teams at all in the public docs. [SF]

**Canonical: keep our existing two-level `Organization → Tenant` and express
302's sub-account as an org member with a scoped key**, rather than inventing a
third identity type (closure: no new product nouns).

| Entity | Fields | Source | Ours |
|---|---|---|---|
| `Organization` | `id, name, slug, plan` | `OR`,`302c` | ✅ Prisma `Organization` |
| `OrganizationMember` | `userId, organizationId, role: OWNER\|ADMIN\|MEMBER\|VIEWER` | `OR` (Admin/Member), `302c` (普通用户/管理员) | ✅ Prisma `Role` enum — richer than both |
| `Tenant` | `id, kind, organizationId?, userId?, lifecycleState` | forge §5 (tenant = billing subject) | ✅ Prisma `Tenant` + `resolveSessionTenantId` (org tenant else personal) |
| module permissions | 9 boolean switches, "未开启的功能将对其隐藏" (hide, not disable) | `302c`,`302h` | **missing** — closest is `@nebutra/permissions` (CASL) which can express it without a schema change |
| per-member spend budget | `limit_usd` × `daily\|weekly\|monthly\|lifetime`, strictly decreasing, 403 on breach | `OR` | **missing** |
| bulk provisioning | `Quantity` stepper, ≤200 | `302c` | **missing** |
| `PlatformStaff` | `role: PLATFORM_OWNER\|OPERATOR\|SUPPORT\|READONLY`, tombstoned revocation | `us` (no 302/OR analogue) | ✅ — used by the supply admin contract |

---

## 7. Key

The single best-specified entity across all three sites; they broadly agree.

| Field | Type / enum | Source | Ours |
|---|---|---|---|
| `id` | cuid | — | ✅ `APIKey.id` |
| `name` | string ≤64, **required** | `302c`,`OR` | ✅ |
| plaintext format | `sk-` + 48 alnum (302) / `sk-or-v1-…` (OR) / `sk-…` (SF) | all | ✅ `sk-sailor-` + 64 hex |
| `keyHash` | sha256 hex, unique | `us` | ✅ |
| `keyPrefix` | first 12 chars; masked display `sk-xxx******xxxxxx` | `302c` | ✅ field; masking format not implemented |
| shown once | one-time reveal banner + copy | `302c`,`OR` | ✅ (`仅显示一次 · 请立即保存`) |
| `tenantId` / `workspaceId` | FK | `OR` | ✅ tenant-scoped |
| `scopes` | string[] (`models:*`, `tools:*`) | `us` | ✅ `prepaid-wallet/src/scopes.ts` |
| `status` | ON/OFF inline switch; **disable is reversible (30 s), delete is permanent** | `302c`,`302h` | partial — revoke only, no disable |
| `expiresAt` | datetime + presets `Eternal \| 1 Month \| 1 Day \| 1 Hour` | `302c`,`OR` (`expires_at`) | ✅ column, **no UI, not settable** |
| `quotaTotal` | credits, with an **Unlimited ON/OFF switch** | `302c` (`limit_cost`), `OR` (`limit`) | **missing** |
| `quotaDaily` | credits, Unlimited switch, resets 00:00 | `302c` (`limit_daily_cost`) | **missing** |
| `limitReset` | `daily \| weekly \| monthly \| null` | `OR` | **missing** |
| `rateLimitRps` | int 1–10000 | `us` | ✅ column default 10; gateway `CreateApiKeySchema` accepts it; **Router UI does not** |
| `allowSaveLogs` | bool (per-key request-log capture, opt-in) | `302c`,`302d` | **missing** |
| `allowManageKey` | bool (this key may call the admin API) | `302d` | **missing** |
| `allowCustomModel` | bool (custom-model relay, billed 0.05/day) | `302c`,`302d` | **missing** |
| `includeByokInLimit` | bool | `OR` | **missing** |
| `ipWhitelist` / `refererWhitelist` | cidr[] / string[] | *neither 302 nor OR nor SF has this* | **missing** — the task names it; the nearest real precedent is OR's Guardrails (model/provider allowlist, regex) and 302's `Request IP` log column. Model it as a `KeyPolicy` json, not a new table. |
| `modelAllowlist` / `providerAllowlist` | string[] | `OR` (Guardrails) | **missing** |
| derived | `lastUsedAt`, `usage`, `usageDaily/Weekly/Monthly`, `byokUsage`, `limitRemaining`, `dailyCost/monthlyCost/totalCost` | `302c` (the uniform table trio), `OR` | `lastUsedAt` ✅ column; the cost trio **missing** |

**Where it lives today**: Prisma `APIKey` + `packages/platform/prepaid-wallet/src/{api-key,scopes}.ts`
+ `apps/router/src/lib/router-keys.ts` (hash lookup, 60 s cache) +
`backends/gateway/src/routes/ai/api-keys.ts` (which already supports
`scopes, rateLimitRps, expiresInDays`, `PATCH`, `lastUsedAt`, Redis invalidation
— **the Router UI just doesn't call it**). **real but under-exposed.**

---

## 8. Wallet / Ledger

Prepaid, no subscription required (forge §5.5; 302 "0月费、按用量付费" [302h];
SF prepaid CNY; OR prepaid credits).

### 8.1 `Wallet` (balance)

| Field | Type | Source | Ours |
|---|---|---|---|
| `tenantId` | FK, unique | — | ✅ `CreditBalance.tenantId` |
| `balance` | `Decimal(10,4)` credits | `302c` (2 dp display, 6 dp costs), `OR` | ✅ `CreditBalance.balance` |
| `currency` | `USD` | all | ✅ |
| `giftBalance` / `voucher` | separate bucket, **not withdrawable, never refundable** | `SF` (代金券 replaced 赠送余额 2025-12), `302c` (`FREE` column on bill rows), `302h` (gifted PTC never refundable) | **missing** — a second bucket, consumed first |
| `expiresAt` | nullable | `302h` ("永久有效，永不过期"), `OR` ("credits may expire after 1 year") | ✅ `CreditTransaction.expiresAt` exists |
| `lowBalanceAlert` | `{enabled, threshold, channel: EMAIL\|SMS}` | `302c` (Balance Alarm modal), `OR` (Low Balance, default $100) | **missing** |
| `autoTopUp` | `{enabled, threshold ≥1, amount ≥5, paymentMethodId}` — **waives the top-up fee** | `302h` (Stripe, min amount $5, min threshold $1), `SF` (支付宝自动充值, ≤¥2,000/笔, ≤¥6,000/日, ≤¥100,000/月, threshold ¥5–1,000) | **missing** |

### 8.2 `LedgerEntry` (every balance movement)

| Field | Type / enum | Source | Ours |
|---|---|---|---|
| `type` | `PURCHASE \| USAGE \| REFUND \| ADJUSTMENT \| EXPIRATION \| BONUS` | `us` | ✅ `CreditTransactionType` — exactly the enum 302's bill table implies |
| `amount`, `balanceAfter` | `Decimal(10,4)` | `302c` (`Amounts: + 20 PTC`) | ✅ |
| `description` | string | `302c` (`Note`: "Top up 20 PTC", "new user init") | ✅ |
| `relatedId` | payment / usage id | `302c` (`Order ID`) | ✅ |
| `expiresAt` | datetime | `SF` (vouchers) | ✅ |
| idempotency | unique `(balanceId, type, relatedId)` | `us` | ✅ |

### 8.3 `TopUpOrder` (recharge)

| Field | Type / enum | Source | Ours |
|---|---|---|---|
| `orderNo` | 18-digit numeric | `302c` (`202608250100100925`) | ✅ `Payment.id` / `Invoice.number` |
| `packageAmount` | preset `5 \| 20 \| 50(Recommend) \| 100 \| 200(Most Popular) \| 500 \| 1000` USD, or custom `1–2000` | `302c` | **missing as data** (Router has mock presets `+5 +10 +25 +50 +100`) |
| `minimum` | `$5` | `302h` (EN FAQ) | **missing** |
| `paymentChannel` | `CARD_1 \| CARD_2 \| USDT \| ALIPAY \| WECHAT \| YOOMONEY \| SBERPAY \| TBANK \| BANK_TRANSFER \| CRYPTO` | `302c`, `SF` (支付宝/微信/对公转账), `OR` (card/crypto) | partial — `PaymentMethodType` enum + `packages/commerce/billing` providers (Stripe/Polar/LemonSqueezy/**ChinaPay**/Manual) |
| `feeFormula` | `amount × pct + fixed`, shown **in the method chooser** | `302c` (Card1 4 %+$0.3, Card2 6 %+$0.3, USDT 1.3 %, Alipay 3.4 %+$0.5, RU 17 %), `OR` (5.5 % card / 5 % crypto, min $0.80) | **missing** — this is the honest-pricing device; copy it |
| `grantedCredits` / `bonusCredits` | Decimal | `302c` (`Value` / `FREE` columns) | **missing** |
| `status` | `PENDING \| SUCCEEDED \| FAILED \| REFUNDED` | all | ✅ `Payment.status` |
| channel limits | e.g. online ≤ ¥100k/txn; corporate transfer ≤ ¥100M, needs enterprise KYC + same-name account | `SF` | **missing** |

### 8.4 `Invoice`

| Field | Source | Ours |
|---|---|---|
| `number, status, subtotal, tax, total, amountPaid, amountDue, currency, dueDate, paidAt, invoicePdf, hostedInvoiceUrl, billingReason` | `us` | ✅ Prisma `Invoice` + `InvoiceItem` — **richer than 302**, which has no self-serve invoice at all (manual, via account manager WeChat) [302h] |
| CN 数电发票 fields: `申请开票金额 · 费用名称 · 抬头名称和税号 · 发票类型(增值税专用\|普通) · 接收方式`; **only consumed amounts are invoiceable**; 2 working days | `SF` | **missing** — the fields are the gap, not the table |
| refund window | non-refundable except platform-caused abnormal consumption; claim within **7 working days**, audit **3 working days**, payout **1–7 working days**, original channel only; gifted credits never refundable; credits cannot be withdrawn/transferred/gifted | `302h` (refund-policy page) | **missing as policy page**; `CreditTransactionType.REFUND` exists |

### 8.5 Payout / revenue (developer side)

302 has a whole second money direction: `Withdraw` (10 % fee, 7 business days,
bank fields incl. SWIFT, `Amount Received · Withdrawal Amount · Fee · Currency ·
Exchange Rate · Method · Order Number · Status`), `Developer > stats`,
`Pay with 302` merchant checkout (`price` in **cents**, HMAC-SHA256 signature)
[302c, 302d]. **Out of scope for parity** — record it here so it is a deliberate
omission, not an oversight.

**Where it lives today**: `CreditBalance` / `CreditTransaction` /
`Invoice` / `InvoiceItem` / `Payment` / `PaymentMethod` / `StripeCustomer` are
all real Prisma models with a real `packages/commerce/billing`. The Router
console instead uses `MemoryPrepaidWallet` seeded 25 USD on a hard-coded
`"demo"` tenant, and `POST /api/v1/wallet/topup` is an **unauthenticated public
mutation** reachable at `/v1/wallet/topup` [us]. The adapter that bridges them
(`createCreditLedgerWallet`) exists and **is never instantiated**. This is the
largest "already built, not wired" gap in the repo.

---

## 9. Usage / Log

Two grains, both present in all three sites; keep both.

### 9.1 `UsageRecord` (per request — the billing atom)

| Column | Type | Source | Ours |
|---|---|---|---|
| `requestId` | uuid, echoed as a response header | `302d`,`us` | ✅ |
| `occurredAt` | datetime | `302c` (`Time`) | ✅ |
| `tenantId`, `userId`, `apiKeyId` | FK | `302c` (`Type = API (<key name>)`) | ✅ |
| `subjectType` | `API_KEY \| BOT \| AGENT \| MCP \| SUB_ACCOUNT` | `302c` (`Type` column) | **missing** (we have only API) |
| `model` | string | all | ✅ |
| `supplyPath` / `provider` | string | `us` (`x-oneapi-channel`), `OR` (`provider_name`, `endpoint_id`) | ✅ `UsageLedgerEntry.metadata.supplyPath` |
| `promptTokens`, `completionTokens`, `totalTokens` | int | all | ✅ |
| `cacheCreationTokens`, `cacheReadTokens` | int | `302c` (dedicated columns!), `OR` | **missing as columns** (parsed, not stored) |
| `reasoningTokens` | int | `OR`,`SF` | **missing** |
| `nativeTokens*`, `numMediaPrompt/Completion`, `numSearchResults` | int | `OR` (`/generation`) | **missing** |
| `unit` + `quantity` | enum + bigint (for non-token SKUs) | `302p` unit enum | ✅ `UsageLedgerEntry.{unit, quantity}` (unit is free `VarChar(32)` — should take the §2 enum) |
| `customerCharge` | `Decimal(10,6)` credits | `302c` (`Cost 0.046969 PTC`) | partial — `RequestLog.cost` yes; `UsageLedgerEntry.totalCost` yes; **the Router edge writes neither** |
| `supplyCost` | `Decimal(10,6)` | forge §5.5 (engine usage = cost basis) | ✅ contract only (`usage-envelope.ts`), no producer |
| `isByok` | bool | `OR` | **missing** |
| `status`, `latencyMs`, `firstByteMs` | int | `302c` (`Duration/First Byte`), `OR` | partial (`latencyMs` ✅, `firstByteMs` missing) |
| `finishReason`, `streamed`, `cancelled` | string / bool | `OR` | **missing** |

### 9.2 `RequestLog` (per-request payload capture — opt-in)

302 gates this behind the key's `Save Logs` flag and shows it in a per-key
drawer: `Request ID · Time · Path · Duration/First Byte · Input/Output ·
CacheCreation/CacheRead · Cost · Request IP · Request Body · Response Body`
[302c]. OR ships it as `/logs` (beta, retention ≥3 months) separate from usage
[OR]. **Copy 302's opt-in gate** — capturing bodies by default is a privacy
liability.

| Field | Source | Ours |
|---|---|---|
| `requestIp`, `requestBody`, `responseBody`, `path` | `302c` | **missing** |
| retention | ≥3 months (OR); 302 unspecified | **missing** |
| export | CSV, per-key and account-wide | `302c` (`Export`), `OR` | **missing** |

### 9.3 Aggregates (what the dashboard renders)

302's `/dashboard/overview` is six ECharts panels, each with a `Total:` header:
App Cost Distribution · App Call Times Ratio · Model Cost Distribution · Model
Call Times Ratio · Channel Consumption Distribution · Channel Consumption Ratio,
filtered by `Account Type · Range Time (minute precision) · Time Particle Size`
[302c]. OR's `/activity` groups by date × model × provider × key [OR].

**Ours**: `backends/gateway/src/routes/ai/usage.ts` already implements
`/summary`, `/by-model`, `/by-key`, `/history?granularity=hour|day` over
`RequestLog` — **and the Router never calls them** [us].

### 9.4 The ledger split — must be resolved

Router edge → `UsageLedgerEntry` (`source: API, type: AI_TOKEN, unit: token`, **no cost**).
Gateway relay → `RequestLog` (tokens **+ `cost` Decimal**) → the usage
aggregates. Two ledgers, no join, and the customer-facing 用量 page needs one of
them to carry cost per request [us, open question 1]. **Decision required before
any 用量 surface is built.**

---

## 10. Quota / RateLimit

Three different philosophies; take 302's *vocabulary* and SF's *tiering*.

### 10.1 Spend quota (302's model — copy verbatim)

The same triple appears on **five** objects (key, bot, agent, MCP server,
sub-account): `Total Quota` / `Monthly Quota` / `Daily Quota`, each an
**"Unlimited" ON/OFF switch that enables a credits input**; daily resets at
00:00; unlimited means "limited only by account balance" [302c, 302h].
One mental model, five reuses — that is the pattern.

| Field | Type | Source | Ours |
|---|---|---|---|
| `scope` | `TENANT \| KEY \| MEMBER \| SUB_ACCOUNT` | `302c`,`OR` (workspace budgets) | **missing** |
| `totalLimit` / `monthlyLimit` / `dailyLimit` | Decimal credits, nullable = unlimited | `302c` | **missing** |
| `resetAt` | derived | `302c` (00:00 browser TZ — use **tenant** TZ), `OR` (midnight UTC / Monday / 1st) | **missing** |
| `strictlyDecreasing` | invariant: a child budget may not exceed its parent | `OR` | **missing** |
| breach behaviour | `402` on insufficient balance / key limit; `403` on guardrail breach | `OR`,`SF` (402 账户欠费) | partial — `insufficient_credits` error code exists |

### 10.2 Throughput limits

| Metric | 302 | OR | SF | Ours |
|---|---|---|---|---|
| RPM / RPH / RPD | *claims "No TPM or concurrency limits for any user"* [302h] | 20 req/min free variants; 50 req/day (<$10 lifetime) → 1,000 req/day (≥$10) | RPM 1,000–10,000 (chat), 2,000–10,000 (embedding) | `APIKey.rateLimitRps` (per-second, enforced in the gateway pipeline) |
| TPM / TPD | — | — | 50k–5M / tiered | **missing** |
| IPM / IPD (images) | — | — | 2 / 400 | **missing** |
| Tier driver | — | lifetime purchases | **`max(last calendar month spend, month-to-date spend)` → L0–L5** at ¥50 / 200 / 2,000 / 5,000 / 10,000 | **missing** |
| 429 body | `RateLimitExceeded` + `Retry-After` | `error.code 429`, `error_type: rate_limit_exceeded`, `Retry-After`, `X-RateLimit-*` | `"Request was rejected due to rate limiting."` | error envelope ✅, headers **missing** |

**Recommendation**: publish SF's spend-derived tier ladder with our own numbers
and OR's header contract. 302's "no limits" claim is a marketing position we
cannot honour and should not copy.

**Where it lives today**: `packages/commerce/metering/src/quota-enforcement.ts`,
Prisma `UsageLimitDefinition` (`key, unit, resetPeriod: monthly|daily|never,
overageRate`) + `PlanUsageLimit` + `CustomerUsageLimit` — a full plan-shaped
quota system that **the Router does not use**. `APIKey.rateLimitRps` is the only
live enforcement. **real but unwired.**

---

## 11. Notification

| Kind | Trigger | Channels | Source | Ours |
|---|---|---|---|---|
| Low balance | `balance < threshold` (OR default $100) | Email / SMS / in-app | `302c` (Balance Alarm: enable, threshold, method), `OR` | **missing** |
| Budget breach | 80 % / 100 % of workspace budget | Email / Slack / webhook | `OR` | **missing** |
| Key spend limit | per-key limit reached | Email | `OR` | **missing** |
| Model deprecation | SKU enters `DEPRECATED` | Email / in-app | `OR`, `SF` (release notes, 7-day notice) | **missing** |
| Announcement | rich-text popover in the top bar | in-app | `302m` (`Notify` → Discord QR), `302c` | **missing** |
| Changelog | dated model-drop log, tagged by surface | page | `302h` (`更新日志-2026`, `2026.9.7 【API超市】新增…`), `SF` (release-notes as *the* deprecation channel) | **missing** |
| Payment success / failure | — | Email | all | ✅ via `packages/integrations/notifications` |

**Entity**: Prisma `Notification` (`userId, tenantId, type, title, body, data,
read`) + `NotificationPreference` (`channel, enabled, disabledCategories,
frequency: immediate|…`) — **both real**, plus `@nebutra/notifications`
(Novu + direct dispatchers) and `@nebutra/webhooks` (Svix) for the outbound
Slack/webhook channels OR offers. **The storage and dispatch exist; the router
triggers do not.**

---

## 12. Docs / Quickstart

| Surface | 302 | OR | SF | Ours |
|---|---|---|---|---|
| API reference | Apifox, ~1,950 ops, 10 sidebar roots, per-endpoint 15-language code tabs + "Run in Apifox" + LLMs.txt export | `/docs` + `llms.txt` index | `api-docs.siliconflow.cn`, ~25 endpoint pages | `apps/router/src/app/docs/page.tsx` — one static page, 6 snippets, 7-row endpoint table |
| Help center | HelpLook, 10 categories, ~120 articles, per-article TOC / prev-next / 「最近修改」 date / 是-否 vote / mobile QR | FAQ accordions per model page | FAQ pages | **missing** (footer links all point at `/docs`) |
| Quickstart CLIs | `npx 302cc`, `npx 302oc` wizards; `302ai` CLI + SKILL.md agent skills | Request Builder page | — | `packages/ops/cli` (`nebutra`), `packages/ops/create-sailor` — exist, not router-aware |
| Integration recipes | **24** "how to use with X" guides, each the same 3-field template (key → base URL → model id) + one 「注意：」 gotcha | 6 SDK snippet tabs per model | quickstart only | 6 snippets, hard-coded model ids |
| Price docs | rules only, all numbers deferred to `/price` + `/token` | inline on every model page | `/pricing` | PDP price rows only; **no `/price` page** |
| Token calculator | `/token` — English/Chinese/raw modes, in/out/cache-write/cache-read presets 1K–1M, model picker + compare, 4 currencies | — | — | **missing** |
| Changelog | `/docs/geng-xin-ri-zhi-2026` | — | release-notes | **missing** |

**Entity `DocRecipe`** (the thing worth modelling, because it is 24 near-identical rows):

| Field | Example | Source |
|---|---|---|
| `clientKey` | `claude-code`, `codex-cli`, `cursor`, `cherry-studio`, `dify`, `lobe-chat`, … | `302h` |
| `baseUrl` | `https://api.302.ai` (Claude Code) vs `…/v1` (Codex) vs `…/v1/chat/completions#` (Cherry) | `302h` |
| `envVars` | `{ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_MODEL}` | `302h` |
| `configSnippet` | `~/.claude/settings.json` json block | `302h` |
| `sampleModel` | `kimi-k2-0711-preview` | `302h` |
| `gotcha` | i18n note ("BASE_URL 的末尾要加上 /v1") | `302h` |

302's own docs are **inconsistent** about `/v1` vs `/v1/chat/completions` across
guides [302h anti-pattern] — modelling the recipe as data is what prevents that.

---

## 13. Referral

| Field | Type | Source | Ours |
|---|---|---|---|
| `code` | string ≤20, unique | `302c` (Referral Code + Bind Referral Code), `us` | ✅ `Referral.code` |
| `referrerUserId` | FK | — | ✅ |
| `referredEmail` / `referredUserId` | string / FK | — | ✅ |
| `status` | `pending \| …` | — | ✅ (soft string) |
| `rewardCredits` | int | `302c` (invite cashback) | ✅ |
| `level` | int (multi-level) | — | ✅ |
| `unlockCondition` | **lifetime top-up ≥ 100 credits** | `302c` (locked banner + progress "You have topped up 50 PTC. Top up another 50…") | **missing** — the gate is the interesting part |
| `cashbackRate` | Decimal | `302c` (module exists, no published rate; `302h` open question 7) | **missing** |
| `expiresAt`, `claimedAt` | datetime | — | ✅ |

**Adjacent, already built**: `RedemptionCode` + `CodeRedemption` (campaign codes,
`maxRedemptions`, one claim per user, `rewardAmount`, `rewardPayload`) — this is
SF's 代金券 mechanism and 302's promo credits, already in the schema with no UI.
`AccessInviteCode` / `AccessInviteRedemption` also exist.

**302's other growth surfaces** (recorded, not adopted): Enterprise Verification
→ 10 % off; partner program with 代金券 + raised free-model rate limits [SF];
OR's `HTTP-Referer` / `X-OpenRouter-Title` opt-in app attribution feeding a
public `/apps` leaderboard [OR] — that last one is cheap and high-signal once we
have traffic.

---

## 14. Gap summary

| Entity | Status in our repo | Where |
|---|---|---|
| Sku / catalog row | **missing as storage** (runtime-computed) | `listing-catalog.ts`, `ModelConfig` (price-only) |
| Vendor / brand | **missing** | `market-taxonomy.ts` (hard-coded) |
| Price (unit enum, cache, batch, tiers, upstream, markup) | **partial** (2 components, 1 unit) | `ModelConfig` |
| Category / taxonomy | **partial** (in-code) | `market-taxonomy.ts` |
| Shelf filters / sort | **partial** (5 of ~15 facets) | `models-catalog.tsx` |
| Endpoint family allow-list | **real** | `api/v1/[...path]/route.ts` |
| Endpoint metadata (title/method/stability/doc) | **missing** (2 hard-coded rows) | `product-detail.tsx` |
| Supply engine / account relay / alias | **real** | `router-supply`, `lib/supply/*` |
| Partner capacity (class C) | **interface only** (by design) | `resolve.ts` |
| Supply path metrics (latency/uptime/TPS) | **missing** (explicit placeholder) | — |
| Routing knobs (`provider{}`, `models[]`) | **missing** | `proxy.ts` (unused) |
| User / Org / Tenant / Role | **real** | Prisma |
| Module permissions, member budgets, sub-account bulk | **missing** | `@nebutra/permissions` can express it |
| KYC status | **missing** | — |
| API key core | **real** | `APIKey`, gateway `api-keys.ts` |
| Key quota / expiry UI / flags / whitelists | **missing** (columns exist, unexposed) | — |
| Wallet balance / ledger | **real but unwired** (demo memory wallet in prod path) | `CreditBalance`, `prepaid-wallet` |
| Top-up order / fee formula / packages | **mocked, unauthenticated** | `api/v1/wallet/topup` |
| Auto top-up / low-balance alarm | **missing** | — |
| Invoice | **real** (CN 数电发票 fields missing) | `Invoice`, `InvoiceItem` |
| Refund policy | **missing** | — |
| Usage record (per request) | **partial, split across two ledgers** | `UsageLedgerEntry` vs `RequestLog` |
| Request log (body capture, opt-in) | **missing** | — |
| Usage aggregates | **real, never called by Router** | gateway `usage.ts` |
| Spend quota (total/monthly/daily) | **missing** | `metering/quota-enforcement.ts` unwired |
| Rate-limit tiers / headers | **partial** (`rateLimitRps` only) | — |
| Notification triggers | **missing** (storage + dispatch real) | `Notification`, `@nebutra/notifications` |
| Docs recipes / help center / token calculator / changelog | **missing** | `docs/page.tsx` |
| Referral | **real** (unlock gate + rate missing) | `Referral`, `RedemptionCode` |

---

## 15. Decisions this model forces

1. **Which ledger is truth?** `UsageLedgerEntry` (Router edge, no cost) vs
   `RequestLog` (gateway, with cost). Every 用量 / 余额 surface depends on the
   answer. [us open q1]
2. **Which relay is canonical?** `router.nebutra.com/v1` → New-API raw (all
   protocols, no balance guard) vs `backends/gateway` (reservation + BYOK +
   queue billing, chat only). Parity work must hang wallet and usage on one.
   [us open q5]
3. **Wallet keying.** `createCreditLedgerWallet` targets `CreditBalance` keyed by
   `organizationId`; `resolveSessionTenantId` returns `Tenant.id` and personal
   tenants have no org. Reconcile before wiring. [us open q2]
4. **Currency.** Ship a real FX table or delete the dropdown. A dead currency
   switch is worse than none. [us open q7]
5. **Model-id filter.** `listing-catalog.ts` drops ids containing `/`, `:`, `@` —
   that excludes the entire OR (`author/slug`) and SF (`vendor/Name`, `Pro/…`)
   naming universe. Must go before any real catalog lands.
6. **Public shelf endpoint.** 302 and OR both expose an unauthenticated JSON
   catalog with the same params as the UI. Adopting that makes the shelf
   SEO-able and the docs self-serve; it also fixes our "no pagination, render
   everything" problem.
7. **Deprecation is an entity, not a status string.** 302 has no deprecation
   concept; OR and SF both do, with published notice windows (SF: 7 days). This
   is a customer-trust primitive and belongs in the first schema pass.
8. **Do not coin a credit token name.** 302's PTC is a product noun; closure
   forbids new ones. `credits`, 1 = 1 USD, is the whole story.
