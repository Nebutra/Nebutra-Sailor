# Router ↔ 302.AI / OpenRouter / SiliconFlow — GAP ANALYSIS

Date: 2026-09-09. Inputs: `302-market.md`, `302-price.md`, `302-docs.md`, `302-console.md`, `302-help.md`,
`openrouter.md`, `siliconflow.md`, `our-router.md` (all in this directory) and
`docs/plans/2026-07-23-router-302-full-route-interaction-study.md`.
Design constraints read: `docs/plans/2026-07-23-nebutra-router-forge-design.md` §5 and
`docs/architecture/2026-08-27-closure-phase.md`.

## 0. Reading rules

**Closure-phase constraints applied to every row.** No new workspace package, no new product noun, no new
abstraction layer, no deleted module. Every gap below lands in one of five places that already exist:

| Landing zone | Path |
|---|---|
| Router app (pages, route handlers, components) | `apps/router/src/**` |
| Supply/catalog logic | `packages/platform/router-supply/src/**` |
| Money primitives | `packages/platform/prepaid-wallet/src/**` |
| Usage / keys / BYOK aggregates already built | `backends/gateway/src/routes/ai/**` |
| Engine/infra config | `infra/nebutra-router/**` |

Anything that would need a sixth zone is marked **DEFER** in the gap column and listed in §9 as a decision for
the owner, not a task.

**Status vocabulary for "ours today"** (same as `our-router.md`): **real** = backed by DB/engine/catalog ·
**partial** = real data feed, templated or incomplete presentation · **mocked** = in-memory/canned ·
**missing** = no surface.

**Priority.**
- **P0** — a credible station cannot open its doors without it: money is honest, keys are real, usage is
  visible, no unauthenticated mutation, no fake numbers presented as real.
- **P1** — parity: the thing 302/OpenRouter/SiliconFlow all have and buyers look for.
- **P2** — differentiator or polish; deliberately after P1.

**Effort.** S ≤ 1 day · M ≈ 2–4 days · L ≥ 1 week (single implementer, includes tests).

**Layer.** front / back / both.

---

## 1. Public market shell — home, list, PDP

302's shelf is one URL grammar (`cate → tag → brand → keyword`), one card atom, one detail permalink.
OpenRouter's is the same shape with far richer per-model data; SiliconFlow's is weaker (no public detail route).
Ours has the shape and the real catalog feed but templated content underneath.

| # | Feature | 302 does | OpenRouter / SiliconFlow do | Ours today (path) | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| M1 | Shelf URL grammar | `/product/list?cate&tag&brand&keyword`, every level a real `<a href>`, breadcrumb reverses it | OR mirrors 18 filter groups 1:1 into `/api/v1/models` query params; SF `?type=`/`?mfs=` | **partial** — `/models?cate&tag&brand&q&sort` exists (`src/app/models/page.tsx`, `components/models-catalog.tsx`) but filters are also in local state and desync (see §8 F4) | Make URL the single source of truth; render server-side from `searchParams` | P0 | M | front |
| M2 | Card atom | cover · ★ · hover overlay (`View Documentation` ‖ `Try Now`) · **model id as title** · 2-line desc with full-text tooltip · chips `[type][tag][capabilities]` · price block with fixed `min-h` · `starting from` for multi-tier | OR card adds weekly token volume, category rank chips, release date, discount badge; SF card front carries ￥in/out + context + params, back = description | **partial** — `components/product-card.tsx` has id/desc/category/in-out price; no capability chips, no doc/try overlay, no tooltip, `description` is literally `name` | Add capability chips from models.dev, real one-line description, hover overlay with doc + Playground, black tooltip for clamped text | P1 | M | both |
| M3 | Taxonomy rail + brand flyout | category row → brand mega-list with name + logo + one-liner; one `category:home` JSON drives home column, flyout **and** list mega-panel | OR left facet rail (18 groups, counts on modality tabs); SF two chip axes | **real-ish** — `lib/market-taxonomy.ts` + `market-home.tsx` portal flyout with 140 ms close timer; brands have no description/logo | Give brands an entity shape `{id, label, description, logo}` in `market-taxonomy.ts`; one source for all three renderings | P1 | S | front |
| M4 | Pagination | infinite scroll, no count, `page` ignored by SSR (**302's own anti-pattern**) | OR `offset/limit≤1000` + facet counts; SF `20/page` numeric pager | **missing** — `/models` renders the entire list, no pager, no count beyond `N 个` | Ship a real pager (`?page=`) or "Showing 20 of 678"; do **not** copy infinite scroll | P1 | S | both |
| M5 | Sort | `type=new\|hot\|random\|created_time_asc\|price_desc\|price_asc` | OR 22 sort keys incl. throughput/latency/intelligence | **partial** — price tri-state only (`inputPerMTok`); "热门" tab on home is *price desc* masquerading as popularity | Remove or rename the fake 热门 until a real signal exists; add `newest` from catalog `created` | P0 (honesty) / P1 (add keys) | S | both |
| M6 | Model detail permalink | `/product/detail/<alias>`: hero, price rows incl. **cache creation/read**, anchor nav `Overview · Playground · Analytics · Reference · Pricing · Recommended`, API Reference table (`Description · Endpoint · Method · Stability · Params`), pricing table with `Official Price · 302.AI Price · Gap`, currency quick-switch | OR: one permalink is *everything* — providers table, effective-vs-listed price with history chart, uptime 3d/24h vs "Without Routing", benchmarks, apps, activity, 6 SDK snippet tabs, FAQ, sticky sub-nav. SF: **no public detail route** (anti-pattern) | **partial** — `/product/detail/[slug]` exists (`components/product-detail.tsx`) but every prose block is a template string; API list is 2 fixed rows; metrics are the placeholder "运行探针…当前无上报数据" | Fill with data we already have: real endpoint list from the edge allow-list, real capability flags, real per-model price. Keep the probe panel absent rather than placeholdered | P1 | M | both |
| M7 | "Ours vs upstream" price comparison | `302.AI · OpenAI Price · Compare (Original Price / +10%)` — the trust device | OR "effective vs listed" weighted price + cache hit rate | **missing** — only one price column | We have `rate`-equivalent data only if models.dev list price is kept alongside our price. Add `listPrice` to `ListingModel` and render two columns + delta | P1 | M | both |
| M8 | Capability icons | image/video/thinking/function-call/audio chips (unlabeled — copy the data, not the missing tooltips) | OR input/output modality facets with counts; SF `支持功能: 🛠️ 工具调用` | **missing** | models.dev already carries modalities; surface into `listing-catalog.ts` | P1 | S | both |
| M9 | Favourites / recently viewed | ★ on card, `/user-center/favorite`, `/user-center/history` | OR `Pinned` on `/models`; collections | **missing** | DEFER — needs a per-user store; not P0/P1 for a station | P2 | M | both |
| M10 | Banner carousel | `banner-list` per `product_type`, linking to benchmark posts | — | **partial** — `lib/market-banners.ts` static; empty state `暂无轮播物料` (禁七-shaped) | Either drive from config or drop the carousel; fix the empty string either way | P2 | S | front |
| M11 | 应用集市 (App shelf) | 69 tool SKUs, 9 tags, real app cards with `jump_url` | — | **mocked** — `TOOL_TAXONOMY` rows all `href=http://localhost:3105`; hero "打开 Forge →" | Hide the channel behind `NEXT_PUBLIC_FORGE_URL` presence, or ship one real card. Nine hard-coded localhost URLs must not ship | P0 (localhost leak) | S | front |
| M12 | Search | header search → `/product/list?keyword=`; `AI 推荐` variant | OR `Search ⌘K` global; SF search + 热门 quick chips | **partial** — search posts to `/models?q=`, but the input is never seeded from `?q=` (`console-shell.tsx`) so a shared link shows an empty box | Seed from `searchParams`; keep `AI 推荐` out until it means something | P1 | S | front |
| M13 | SEO surface | SSR everything, per-SKU titles `<model> - API: Pricing, Docs & Review` | OR per-model FAQ accordion purely for SEO; `/collections` pages | **partial** — `sitemap.ts` lists `/product`, which **404s**; robots fine | Fix the dead sitemap entry; add PDP entries | P1 | S | back |

---

## 2. Price surface

302 publishes 3,695 rows across 430 tables (as static HTML, no API — their anti-pattern). SiliconFlow publishes a
grouped-by-modality table with modality-specific units and per-row tiering. OpenRouter puts price on the card and
the model page and exposes it through `/api/v1/models`. We have prices in the catalog but **no price page at all**.

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| PR1 | A price page | `/price` (iframe of a static catalog): tabs → accordion sidebar → one table; typeahead over ids, labels and descriptions | SF `/pricing` grouped tables per modality, vendor chips as jump anchors, `实时价格同步` freshness badge; OR has no separate price page (price lives on cards/models) | **missing** — prices only on cards + PDP | Build `/price` from `getListingCatalog()` — the data is already there (`inputPerMTok/outputPerMTok/context`). One table per category, vendor rows grouped, unit in the column header | **P0** | M | both |
| PR2 | Unit model | free-text `suffix` — 38 spellings, `[object Object]` leaks, doc URLs in the unit slot (**do not copy**) | SF uses modality-specific column headers (`/张`, `/千字符 UTF-8`, `/个`); OR switches unit words per modality (`$0.10/hour`, `from $0.05/second`) | **partial** — everything forced into `$/1M tokens`; `0` renders `—` | Model unit as an enum on `ListingModel`: `per_1m_tokens · per_call · per_second · per_image · per_1m_chars · per_minute · per_megapixel · per_page · free · pass_through` | P1 | M | back |
| PR3 | Cache pricing | 2 rows only, as a free-text footnote | OR `input_cache_read/write` first-class in `pricing{}`, cache-hit-rate column | **missing** | Add `cacheReadPerMTok` / `cacheWritePerMTok` to the listing when models.dev has it; the edge already parses Anthropic `cache_creation/read` tokens (`lib/openai-edge.ts`) | P1 | M | both |
| PR4 | Tiering | duplicate rows with the condition buried in `Description` (`<272K context`, `0<Token≤32K`) | SF tiers by input-length bucket **and** time-of-day window; OR `:batch` = 50 % off, discount facet | **missing** | Represent a tier as `{condition, price}` rows under one model rather than duplicating the model | P2 | M | both |
| PR5 | Currency switch | in-iframe `$ ¥ 円 ₽` with **precomputed** FX (×7/×147/×78, build-time constants), plus a second, unlinked nav dropdown (anti-pattern: two controls that don't talk) | OR USD-only; SF CNY-only | **mocked** — `console-shell.tsx` currency dropdown is dead state, never converts a price | Either wire one FX table (config constant + a `formatMoney(currency)` helper) or delete the dropdown. Shipping a control that does nothing is worse than not shipping it | **P0** (honesty) | S | front |
| PR6 | Token calculator | `/token`: English/Chinese/raw modes, in/out/cache-write/cache-read presets, model picker, compare two models, 4 currencies | — | **missing** | Cheap credibility, pure client-side, uses the price data we already have | P2 | M | front |
| PR7 | Model leaderboard | `/model-rank`: Cost-Performance · Overall · Speed · Coding · Multimodal · Vision; charts/list; "Updated At" | OR `/rankings` by real token volume + explicit disclaimer "measure adoption, not quality"; `/benchmarks` own harness | **missing** | DEFER — we have no ranking signal and no benchmark harness. Faking one is the exact failure mode this analysis exists to prevent | P2 | L | both |
| PR8 | Price freshness contract | `1PTC=1USD` stated once at top; balance never expires | SF badge `实时价格同步` `仅展示可用模型` | **missing** | State the source and the refresh cadence on `/price` (`sourceNote` already computes this string on the shelf) | P1 | S | front |

---

## 3. Docs surface

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| D1 | Quickstart ("replace the base URL") | one sentence everywhere: replace `api.openai.com` → `api.302.ai`; sub-bases `/302` (OpenAI-format for non-OpenAI models) and `/codex` | OR six SDK snippet tabs per model + `/request-builder` code generator | **real** — `/docs` has 6 snippets (openai SDK, curl, anthropic SDK, Claude Code, Codex CLI, image gen) + a 7-row endpoint table | Keep. Fix: `sampleModel` comes from the deprecated `getModels()` alias table, not the live shelf | P1 | S | back |
| D2 | Per-endpoint reference | ~1,950 Apifox operations, price inline in every description, 15 language tabs, `LLMs.txt`, per-page `.md` | OR one docs site + `llms.txt`; SF a tight ~30-endpoint reference | **missing** as a reference (we have a 7-row table) | Generate the endpoint table from the edge allow-list in `src/app/api/v1/[...path]/route.ts` so docs cannot drift from the proxy | P1 | M | both |
| D3 | Integration guides | 24 "how to use with X" recipes, all the same 3-field template (key → base URL → model id) with one 「注意：」 gotcha each | SF: none (docs only); OR: SDK tabs | **partial** — Claude Code and Codex snippets exist inline; no per-client pages | Add Cursor / Cherry Studio / Dify / LangChain as short sections on `/docs`. High conversion, low cost | P1 | M | front |
| D4 | Machine index | `llms.txt` + `sitemap.xml`, `.md` suffix on any page | OR keeps an `llms.txt` (their docs paths churn) | **missing** | `llms.txt` for `/docs` | P2 | S | back |
| D5 | Error contract doc | HTTP status table (400/401/403/404/413/429/500/503), `ErrorResponse{code,message,request_id}` — but mixed envelopes across mounts (anti-pattern) | OR: single page with `error.code` = HTTP status + `metadata.error_type` enum (28 values), `Retry-After`, mid-stream error chunk shape, zero-completion insurance | **partial** — edge returns `{error:{message,type}}` mirroring OpenAI (`lib/openai-edge.ts`), undocumented | Document the envelope we already emit; adopt OR's `error_type` enum wholesale — it is the best artifact in the whole sweep | P1 | S | both |
| D6 | Feature toggles: suffix ≡ param | `model:"x-web-search"` ≡ `{"web-search":true}` — the single most reusable router idea in the sweep | OR slug variants `:free :nitro :floor :exacto :online :thinking :batch`, `~family-latest` aliases, `@preset/slug` | **missing** — `router-supply/alias.ts` resolves public→upstream but has no variant grammar | DEFER to a design decision (§9-6): the alias table is the right place, but this is a product-surface addition, not a repair | P2 | L | back |
| D7 | Async convention | uniform `?run_async=true&webhook=`, `fetch/{task_id}`, one task object with `status`, timestamps, `raw_response`, `*_url[]`; webhook 200 = ack, 3 retries | SF `/v1/batches` + `/v1/video/submit`+`status` | **missing** — edge allow-list is synchronous only | DEFER — needs a task store. Not a station-credibility blocker | P2 | L | back |

---

## 4. Customer console — the real gap

This is where our product is furthest from all three benchmarks, and where every P0 sits. 302's console is one
page template repeated seven times: **stat cards → hint band → inline create form → search row → table with
`Status · Daily Cost · Monthly Cost · Total Cost · Create Time · Operation` → pagination**. Copy the template.

### 4.1 Money

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| C1 | Real balance | PTC (1 PTC = 1 USD), one wallet across bots/tools/API, 2 dp balance, 6 dp costs, `Go Top Up` in the same card on every page | OR USD credits, `GET /credits → {total_credits, total_usage}`; SF prepaid CNY + 代金券 | **mocked** — `MemoryPrepaidWallet` seeded 25 USD on a hard-coded `"demo"` tenant, process-global, resets on restart (`lib/demo-store.ts`, `api/v1/wallet/route.ts`) | Wire `createCreditLedgerWallet()` — the adapter exists in `prepaid-wallet/src/credit-ledger-wallet.ts` and has **never been instantiated**. Blocker: credits are keyed by `organizationId`, Router resolves `Tenant.id` (§9-2) | **P0** | M | back |
| C2 | Unauthenticated top-up | — | — | **mocked + unauthenticated** — `POST /api/v1/wallet/topup` has no auth and is publicly reachable as `/v1/wallet/topup` through the `next.config.ts` rewrite | Delete or session-guard. This is a security defect, not a feature gap | **P0** | S | back |
| C3 | Top-up flow | packages `$5/20/50/100/200/500/1000` + custom (1–2000); payment-method modal showing **explicit fee math per channel** (`$20 × 4% + $0.3`); channels Card ch1/ch2 · USDT · Alipay · RU rails | OR Stripe 5.5 % / crypto 5 %, refund of unused credits ≤24 h; SF 支付宝/微信/对公转账 with per-channel caps | **mocked** — preset chips `+5 +10 +25 +50 +100` calling a mock endpoint | Real payment is a business decision (§9-3). Until then the page must say so unambiguously — it currently returns `"Mock top-up ok — wire real payments in production"` into a neutral `<p>` that looks identical to success | **P0** (honesty) → P1 (real rails) | S → L | both |
| C4 | Bill / order record | table `Order ID · Note · Time · Price · Value · FREE · Amounts · Bill` | OR `/settings/credits` + refunds; SF 账单/发票/费用明细 | **missing** | `CreditLedgerPort.addCredits` already types `PURCHASE\|BONUS\|ADJUSTMENT\|REFUND` — render it | P1 | M | both |
| C5 | Auto-recharge | bind card, threshold + amount, **waives the top-up fee**; min amount $5, min threshold $1 | SF 支付宝自动充值 with per-txn/day/month caps | **missing** | DEFER until C3 has real rails | P2 | M | both |
| C6 | Balance alarm | modal: enable · threshold PTC · Email/SMS | OR notifications: Low Balance (default $100), budget 80 %/100 %, key spend limit, model deprecation; channels email/Slack/webhook | **missing** | P1 as a single "低余额提醒" toggle on `/wallet`; the notification packages already exist | P2 | M | both |
| C7 | Invoices | manual, via account manager WeChat, for bank transfers only | SF 数电发票 form (申请开票金额 · 费用名称 · 抬头/税号 · 类型 · 接收方式), only on consumed amounts, 2 working days | **missing** | DEFER — business process before UI | P2 | M | both |
| C8 | Withdraw / developer revenue | full payout surface (`Withdraw` tab, bank form, 10 % fee, 7 business days) + `/developer/stats`, `/developer/paywith302` | — | **missing** | Out of scope for a station. Explicitly not a gap | — | — | — |
| C9 | Refund policy page | standalone numbered doc: 7 wd claim / 3 wd audit / 1–7 wd payout, gifted credit never refundable, PTC non-transferable | OR refund of unused credits ≤24 h, fees non-refundable | **missing** — footer `Legal` links all point to `/docs` | A prepaid station without a written refund rule is not credible. One static page | **P0** | S | front |

### 4.2 Keys

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| K1 | Key table columns | `API Name · API KEY (masked sk-xxx******xxxxxx) · Status ON/OFF · Daily Cost · Monthly Cost · Total Cost · Create Time · Expired Time · Operation` | OR per-key `usage / usage_daily / weekly / monthly / byok_usage / limit_remaining / disabled / expires_at`; SF unknown (gated) | **partial/real** — `/keys` in `nebutra` mode is real against the shared `APIKey` table, but columns are only `名称 / prefix / scopes / 创建时间`; **no cost, no lastUsedAt, no expiry, no status** | Add the cost trio and `lastUsedAt` — gateway already returns them (`routes/ai/api-keys.ts`, `usage.ts` by-key) | **P0** | M | both |
| K2 | Key creation options | `API Name`* · `Expired Time`* with presets **Eternal / 1 Month / 1 Day / 1 Hour** · `Quota` Unlimited-toggle + PTC · `Daily Quota` same (resets 00:00 browser TZ) · flags `Save Logs`, `Used for system management`, `Custom Model Relay` | OR create dialog: `name`, `limit` USD, `limit_reset` daily/weekly/monthly, `include_byok_in_limit`, `expires_at`; management keys are a separate class that cannot call completions | **partial** — only `{name}`; scopes hard-coded `models:* tools:*`. Gateway's `CreateApiKeySchema` **already accepts** `scopes`, `rateLimitRps` (1–10000), `expiresInDays` (1–3650) and `PATCH /{id}` exists | Expose what the backend already has: expiry presets + a spend cap. This is a form, not a subsystem | **P0** | M | both |
| K3 | Key disable vs delete | disable is reversible (30 s to take effect), delete is permanent and the name cannot be reused — stated in the doc next to the control | OR `disabled` flag | **partial** — revoke only, no confirm dialog, result ignored by the client (§8 F1) | Add disable/enable + a confirm on destructive revoke | P1 | S | both |
| K4 | Per-key request logs | `Logs` drawer: `Request ID · Time · Path · Duration/First Byte · Input/Output · CacheCreation/CacheRead · Cost · Request IP · Request Body · Response Body`, gated on the key's `Save Logs` flag, with Export | OR `/logs` (beta) full prompt/response viewer, ≥3 months retention, separate from the data-discount logging | **missing** | The edge already records `requestId, path, model, prompt/completionTokens, status, latencyMs, supplyPath` into `UsageLedger` (`lib/usage-ledger.ts`). Body capture is opt-in and privacy-loaded — ship metadata-only first | P1 | M | both |
| K5 | Integration guide per key | `Guide` modal: base URL + this key + "replace api.openai.com" + Production/CN-forward tabs | — | **partial** — `/docs` has the snippets but not bound to a key | Copy 302's modal: it removes the whole "what do I paste where" step | P1 | S | front |
| K6 | Masked display + reveal | `sk-xxx******xxxxxx`, eye icon to reveal, copy icon | OR: shown once only, `sk-or-v1-…`, `hash` as id | **real** — one-time banner with `复制` is the correct disclosure pattern (better than 302's re-reveal) | Keep ours. Do not copy 302's reveal-later | — | — | — |
| K7 | Key store mode confusion | — | — | **defect** — `ROUTER_KEY_STORE` defaults to `newapi-token`; `/dashboard` reads the demo in-memory list **regardless** of the flag, so the key count is wrong in production mode (`app/dashboard/page.tsx`) | Make the dashboard mode-aware or remove the stat | **P0** | S | back |

### 4.3 Usage / logs / analytics

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| U1 | Usage detail page | `/logger`: `Time · Type (API (<key name>)) · Model · Prompt · Completion · Cache Creation · Cache Read · Cost`, filters (name/model/type + time range), pagination `共 N 条` | OR `/activity`: filter by model/provider/api-key, export, per-generation drill-down (`GET /generation?id=` returns 40+ fields incl. `total_cost`, `latency`, `finish_reason`, `is_byok`) | **missing entirely** — the single biggest console gap | Gateway already serves `/api/v1/ai/usage/{summary,by-model,by-key,history}` over `RequestLog`. Router never calls them. **Two ledgers, no join** (§9-1) | **P0** | M | both |
| U2 | Cost analytics dashboard | `/dashboard/overview`: Balance / Cost History / Request Count cards + 6 ECharts (App & Model cost distribution, call-times ratio, channel consumption) with `Range Time` + `Time Particle Size` filters | OR per-model Activity chart (prompt/completion/reasoning split) | **partial** — `/dashboard` has 4 stat cards, two of which are wrong (K7) and a checklist with **hard-coded booleans** (`配置 baseURL` always ✓, `快捷使用试跑` always ✗) | Replace hard-coded checklist items with real probes; wire the stat cards to the same aggregates as U1 | **P0** | M | both |
| U3 | Per-request cost lookup | response header `request-id` → `GET /dashboard/record/{id}` → `{cost, input_token, output_token, model, process_time}` | OR `GET /api/v1/generation?id=`; `usage.cost` in the response body | **partial** — `x-request-id` is echoed by the edge, but nothing can be looked up with it | Small, high-trust: one route handler over `UsageLedger` keyed by `requestId` (the ledger already uses `idempotencyKey: router:{requestId}`) | P1 | S | back |
| U4 | Public per-key log lookup | `/usage-log`: paste a key, see its logs, no login (for shared keys/sub-accounts) | — | **missing** | P2; nice for shared keys, needs rate limiting | P2 | S | both |
| U5 | Cost is the primary lens | every table on every page carries `Daily Cost · Monthly Cost · Total Cost` | OR puts spend on keys and workspaces | **missing** — no cost anywhere in the console | Adopt the trio as a shared table fragment once U1 lands | P1 | M | both |
| U6 | Ledger has no price | — | OR prices every generation; SF bills per token | **defect** — the Router edge writes `UsageLedger` with `type: AI_TOKEN, unit: token` and **no cost**; the gateway relay writes `RequestLog` **with** a `cost` Decimal. The usage dashboard reads `RequestLog`, which the Router path never populates | Decide the canonical ledger (§9-1) before building U1, or U1 shows zeros | **P0** | M | back |

### 4.4 Playground / quick use

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| PG1 | Playground | `all.302.ai` Omni Toolbox, reached by OAuth consent or a deep link that **auto-provisions a key into the URL query string** (their security anti-pattern — do not copy) | OR `/chat` with model rooms, `Add Model ⌘J`, starter prompt groups, usable signed-out until send; `/request-builder` generates cURL/Python/TS | **mocked** — `/use` posts to `/api/v1/chat`, which returns `（demo）{model} 收到：…` unless `ROUTER_GATEWAY_URL` is set, debits 0.001 from the demo wallet, has **no auth**, and is publicly reachable as `/v1/chat` | Either route it through the real edge with the session's key, or gate the page. A canned reply presented as a model response is the worst honesty failure in the app | **P0** | M | both |
| PG2 | Streaming, history, cost display | — | OR chat shows the chosen model (Auto Router reveal) and usage | **missing** — single-turn, no stream, no token/cost readout | Once PG1 is real, show `usage` + cost from the same response | P1 | M | both |
| PG3 | Key handling in playground | 302 puts the key in a URL query param (anti-pattern) | — | **defect-adjacent** — ours holds the customer's key in `useState` and posts it in a JSON body | Use the session, never ask the customer to paste their own secret into our page | P1 | S | both |

### 4.5 Team / tenancy / BYOK

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| T1 | Sub-accounts | free, ≤200 per batch, `xxxx@sub.302ai`, roles 普通用户 (8 toggleable modules) / 管理员, per-sub quota trio, per-sub usage detail + CSV, main-account filter `账号类型=子账号` | OR Organization (≤10 members, Admin/Member, shared credit pool) → Workspaces (own keys, budgets daily/weekly/monthly/lifetime, strictly decreasing, 403 on breach) → Guardrails; SF none public | **missing UI** — `resolveSessionTenantId()` already resolves org tenant else personal tenant (`lib/router-keys.ts`) | P2 for a station. When it lands, copy OR's budget ladder over 302's flat quota | P2 | L | both |
| T2 | BYOK / custom model relay | `/external-resource/custom-model`: base URL + key ("securely encrypted") + OpenAI/Claude format + capability checkboxes + **forward region** (HK/SG/US-East/custom proxy) + backup model + `【检查】` validate; priced `0.05 PTC/day per key` | OR BYOK with prioritized/fallback ordering, "never use shared capacity", 5 % fee after allowance, 68 of 82 providers support it; SF "产品支持 BYOK" as an ecosystem concept | **missing in Router** — but gateway has `provider-keys` (OPENAI/ANTHROPIC/GOOGLE/SILICONFLOW/CUSTOM, masked `••••last4`, `alwaysUse`) and `byok-upstreams.ts` with an SSRF guard | Surface the existing gateway BYOK in the Router console. No new package | P1 | M | front |
| T3 | Custom API / OpenAPI import | `/external-resource/custom-api`: import an OpenAPI 3 / Swagger project, forward path, auto-forward toggle, then expose as MCP tools; free | — | **missing** | Out of scope for a station | — | — | — |
| T4 | Agents / MCP as a model id | `/agents/list` (model + MCP + system prompt → a callable model name), `/agents/mcp-server` (compose an MCP server from platform APIs) | — | **missing** — `packages/ai/mcp` exists but is not wired to the Router | DEFER — new product noun, forbidden by the closure ADR without a business path | P2 | L | both |
| T5 | Identity verification | mandatory KYC entry (personal/enterprise), unlocks 10 % enterprise discount | SF 实名认证 **mandatory since 2026-05-15** — "未实名账号无法使用平台" | **missing** | DEFER — compliance decision (§9-7) | P2 | L | both |

---

## 5. Help / rules / legal

302's help centre carries *rules*, never numbers — every price defers to `/price`. That discipline is the single
most copyable thing here, because it is why their docs never go stale.

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| H1 | Billing rules stated once | "先充值，后按量扣费 · 0 月费 · 无套餐 · 无门槛 · 余额永久有效 · 统一钱包" + two meters (per-token, per-call) + `1 PTC = 1 USD` | OR `/pricing` matrix Free/PAYG/Enterprise with platform-fee row; SF L0–L5 spend-derived rate-limit tiers with published thresholds | **missing** | One page. Prepaid, pay-as-you-go, what a token costs, what never expires. This is what a buyer reads before topping up | **P0** | S | front |
| H2 | Rate-limit policy | claims "**No TPM or concurrency limits for any user**" (marketing) while the docs document only a 429 row (anti-pattern: unbacked claim) | OR publishes concrete limits (free 20 req/min; 50/day under $10 lifetime, 1000/day over; negative balance → 402); SF publishes 7 metrics (RPM/RPH/RPD/TPM/TPD/IPM/IPD) across L0–L5 | **partial** — `APIKey.rateLimitRps` defaults to 10 in Prisma and is enforced by the gateway pipeline, but is never shown or documented | State the real limit. Copy SF's vocabulary, not 302's claim | **P0** | S | both |
| H3 | Refund / legal pages | Refund Policy · Terms · Privacy · Intellectual Property, all footer-linked | OR Privacy / Terms / Trust Center; SF 用户协议/隐私协议 + ICP/公安备案 + 增值电信许可证 | **missing** — footer `Support` and `Legal` links **all point to `/docs`** | See C9. Also: a CN-facing station needs the 备案 footer block (SF's pattern) | **P0** | S | front |
| H4 | Help centre / FAQ | ~120 articles, 10 categories, per-article TOC + prev/next + 「最近修改」 + 是/否 vote | SF docs site with FAQ sections incl. `rate-limit-and-upgradation`, `error-code`, `invoice` | **missing** | A 7-question FAQ on `/docs` covers the station case; a whole help site does not | P1 | S | front |
| H5 | Changelog | `/docs/geng-xin-ri-zhi-2026` — pure model-drop log, dated, tagged (**their gap**: no policy changes recorded) | SF release notes double as the **deprecation channel** with a fixed 7-day notice and model-id lists | **missing** | Model-drop + deprecation notice with a stated notice period. Copy SF's cadence, not 302's model-only log | P1 | S | both |
| H6 | Support contract | in-app chat 10:00–20:00 全年无休, support@ mailbox, account manager WeChat for transfers/invoices | OR Community / Email / SLA+Slack by plan | **missing** | State hours and a mailbox. `MEMORY.md` notes the founder mailbox convention | P1 | S | front |
| H7 | Copy governance | — | — | **defect** — `暂无相关模型` / `暂无轮播物料` are 禁七-shaped strings. `apps/router` is outside the governed `apps/web/src`, so lint does not fire | Do not carry them forward into parity work; consider extending `governance.config.json` coverage to `apps/router/src` | P1 | S | front |

---

## 6. API edge / contract parity

| # | Feature | 302 does | OR / SF do | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|---|
| A1 | Drop-in OpenAI base URL | `api.302.ai` mirrors `/v1/*` byte-compatibly; Anthropic `/v1/messages` and Gemini `/v1beta/...` mirrored raw | OR OpenAI-compatible + `/responses` + `/messages` Anthropic skin + `/embeddings` + `/rerank` + `/images` + `/audio/*`; SF adds Anthropic-compatible `/v1/messages` | **real** — `api/v1/[...path]` allow-lists `models`, `chat/completions`, `completions`, `responses[/id[/cancel]]`, `messages[/count_tokens]`, `embeddings`, `images/*`, `audio/*`, `rerank`. This is genuinely at parity | Keep. Document it (D2) | — | — | — |
| A2 | Auth header aliases | `Authorization: Bearer` everywhere, `x-api-key` for Anthropic raw, `x-goog-api-key` for Gemini raw | same pattern | **real** — Bearer or `x-api-key` accepted | Add `x-goog-api-key` if Gemini raw is ever allow-listed | P2 | S | back |
| A3 | Error envelope | mixed across mounts (anti-pattern) | OR: `{error:{code:<HTTP>, message, metadata{error_type,…}}}` with a 28-value enum, `Retry-After`, mid-stream error chunk | **partial** — `{error:{message,type}}` OpenAI-shaped, no `code`, no enum, undocumented | Adopt OR's shape: add `code` (HTTP status) and an `error_type` enum. Small change, large credibility | P1 | S | back |
| A4 | Rate-limit headers | none documented | OR `X-RateLimit-*`, `Retry-After` on 429/503 | **missing** | Pairs with H2 | P1 | S | back |
| A5 | Provider routing controls | none (302 routes internally) | OR one `provider{order, only, ignore, sort, max_price, zdr, data_collection, allow_fallbacks, require_parameters}` object + `models[]` fallback array | **partial** — `router-supply/resolve.ts` computes an upstream chain and emits `X-Nebutra-Supply-Class: A\|B\|C`, but the edge proxies raw to New-API and never uses `proxy.ts`'s fallback logic | Per the Forge design §5.7, phase 1 is deliberately a *single product path* — customers do not choose supply. So: **not a gap**, but the dead `proxy.ts` should be reconciled with the edge | P2 | M | back |
| A6 | Response tells you what served it | — | OR returns `provider`, concrete `model`, and opt-in `openrouter_metadata{strategy, region, attempt, is_byok}`; cache headers | **partial** — the edge parses `x-oneapi-channel` into `supplyPath` for the ledger but never returns it | Design §5.4 says supply path visibility is "customer-facing optional/redacted". Decide once (§9-8) | P2 | S | back |
| A7 | Two relays, one product | — | — | **defect** — `router.nebutra.com/v1` proxies raw to New-API (all protocols, **no balance guard**); `backends/gateway /api/v1/ai/gateway/chat/completions` has reservation + BYOK + queue billing but **only chat**. Usage/balance can only hang off one of them | **The single most consequential decision in this analysis** (§9-5). A prepaid station whose main edge has no balance guard will sell inference it cannot bill | **P0** | L | back |
| A8 | Model status probe | `GET /v1/status?model=` returns TTFB per model, free | OR uptime/latency/throughput per provider per region, 3d/24h charts, "Availability vs Without Routing" | **missing** — PDP shows the explicit placeholder "运行探针…当前无上报数据" | Honest placeholder is acceptable short-term; a cheap `/v1/status` over the engine probes we already run (`api/admin/v1/supply/engines`) would beat it | P2 | M | both |
| A9 | In-memory admin state | — | — | **defect** — the channel-sync plan store and the pending-OAuth login map are in-process `Map`s; they break on restart and on >1 instance (`lib/supply/login.ts`, `lib/supply/domain.ts`) | Acceptable on one Machine; must be stated in `versions.lock` or moved to Redis before the Router scales out (§9-6) | P1 | M | back |

---

## 7. Cross-cutting

| # | Feature | 302 / OR / SF | Ours today | Gap | P | Effort | Layer |
|---|---|---|---|---|---|---|---|
| X1 | Locale | 302: 4 locales, but Chinese pagination/empty/date strings **leak into the English UI** (anti-pattern) | 37 message files, `locale-switcher.tsx` | Audit for the same leak before adding locales | P1 | S | front |
| X2 | Currency | 302: 4 currencies with build-time FX and two unlinked controls | dead dropdown (PR5) | See PR5 | **P0** | S | front |
| X3 | Localhost URLs in production chrome | — | **defect** — `http://localhost:3105` in 9 places (`market-taxonomy.ts` ×7, `market-footer.tsx`, `market-home.tsx`) and `http://localhost:3106` in `lib/auth.ts` + `auth-actions.tsx` | Env-driven with a production default; the auth one causes a first-paint sign-in href pointing at localhost | **P0** | S | front |
| X4 | Dev secrets in compose | — | `SESSION_SECRET: change-me-in-production`, pg password `nebutra_dev_only`, `sub2api: latest` unpinned (`infra/nebutra-router/compose.yaml`) | Dev-only files, but `versions.lock` says CLIProxyAPI's Management API "stays off" while the template sets `allow-remote: true` — **stale and contradictory** | P1 | S | back |
| X5 | Inventory fallback | — | `ROUTER_USE_OPENROUTER_INVENTORY` makes the shelf show **OpenRouter's catalog** as 可售 with no New-API behind it (`router-supply/inventory.ts`) | A lab convenience that, left on, sells models we cannot serve. Must be off in production and stated | **P0** | S | back |
| X6 | Frontier defaults drift | — | `router-supply/frontier-defaults.ts` is a hand-maintained snapshot that must be synced by hand with `packages/ai/ai-providers/src/frontier.ts` | Derive or test the equality; a stale default model id is a broken quickstart | P1 | S | back |

---

## 8. Frontend state-management defects — findings and fixes

Every client component in `apps/router/src/components/` is `useState` + bare `fetch` with no `res.ok` check, no
`AbortController`, no optimistic state and no shared client. Below, each defect from `our-router.md` §4 with the
fix stated concretely. The through-line: **move reads to server components, mutations to route handlers driven by
`useActionState` + `revalidatePath`, and keep client state only for things that are genuinely ephemeral.**

### 8.1 The five architectural rules to apply

1. **Server component reads.** Any list that is rendered on load (`/keys`, `/wallet` balance, `/dashboard`,
   `/models`) is fetched in the RSC, not in a `useEffect`. This deletes the loading flash, the refetch race and
   the "unhandled 401 silently becomes an empty list" class of bug in one move.
2. **Route handlers for mutations only**, invoked through `useActionState` (or a server action) so the pending
   state is per-form, not a single shared `loading` boolean.
3. **Optimistic update with rollback** via `useOptimistic` for exactly two operations: key revoke (remove the
   row) and wallet top-up (bump the balance). On error, restore the snapshot **and** surface the message in an
   error-styled slot — never the same neutral `<p>` as success.
4. **Four states, always**: loading (skeleton, not a spinner-only), empty (specific copy, not `暂无…`), error
   (with a retry affordance and the server's `error.message`), and data. Today only "data" and a de-facto empty
   state exist.
5. **No refetch races**: reads are server-driven; where a client fetch is unavoidable (playground streaming),
   an `AbortController` is cancelled in the effect cleanup and the response is discarded if the signal aborted.

### 8.2 Defect table

| # | File | Defect | Consequence today | Fix |
|---|---|---|---|---|
| F1 | `components/keys-client.tsx` | `refresh()` does `res.json()` with no `res.ok` check; `create()` ignores `data.error`; `revoke()` ignores the result entirely | A 401/403 from `/api/v1/keys` (which returns `{error}`) sets `keys=[]` and renders `还没有 Key` — the customer is told they have no keys when they are unauthorized. A 403 `No tenant for this account yet.` on create just re-enables the button silently. A 404/501 on revoke is invisible | Move the list to the `/keys` server component. Keep create/revoke as route handlers called through `useActionState`; render `state.error` in an error slot. Revoke gets `useOptimistic` removal + rollback + a confirm dialog |
| F2 | `components/keys-client.tsx` | one `loading` boolean shared by create and every row's revoke | Clicking revoke on row 3 disables the create button and every other row | Per-action pending state (`useActionState` per form; a `pendingId` set for row actions) |
| F3 | `components/keys-client.tsx` | empty row `colSpan={4}` under a 5-column table | Misaligned empty state | `colSpan={5}`; better, derive it from the column definition |
| F4 | `components/models-catalog.tsx` | **dual source of truth + refetch race**: filters live in local state *and* the URL; `pushFilters` reads `cat/brand/q/sort` from a stale closure, so an `onBlur` of the search input after a category click writes the *old* category back into the URL. `useState(() => parse(initial…))` initialises once and never re-syncs, so back/forward navigation leaves stale chips | Filters silently revert; browser history is broken; a shared URL and the visible chips disagree | Delete the local filter state. `/models` is a server component reading `searchParams`; the client component receives derived props and only *navigates* (`router.replace`) — it never mirrors. Debounce the search input and push on change, not on blur. Put `view` in the URL too so grid/list survives navigation |
| F5 | `components/wallet-client.tsx` | `refresh()` unguarded; `topUp` renders `data.message ?? data.error` into the same neutral `<p>` | Success and failure are typographically identical — and the success message is literally `"Mock top-up ok — wire real payments in production"` | Balance from the server component. Top-up through a route handler with `useOptimistic` balance bump + rollback. Success → success-styled slot; error → error-styled slot with the server code |
| F6 | `components/wallet-client.tsx` | `amount` is a string; `Number("")` → 0 → server 400 | Empty submit produces a server error instead of a field message | Client-side validation before submit; disable the button while the field is invalid; `Field` + `Input` from `@nebutra/ui/primitives` per the form-controls rule |
| F7 | `components/playground-client.tsx` | `data.error` is written into the output `<pre>` indistinguishable from a model reply | An error looks like an answer — the worst possible failure for a playground | Separate error slot; never render an error as content |
| F8 | `components/playground-client.tsx` | no `AbortController` | Rapid double-send resolves out of order; last write wins on `out` | `AbortController` per send, cancelled on the next send and on unmount; ignore aborted responses |
| F9 | `components/playground-client.tsx` | reads `window.location.search` in a `useEffect` after mount instead of receiving `initialModel` | Flash of the wrong model on every load | Pass `searchParams.model` from the server component as a prop |
| F10 | `components/playground-client.tsx` | the customer's API key is held in `useState` and posted in a JSON body | We are asking the customer to paste their own secret into our page (and 302 does something worse — key in a URL query string) | Use the session-derived key server-side; drop the field |
| F11 | `components/market-home.tsx` | `tab` and `view` are `useState` only | Lost on navigation and unshareable | Move both to the URL (`?tab=&view=`), same as `/models` |
| F12 | `components/console-shell.tsx` (MarketShell) | `currency` is dead state that never affects a price; search `q` is not seeded from `?q=` | A control that does nothing; a shared search link shows an empty box | Wire currency to a `formatMoney` helper or delete the control (PR5); seed `q` from `searchParams` |
| F13 | `components/console-shell.tsx` (AdminShell) | `collapsed` read from `localStorage` in a `useEffect` | Hydration flash: always paints expanded, then snaps | Read the preference in the RSC from a cookie, or render collapsed-agnostic markup and apply the class before paint |
| F14 | `components/auth-actions.tsx` + `lib/auth.ts` | `returnTo` defaults to `http://localhost:3106/` until an effect runs | First-paint sign-in href points at localhost in production | Compute the return URL server-side from the request/env; never a localhost literal in a rendered href |
| F15 | `app/dashboard/page.tsx` (RSC) | reads `listKeys()` and `getWallet()` from `demo-store` regardless of `ROUTER_KEY_STORE`; two checklist booleans are hard-coded | Production shows a demo key count and a wallet that is not the customer's; the checklist lies in both directions | Mode-aware data access; checklist items become real probes or are removed |
| F16 | all fetch callers | no shared client: hand-rolled `fetch` + `as` casts, no retry, no `res.ok`, no abort, no types | Every component re-invents the same four bugs | One small typed `apiFetch` in `apps/router/src/lib/` that throws on `!res.ok` with the parsed `{error}` — *not* a new package, and not SWR/React Query (server components remove the need) |
| F17 | `components/product-detail.tsx`, `market-banner-carousel.tsx` | empty states `暂无相关模型` / `暂无轮播物料` | 禁七-shaped copy; lint does not fire because `apps/router` is ungoverned | Rewrite as specific copy; extend the microcopy allowlist path if the owner wants it enforced |

### 8.3 Order to fix

`F4` and `F15` first — they are the ones that make the product *misreport reality*. Then `F1/F5/F7` (errors that
masquerade as data), then `F10/F14` (secrets and localhost), then the rest.

---

## 9. Decisions the owner must make before P0 can be built

Each blocks a P0 row above; none can be resolved by an agent reading the code.

1. **Which ledger is truth?** Router edge → `UsageLedger` (tokens, **no cost**); gateway relay → `RequestLog`
   (tokens + `cost` Decimal) → `/usage/*`. U1/U6 cannot be built until one carries cost per request.
2. **Wallet backing key.** `createCreditLedgerWallet` maps to `@nebutra/billing/credits`, keyed by
   `organizationId`; `resolveSessionTenantId()` returns `Tenant.id`, and personal tenants have no org. C1 needs
   this reconciled.
3. **Payment rails.** Until a real rail exists, `/wallet` must say "mock" in a way a customer cannot misread (C3).
4. **`/v1` rewrite scope.** `/v1/chat` and `/v1/wallet/topup` are currently public and unauthenticated through
   the `next.config.ts` rewrite. Remove from the rewrite, or auth them (C2, PG1).
5. **Which relay is canonical.** The raw New-API edge (all protocols, no balance guard) or the gateway relay
   (balance + BYOK + billing, chat only). A7 is the largest single decision here.
6. **Multi-instance Router?** In-memory plan/login maps (A9) are fine on one Machine and broken on two.
7. **KYC / real-name.** SF makes it mandatory; 302 makes it a discount gate. CN-market posture question (T5).
8. **Supply-path disclosure.** Design §5.4 leaves "which supply served this" optional/redacted. Decide once (A6).
9. **Currency.** Wire FX or delete the dropdown (PR5) — do not leave it.
10. **`/product` sitemap entry and the `TOOL_TAXONOMY` localhost hrefs** — delete or implement (M11, M13).

---

## 10. P0 bundle — what "a credible station" means

Fourteen rows carry P0. They group into four shippable batches, each independently reviewable, in the closure
phase's "one risk per PR" spirit.

| Batch | Rows | Theme |
|---|---|---|
| **B1 — Stop lying** | M5, PR5, C3, X3, X5, F4, F15, F17 | Nothing on screen may claim to be real when it is not: fake "hot" sorting, dead currency control, mock top-up copy, localhost URLs, an OpenRouter catalog sold as our shelf, a demo key count in production mode |
| **B2 — Close the money and auth holes** | C1, C2, K7, PG1, A7 | Real wallet, no unauthenticated mutation on a public path, one canonical relay with a balance guard, no canned model replies |
| **B3 — Make usage visible** | U1, U2, U6, K1, K2 | The usage page, real dashboard numbers, key costs and expiry — all from aggregates that already exist in `backends/gateway/src/routes/ai/` |
| **B4 — Publish the rules** | PR1, C9, H1, H2, H3 | A price page, a refund policy, the billing model in one paragraph, the real rate limit, and legal footer links that are not `/docs` |

Batch B1 is a day of work and changes the product's honesty more than anything else in this document.
