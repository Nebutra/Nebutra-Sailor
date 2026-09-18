# Completeness critique — 302 parity research round 1

Date: 2026-09-09. Role: completeness critic. Inputs: everything in
`.trellis/tasks/09-08-router-302-parity/research/` — the six sweep reports
(`302-market`, `302-price`, `302-docs`, `302-console`, `302-help`, plus
`openrouter`, `siliconflow`, `our-router`) and the three synthesis documents
(`entity-model.md`, `gap-analysis.md`, `prd.md`) — plus spot verification
against the repo (`packages/platform/db/prisma/schema.prisma`,
`packages/commerce/billing/src/credits/service.ts`,
`apps/router/src/lib/listing-catalog.ts`, `apps/router/next.config.ts`) and
against the captured artifacts.

## 0. What actually checks out

Stated first, because most of this critique is negative and the corpus is
genuinely strong in places:

| Claim | Verified how | Result |
|---|---|---|
| `302-products-dump.json` = 1,608 published SKUs, `api_model` 680 / `api_service` 859 / `tool` 69 | parsed the JSON | ✅ exact |
| `302-market.md` §7 enumerates **every** SKU in the dump | set difference of `name` against the §7 body | ✅ 0 missing — this is the most complete artifact in the sweep |
| `302-price.normalized.json` = 430 tables / 3,695 rows | parsed the JSON | ✅ exact |
| Every screenshot cited in the five 302 reports, `openrouter.md` and `siliconflow.md` §5 | `ls` of `shots/`, `shots/302-console/`, `shots-openrouter/`, `shots-siliconflow/`, `shots-help/` | ✅ all present (42 console shots, 18 OR, 9 SF, 9 help) |
| `/v1/:path*` → `/api/v1/:path*` rewrite (basis of "`/v1/wallet/topup` is a public unauthenticated mutation") | `apps/router/next.config.ts:32` | ✅ holds |
| `UsageLedgerEntry` already has `unitCost` / `totalCost` / `currency` / `quantity` / `unit` (prd §7.7) | schema L1285-1314 | ✅ holds |
| `Invoice` / `InvoiceItem` / `Payment` / `PaymentMethod` / `Referral` / `RedemptionCode` / `Notification` exist (prd §7.3, entity §8.4/§13) | schema | ✅ holds |

Unreferenced strays: `research/` root contains ~20 screenshots no report's §5
cites (`token.png`, `price.png`, `model-leaderboard.png`, `home_tool.png`,
`list_llm_p2.png`, `detail_gpt6.png`, `faq.png`, `contact-us.png`, the
`dash-*.png` set — the last of which is duplicated inside `shots-302help/`,
a directory named "help" that contains console captures). Provenance for these
is undocumented; they look like carry-over from the 2026-07-23 study. Fix the
naming or delete them — right now a reader cannot tell which pass produced them.

---

## 1. 302.AI surfaces not reached, or reached only shallowly

Ordered by how much they matter to the parity decision.

### 1.1 Not reached at all — and load-bearing

| URL | Why it matters | Report that admits it |
|---|---|---|
| `https://all.302.ai/#/` (Omni Toolbox: Chat-bot / Drawing-bot / KB-bot / Tool market) | **The entire "use" half of 302 is unmapped.** Our `/use` page is nominally at parity with this, and `prd.md` §5.2 specifies `/use` without a single observation of the thing it copies. The consent screen was captured; nothing behind it. | `302-console.md` §6.2 |
| Live API calls with the owner key — `GET /v1/models`, `GET /dashboard/prices`, `GET /dashboard/record/{id}`, `GET /dashboard/api-record`, `GET /v1/status` | The **entire price/usage contract** is inferred from Apifox YAML, never exercised. `302-docs.md` §6.1 flags that `/v1/models`' promise of per-model pricing contradicts its own schema, and nobody resolved it. `gap-analysis` PR1 and `prd` §6.1/G3 build a whole price service on this unresolved point. | `302-docs.md` §6.1, §6.2 |
| Response headers on a real 302 call (`request-id`, any `x-ratelimit-*`), and a real 429/402 body | Rate limits are the single biggest unknown in the corpus. 302's marketing claims "No TPM or concurrency limits for any user"; the docs document only a 429 row. **Nobody tested it.** `gap-analysis` H2 rates "state the real limit" **P0** while having no data on what 302's real limit is. | `302-docs.md` §6.2, `302-help.md` §6.4 |
| `https://302.ai/product/detail/<alias>` → **Playground** (724 SKUs carry `playground_support`) | The PDP's most important conversion control was never opened. `prd` §5.1 PDP acceptance says "Playground" without knowing what 302's does. | none — silent gap |
| Suffix ≡ param equivalence on `/v1/messages` and `/v1/responses` | `entity-model` §4.2 calls this "the single most reusable router idea"; only the `/v1/chat/completions` case is documented. | `302-docs.md` §6.6 |
| `api.302ai.cn` vs `api.302ai.com` (the CN forward host), and whether the CN catalogue/price differs | The PDP has a `Production Environment / CN Forward` tab; `302-help` found a third `/cn` path variant in the iOS doc. A CN-facing station has to answer this. | `302-docs.md` §6.3, `302-market.md` §6.4, `302-help.md` §6.5 |
| Real recharge checkout for the minimum amount (fee actually charged, whether $5 minimum still applies) | `302-console` read the fee **table**; `302-help` records a contradiction (EN FAQ "$5 minimum", zh FAQ dropped it). `prd` §5.2 specifies a fee-math modal copied from an untested table. | `302-help.md` §6.1, §6.2 |

### 1.2 Reached but shallow (structure captured, behaviour not)

- `https://302.ai/dashboard/*` **edit** dialogs — API key edit, bot edit, agent edit, `/external-resource/custom-model` edit (where `Forward Region` / `Backup model` live). Only create forms were opened, and `302-console.md` §6.6 explicitly assumes edit ≡ create.
- `/user-center/team` — no sub-account exists on the account, so the nested per-sub usage table, the CSV export and the sub-account's own login shell are **headers only** (§6.7). `302-help` §6.6 additionally cannot say what a sub-account's "额度限制" resets on.
- `/user-center/charge` → `Check The Bill` — click produced nothing; the invoice path is unknown (§6.4).
- `/dashboard/overview` filters — `Account Type` and `Time Particle Size` option lists never rendered (§6.3).
- `/user-center/real-name-auth` — the two entry cards were seen; neither flow was entered.
- `/developer/paywith302` — `Apply` never clicked; the merchant onboarding fields are unknown (correctly out of scope, but record it).

### 1.3 Not visited, lower value but named in reports

`https://302.ai/model-leaderboard` (the pill-nav target; `/model-rank` *was*
captured — the two are different routes), `/search`, `/stripe`, `/charge`,
`/302ai/register`, `/notFound`, `/legal/privacy`, `/intellectual-property`
(`/legal/terms` and `/refund-policy` were WebFetched, not screenshotted),
`https://news.302.ai/`, `https://studio.302.ai/`, `https://302.ai/download/`,
`https://www.proxy302.com/` (shares the 302 balance — a money-model detail),
`price.302.ai/ja/` and `/ru/` (whether the ru catalogue differs from en),
the 69 tool SKUs' detail pages and their `jump_url` targets
(`https://media.302.ai`, `https://gpt-image-canvas.302.ai/`),
`/api/cache/product-detail` (param key never discovered) and the upstream route
table entries `/products/openapi/{product_id}`, `/products/feature`,
`/products/specialty_products`, `/products/favorites/*`, `/products/recent-views/*`.
8 of 1,975 doc.302.ai pages failed to download and were never retried.

### 1.4 Asymmetry that distorts the whole comparison

302 got a **1,608-row product dump** and a **3,695-row price dump**. OpenRouter
and SiliconFlow got prose only — no `GET /api/v1/models` capture, no
`/endpoints` capture, no `GET /v1/models` from SiliconFlow. So every
"302 does X / OR does Y" table in `gap-analysis.md` compares a measured corpus
against a read web page. That is why OR/SF rows are systematically vaguer, and
it is the cheapest thing to fix (both endpoints are public and unauthenticated).

Console coverage is worse: **OpenRouter's entire signed-in console and
SiliconFlow's entire console are unverified** (`openrouter.md` §6.1,
`siliconflow.md` §6.1 both say so plainly). Yet those two consoles supply most
of the "converge on OR/SF" recommendations in `entity-model.md` §7, §8, §10.

---

## 2. Claims in the synthesis that are unverified or contradict a sweep

### 2.1 Hard contradiction between synthesis documents — and both are partly wrong

**The wallet keying question.**

- `our-router.md` §7.2, `gap-analysis.md` §9.2 and `entity-model.md` §15.3 all
  state that `@nebutra/billing/credits` is keyed by `organizationId` while the
  Router resolves `Tenant.id`, and treat this as a blocker for C1.
- `prd.md` D2 states the opposite: "The schema already keys `CreditBalance` on
  `tenant_id` — the feared org/tenant mismatch does not exist."

Verified: `schema.prisma:1320` — `CreditBalance.tenantId String @unique` with an
FK to `Tenant`. **prd D2 is right on the schema; the other three are wrong.**

But prd D2 is right for the wrong reason and closes the question too early.
`packages/commerce/billing/src/credits/service.ts` names the parameter
`organizationId` throughout (L97, L137, L206), assigns it to `tenantId` in the
`where` clause (L107, L145), returns it as `organizationId` in the DTO (L121),
and — the part nobody mentions — calls `requireTenantDb(organizationId)`, i.e.
the credits service runs through the **RLS-scoped** client. Two real questions
survive: (a) does `requireTenantDb` accept a personal tenant id, or does it
expect an org-scoped context? (b) `balanceCache` is a **module-level Map**
(L86-L126) — a per-instance cache on the balance that Batch A's admit/guard
depends on, in an app `our-router.md` §7.6 already flags as possibly
multi-instance. Neither document mentions either. The decision should be
re-stated as "keying is fine; the RLS context and the process-local balance
cache are the actual work".

### 2.2 The plan reintroduces the defect it opens by condemning

`gap-analysis` U6 and `entity-model` §9.4 make "**two ledgers, no join**" the
headline defect. `prd.md` D1 resolves it by picking `UsageLedgerEntry` and
declaring `RequestLog` internal to the gateway — then §7.4 adds a **third**
per-request table, `RouterRequestLog`. Verified: `RequestLog` already exists in
the schema (L834, mapped `ai_request_logs`) with `requestId`, `model`, token
counts, `cost Decimal(10,6)`, `latencyMs`, `status`. The new table's columns are
a superset of it by six fields. Nothing in the PRD argues why the existing
`ai_request_logs` cannot carry `ttfbMs`, cache-token columns, `supplyPath`,
`clientIp` and `expiresAt`. **Three request stores after a batch whose stated
purpose is to end having two** — this needs an explicit answer before Batch B.

### 2.3 The PRD silently overrides the entity model on vendor identity

`entity-model.md` §1.1 spends a table arguing that **brand must be an entity**
(`key` normalised, `role: AUTHOR|HOST|BOTH`, logo, description, trust columns),
citing 302's `Minimax`/`MiniMax`, `Kling可灵`/`可灵`, `Baichuan Al`,
trailing-whitespace brands as the anti-pattern. `gap-analysis` M3 agrees.
`prd.md` §7.2 then adds `brand String? @db.VarChar(64)` to `ModelConfig` — a
free-text label, exactly the shape the entity model rejects — and leaves the
existing `provider AIProvider` column in place. Verified: `AIProvider` has
**five** values (`OPENAI ANTHROPIC GOOGLE SILICONFLOW CUSTOM`, schema L809)
while the shelf needs 19 (`listing-catalog.ts`) to 33 (302's LLM tag). So after
Batch D, `ModelConfig` carries one enum that cannot express the taxonomy and one
free string that can express it wrongly. Either the PRD should say it is
deliberately deferring the Vendor entity, or §7.2 should model it.

### 2.4 Claims that exceed their cited source

| Claim | Where | What the sweep actually says |
|---|---|---|
| "The same quota triple `Total / Monthly / Daily` appears on **five** objects including the API key — copy verbatim" | `entity-model` §10.1 | `302-console` §2.2 shows the key create form has **`Quota` + `Daily Quota` only** — no monthly; `302-help` §2.3 (`API-guan-li`) confirms 总额度/单日额度. Monthly appears on bots/agents/MCP/sub-accounts. The "one mental model, five reuses" line is the thing being copied, and it is not what was observed. |
| Gift/voucher balance is "a second bucket, **consumed first**" | `entity-model` §8.1 | `siliconflow.md` §6.3 lists exactly this as an **open question**: "Are 代金券 consumed before 充值余额, and do they expire? Release note only says 赠送余额转为代金券形式." The consumption order is invented. |
| PDP price comparison is "`302.AI · OpenAI Price · Compare (Original Price / +10%)`" | `gap-analysis` M7 | Those are the **price-site** (`price.302.ai`) column labels (`302-price` §3.2). The **PDP** table is `Model · Description · Context · Official Price · 302.AI Price · Official Price Gap` (`302-market` §2.4). Two surfaces conflated into one requirement. |
| `UsageRecord.subjectType ∈ {API_KEY, BOT, AGENT, MCP, SUB_ACCOUNT}` sourced to `302c` | `entity-model` §9.1 | `302-console` §3 observed **one** value, `API (<key name>)`, and hedges "presumably also robot types". The enum is inferred, not observed. |
| `Sku.paramSizeB`, `licenseName`, `maxOutputTokens` sourced to "SF international detail page" | `entity-model` §1 | `siliconflow.md` mentions the international site in one clause with **no URL, no screenshot, and no sweep** — §2.1 records that the CN square has no detail route at all. This source was never visited. |
| OR figures used as fact: low-balance default $100, 5.5 % card / 5 % crypto, 24 h refund window, credits expire after 1 year, 50/1,000 req/day, key-create dialog fields, workspace budget ladder, guardrail semantics | `entity-model` §7/§8/§10, `gap-analysis` C3/K2/H2/T1 | `openrouter.md` §6.1: every one of those consoles **redirected to `/sign-in`**; the section is explicitly "docs-derived". The provenance legend (`OR`) does not distinguish *observed* from *docs-derived* from *inferred*, so downstream tables read as observation. |
| SF invoice field set, recharge channel caps, L0–L5 per-model limits | `gap-analysis` C7/H2, `entity-model` §8.3 | `siliconflow.md` §2.2 marks the whole console table "**reconstructed from docs/links**" and §6.1 lists the same items as unverified. |
| "Our `/v1` edge is **genuinely at parity**" (A1: "not a gap") | `gap-analysis` §6 A1 | `entity-model` §4.1 marks **five** families missing on the same edge: Gemini raw `/v1beta/...`, `/v1/status`, realtime `wss`, `/v1/files`, `/v1/batches`, plus async video and the `/codex` sub-base. Both cannot be true; the PRD adopts the optimistic reading and never lists the missing families as scope. |

### 2.5 A repo claim that is imprecise in a way that changes the plan

`entity-model` §0.2 and §15.5 say `listing-catalog.ts` "**filters out** ids
containing `/`, `:`, `@`" and that the filter "must go". Verified — it is worse
and different:

- `bareId()` (L195-198) **strips** everything before the last `/`, so
  `Pro/BAAI/bge-m3` and `BAAI/bge-m3` collapse to the same shelf id. That is a
  silent collision, not an exclusion.
- `[:@]` ids are rejected (L290).
- **`/\d{8}/` and `/-20\d{2}-\d{2}-\d{2}/` ids are rejected** (L293-294).

That last rule is unremarked anywhere in the corpus and it matters: it
structurally removes every pinned-version SKU — `claude-opus-4-5-20251101`,
`gpt-5-2025-08-07`, `gemini-2.5-flash-preview-09-2025` — which are a large
fraction of 302's 678-SKU LLM tag (see `302-market` §7). Any "shelf size at
parity" argument is measuring a catalogue that cannot contain dated ids.

### 2.6 Two feasibility assumptions with no evidence anywhere in the corpus

1. **A price source for non-token SKUs.** `prd` Batch A prices "token,
   per-call, per-image, cache-split" and Batch D imports upstream prices "from
   models.dev / New-API inventory". No sweep establishes that models.dev
   carries per-image / per-second / per-character prices — it is an LLM
   catalogue. If it does not, the balance guard on `/v1/images/*` and
   `/v1/audio/*` (which the allow-list already exposes) cannot be priced, and
   `prd` G3 ("every price from one service") is unreachable for those paths.
2. **Deleting `demo-store.ts` is console-only.** `prd` Batch A says
   "explicitly not in A: any new page". Verified: `listing-catalog.ts:24-25`
   imports `getModelRoutes` from `@/lib/demo-store`, so the deletion reaches the
   **public shelf**, which `our-router.md` §6 does note but the PRD's batch
   boundary does not.

Related: `prd` G4's metric is `rg -n 'demo|mock' apps/router/src` returning only
tests. That is a string search, not a property; it will pass while
`ROUTER_USE_OPENROUTER_INVENTORY` still lets the shelf sell OpenRouter's
catalogue (gap X5, rated **P0**) because that flag contains neither word.

---

## 3. Entities in `entity-model.md` with no source

Grouped by what "no source" means, because they need different treatment.

**(a) No source in any of the three benchmarks — invented from the task brief.**
- `Key.ipWhitelist` / `refererWhitelist` — the document says so itself:
  "*neither 302 nor OR nor SF has this*". It is carried anyway with a suggested
  `KeyPolicy` json shape. Either drop it or mark it a Nebutra-original with its
  own justification.
- `Key.modelAllowlist` / `providerAllowlist` — sourced to OR **Guardrails**,
  which is an unverified signed-in surface (§2.4 above).

**(b) Internal design documents, not sweeps.**
- `SupplyEngine.class A|B|C` and `SupplyPath` priority semantics — from the
  forge design §5.2, correctly labelled `us`, but the legend has no code for
  "our own design doc" so it reads as observed.
- `PartnerCapacity` (§5.4, class C) — explicitly interface-only with no source;
  fine, but it is the only entity in the document with **zero** evidence and it
  should say "no benchmark analogue exists" rather than sit in a numbered
  section alongside observed entities.

**(c) Fields whose *existence* is observed but whose *semantics* are invented.**
- `Wallet.giftBalance` consumption order (§2.4).
- `Referral.cashbackRate` — 302's module is behind a "top up 100 PTC to unlock"
  paywall; `302-help` §6.7 records that **no rate is published anywhere**. The
  field has a name and no value source.
- `Referral.unlockCondition` — one observed banner on one account at one
  balance; treated as a rule.
- `User.kycStatus ∈ {NONE, PERSONAL, ENTERPRISE}` — 302 shows two entry cards;
  neither flow was entered; the enum is a guess (SF's is
  {未认证, 个人认证, 企业认证}, which is the same shape, so this one is low-risk).
- `Price.effectiveFrom` / `effectiveTo` — sourced to "SF price changes in
  release notes". Release notes are an announcement channel, not a price-history
  entity; no site was observed storing dated prices. OR charts price history but
  its data model for it was not captured.
- `Sku.weeklyTokens` / `weeklyCalls` — observed on OR cards, but the proposed
  derivation ("from our own `RequestLog`") presumes traffic we do not have; a
  "Popular" tab computed from near-zero traffic is the same honesty failure as
  the current fake `热门`.
- `Quota.strictlyDecreasing` — OR docs only, console unverified.

**(d) Fields observed once and generalised.**
- `TopUpOrder.orderNo` "18-digit numeric" — one example (`202608250100100925`).
- `APIKey` plaintext "`sk-` + 48 alnum" — from a masked display plus doc text;
  no unmasked key was (or should have been) recorded.

**Recommendation:** add a fourth provenance code to `entity-model.md` §0.1 —
`observed | documented | inferred | ours` — and stamp every row. Roughly a
third of the `OR` rows and most of the `SF` console rows are `documented`, not
`observed`, and three synthesis documents currently propagate them as fact.

---

## 4. OpenRouter / SiliconFlow features skipped that a mainstream station must have

"Must have" here = a buyer or a client library expects it, and its absence is
noticed. Sorted by consequence.

| # | Feature | State in the corpus | Why it cannot stay deferred |
|---|---|---|---|
| 1 | **Batch API + batch price tier** (SF `/v1/batches` with 24 h–336 h windows, 50 % of realtime; OR `:batch` variant, 50 % off) | `entity-model` §4.1 "missing"; `gap-analysis` D7 **DEFER**; `prd` — absent entirely | Batch is the standard way to buy tokens cheaply. Both benchmarks that publish prices publish a batch price; 302 has none and that is **302's** gap, not a reason for ours. At minimum it needs a written "no batch in 2026" decision, not silence. |
| 2 | **Files API** (`POST/GET /v1/files`) | `entity-model` §4.1 "missing"; nowhere else | Batch depends on it, and a growing set of clients (assistants-style, document workflows) probe it. It is one allow-list entry plus object storage we already have (`@nebutra/uploads`). |
| 3 | **`models[]` fallback array + failover semantics** | `gap-analysis` A5 declares this "**not a gap**" citing the forge design's single-product-path stance | Conflates two things. *Letting the customer choose a supply class* is out of scope; *the request not dying when one upstream 5xxs* is the product. `proxyChatCompletions()` already implements fallback and is dead code. OR's `models[]` is one field. Without it, "router" is a proxy. |
| 4 | **Rate-limit headers + a published limit** (`X-RateLimit-*`, `Retry-After`, OR's concrete req/day ladder, SF's L0–L5 with 7 metrics) | `gap-analysis` H2/A4 rate it **P0/P1**; `prd` §6.1 mentions only `Retry-After` on 429 and no batch owns publishing the number | A prepaid buyer's second question after price is "how fast can I go". We have exactly one enforcement knob (`APIKey.rateLimitRps`, default 10) and it is invisible. Publishing "10 rps per key, no TPM cap" is a day of work and is more credible than 302's unbacked "no limits". |
| 5 | **Deprecation as an entity + notice window** (SF: release notes are *the* deprecation channel, fixed 7-day notice, model-id lists; OR: `expiration_date`, "Show deprecated" facet, deprecation alerts, migration snippet on the card) | `entity-model` §15.7 calls it a first-pass primitive; `prd` §7.2 has **no** `deprecatedAt` / `retiresAt` / `replacedBySkuId` and no changelog surface | Models die weekly upstream. A station that silently 404s a model id has broken every customer's config with no warning. This is cheap (three columns + one page) and is a trust primitive, not polish. |
| 6 | **Model variants / alias grammar** (OR `:free :nitro :floor :exacto :online :thinking :batch`, `~family-latest`; 302 suffix ≡ param) | `gap-analysis` D6 **DEFER to a design decision** | Partly agreed — but the narrower case is forced on us: upstream New-API already exposes `-thinking`, `-web-search`, `-search` variants (visible throughout `302-market` §7 and our own inventory). Without any variant concept the shelf either hides them or lists them as unrelated models. Decide the *listing* rule now even if the *routing* grammar waits. |
| 7 | **Provider trust columns** (OR `/providers`: trains-on-prompts, retention `Zero / N-day / Retains`, BYOK, headquarters, ToS/privacy links — and the same policy as a request-time knob `data_collection` / `zdr`) | `entity-model` §1.1 models them; `gap-analysis` and `prd` drop them entirely | For any enterprise or CN-compliance buyer this is the purchase-decision surface, and it is also the honest answer to "where does my prompt go" for a relay that fronts OAuth account capacity. Dropping it silently between the entity model and the PRD is the largest unexplained scope deletion in the corpus. |
| 8 | **Zero-completion insurance / not billing failures** (OR: not billed when `completion_tokens == 0` with blank finish reason, or `finish_reason == "error"`; mid-stream error chunk shape) | `prd` J3 covers non-2xx → zero-cost ledger row; the *streamed 200-with-error* case is uncovered | This is the single most common billing dispute for a relay. Cheap to specify, expensive to retrofit after the first angry customer. |
| 9 | **Public catalogue JSON with the same params as the UI** (302 `/api/cache/product-list`, OR `/api/v1/models` with 18 filter params) | `entity-model` §15.6 flags it; `prd` puts `GET /api/console/v1/catalog` under a **console** prefix and gives public `GET /v1/models` only `?llm=1` | The unauthenticated shelf endpoint is what makes the catalogue SEO-able, agent-readable and self-documenting. Both benchmarks have it. Putting it under `/api/console/` inverts the intent. |
| 10 | **Gift / voucher bucket as a distinct, non-refundable balance** (SF 代金券; 302 `FREE` column on bill rows) | `prd` §7.3 has `TopUpOrder.bonus` but no separate bucket and no consumption rule | The refund policy (`gap-analysis` C9, rated P0) is unwritable without it: "gifted credits are never refundable" is meaningless if gifted and paid credits are one number. |
| 11 | **Auto top-up** (302: Stripe, min $5 / threshold $1, **waives the top-up fee**; SF: Alipay auto-recharge with per-txn/day/month caps) | `gap-analysis` C5 **DEFER until C3**; `prd` — absent | Correct to sequence after real rails, but it is the retention mechanism of every prepaid station and the fee waiver is the incentive that makes prepaid tolerable. Should be a named row in a batch, not a defer. |
| 12 | **Snippet/request builder** (OR `/request-builder`: model picker → cURL/Python/TS; six SDK tabs on every model page) | `prd` `/docs` has six hand-written snippets with hard-coded model ids | The generated-from-the-picker version costs little once the catalogue is data and removes the "which model id do I paste" step that both 302 and OR treat as the main conversion friction. |
| 13 | **CN legal/compliance block** (SF footer: ICP 备案, 公安备案, 增值电信许可证; 数电发票 fields; mandatory 实名认证 since 2026-05-15) | `gap-analysis` H3 mentions 备案 in passing; `prd` §5.1 `/legal/*` lists terms/privacy/refund only; KYC is a stated non-goal | If any CN rail (Alipay/WeChat via the ChinaPay provider named in `prd` Batch C) is enabled, real-name and 备案 are **PSP preconditions**, not features. This should be recorded as a dependency of Batch C, not a deferred feature. |
| 14 | **BYOK anywhere** | `prd` §2 non-goal: "the gateway already has `/api/v1/ai/provider-keys`; Router links to it" | `our-router.md` §2.3 shows the gateway has the *API* and no UI. "Links to it" links to nothing. Either ship the link target or say plainly that BYOK does not exist in 2026. |

Two things the corpus was **right** to skip, recorded so they are not revisited:
model leaderboards / benchmark harnesses (no signal, faking one is the exact
failure mode being avoided), and 302's developer revenue-share / withdrawal /
Pay-with-302 / agent-MCP-sandbox surfaces (they require VPS compute, an
explicit non-goal).

---

## 5. What the next research round should target

Five rounds, ordered by value-per-hour. Rounds A, C and D need owner consent
(money or an account); B and E do not.

### Round A — 302 live API with the owner key (highest value, ~$0.10, needs consent)

Everything here resolves a P0-blocking unknown that no amount of page-reading can.

| Call | Question it answers |
|---|---|
| `GET https://api.302.ai/v1/models?llm=1` and `?llm=0&include_custom_models=1` | Does the model list carry pricing, as the description claims and the schema denies? (`302-docs` §6.1) |
| `GET https://api.302.ai/dashboard/prices?path=/chat/completions&lang=en` | The **machine** price contract. Compare row count and unit vocabulary against the 3,695 static rows we already have — this is the single best test of whether 302's free-text unit chaos is presentational only. |
| `POST /v1/chat/completions` (1 token, cheapest model), capture **all** response headers | Is there an `x-ratelimit-*` family? What exactly is in `request-id`? |
| `GET /dashboard/record/{request-id}` immediately after | Latency to ledger visibility; the exact cost/token payload. |
| `GET /dashboard/api-record?page=1&limit=50&start_time=&end_time=` | Pagination envelope and time-unit conventions for our `/usage` page. |
| `GET /v1/status?model=gpt-4o-mini` | The cheap health signal `gap-analysis` A8 wants to copy. |
| `POST /v1/messages` and `POST /v1/responses` with `model: "<id>-web-search"`, then the same with `{"web-search": true}` | Is suffix ≡ param really universal, or chat-only? (`302-docs` §6.6) — this decides whether `entity-model` §4.2's "most reusable idea" is real. |
| Same minimal call against `https://api.302ai.cn` and `https://api.302ai.com` | Which CN host is canonical; is the model list or price different? (`302-docs` §6.3) |
| One deliberate `402`: drain a scratch key's daily quota via a 0.01-quota key | The insufficient-balance envelope and whether the failed call is billed. |

Do **not** probe 429 by flooding. Instead ask support, or infer from the
presence/absence of rate headers.

### Round B — 302 surfaces never walked (browser, read-only, no consent needed beyond the existing session)

1. `https://all.302.ai/` — authorize once (this is the one state-changing step;
   the Quick-Start key already exists per `302-console` §6.1), then walk:
   Chat-bot, Drawing-bot, Knowledge-Base-bot, App-bot, Tool market, share-code
   flow, the resulting row in `/use-online/app-manage`. **Questions**: what does
   a hosted bot actually give the buyer that an API key does not; what is the
   share-code security model; where does chat history live; how is per-bot spend
   shown. This is the parity target for our `/use` page and it is a blank.
2. `https://302.ai/product/detail/openai-gpt-6-astra` → **Playground**.
   **Questions**: is it in-page or a redirect to `all.302.ai`; does it consume
   balance; does it show tokens/cost per turn; is a key auto-provisioned.
3. Edit dialogs: `/api-keys/list` (edit), `/external-resource/custom-model`
   (edit → `Forward Region`, `Backup model`, `【检查】` behaviour),
   `/use-online/app-manage` (edit). **Question**: do edit forms expose fields
   the create forms hide (`302-console` §6.6 assumed not).
4. `/user-center/team` → create **one** sub-account on a throwaway address.
   **Questions**: what does the sub's own login shell look like; what are the
   nested usage columns and the CSV header; what does "额度限制" reset on
   (`302-help` §6.6).
5. `/user-center/charge` → start a $5 checkout to the payment-method screen
   (**do not pay**). **Questions**: is the $5 minimum still enforced; is the fee
   the table's fee; what does `Check The Bill` do on a real order.
6. `/model-leaderboard` (distinct from the captured `/model-rank`), `/search`,
   `price.302.ai/ru/` and `/ja/` (confirm the ×78 / ×147 constants and whether
   the ru catalogue is a subset).
7. Tool-side: three tool SKU detail pages + their `jump_url` targets
   (`media.302.ai`, `gpt-image-canvas.302.ai`). **Question**: is a "tool" a
   separate app with its own auth, or a skin over the same key?
8. `/api/cache/product-detail` — discover the param key by reading the Nuxt
   bundle's route table; then fetch `/products/openapi/{product_id}` for a SKU
   whose `product-detail-openapi` is non-null. **Question**: is there a
   per-SKU OpenAPI spec we could mirror for our PDP "接口" table?
9. Retry the 8 failed doc.302.ai pages.

### Round C — OpenRouter, signed in (free account, owner action) + public JSON

The console is the source of most "converge on OR" advice and none of it is
verified.

- Capture as JSON, the way 302's dump was captured (public, no auth):
  `GET https://openrouter.ai/api/v1/models`,
  `…?category=programming&supported_parameters=tools&sort=pricing-low-to-high`
  (verify which of the 22 UI sort keys the API accepts — `openrouter.md` §6.4),
  `GET /api/v1/models/anthropic/claude-fable-5.1/endpoints`,
  `GET /api/v1/providers` if it exists. **This closes the corpus asymmetry in
  §1.4 for a few minutes of work.**
- Signed in: `/workspaces/default/keys` (create dialog fields and validation,
  per-key usage columns), `/settings/credits` (purchase dialog, fee display,
  refund copy), `/activity` (columns, filters, **export CSV header**), `/logs`,
  `/settings/notifications` (real defaults — is Low Balance really $100?),
  `/settings/presets`, `/settings/privacy`, `/workspaces/default/byok`.
- Unopened public pages: `/ori`, `/labs`, `/business`, `/status`.
- **Questions**: exact key-create validation rules; what a budget breach
  actually returns (403 body); whether guardrails are per-key or per-member in
  the UI; how "Weighted Avg Input Price" is computed (§6.6).

### Round D — SiliconFlow, signed in (CN phone, owner action) + public JSON

- Public, no auth: `GET https://api.siliconflow.cn/v1/models?type=text&sub_type=chat`
  (and each `sub_type`) — the CN catalogue as data.
- Signed in: `/account/ak` (key table columns — are there per-key limits at
  all?), 账户余额 / 充值 / 账单 / 费用明细 / 发票申请 (exact paths + field
  sets), `/me/models` detail for one chat model (**per-model rate limits at this
  account's L-level** — `siliconflow.md` §6.4), `/playground/chat`.
- **Questions**: 代金券 consumption order and expiry (§6.3 — currently invented
  in `entity-model` §8.1); do teams/sub-accounts exist at all (§6.1); does
  `/v1/messages` require `anthropic-version` (§6.5); which price is
  authoritative when `/models` and `/pricing` disagree (§6.2).

### Round E — our own side (no browser, no consent; do this first, it is free)

`our-router.md` is a **static** code audit — "no server was started". Every
"mocked / partial / real" status, and every one of the 17 frontend defects, is
inferred from source. Before a PRD hangs six batches on it:

1. Run `apps/router` and capture the five console pages plus `/`, `/models`,
   a PDP. **Question**: do the four states (loading/empty/error/unauthorised)
   fail the way the audit predicts?
2. Run the shelf with `ROUTER_USE_OPENROUTER_INVENTORY` **off** and a real
   New-API behind it. **Question**: how many models remain `sellable`? Every
   "shelf at parity" claim depends on a number nobody has measured, and gap X5
   rates shipping the OpenRouter-backed shelf a P0 honesty defect.
3. Grep `@nebutra/ai-providers` / models.dev for **non-token pricing**
   (per-image, per-second, per-character). **Question**: if it is absent, what
   prices `/v1/images/*` and `/v1/audio/*` — because those paths are already
   allow-listed and Batch A's guard must price them or refuse them.
4. Read `requireTenantDb()` and the credits `balanceCache` (§2.1 above).
   **Question**: does the credits service work for a personal tenant, and is the
   process-local cache safe under the admit/settle path?
5. Decide, in writing, the third-log question (§2.2) before Batch B is scoped.
6. Count what `/\d{8}/`-style id rejection removes from the current catalogue
   (§2.5). **Question**: is the parity shelf missing every pinned model id?

### Process fix to apply to round 2 regardless

- Add `observed | documented | inferred | ours` provenance to every row of
  `entity-model.md` and to the "302 does / OR-SF do" columns of
  `gap-analysis.md`. Roughly a third of the OR rows and nearly all SF console
  rows are `documented`.
- Keep a **coverage ledger**: one row per benchmark route, marked
  visited / screenshotted / not reached, checked into this directory. The
  reports each have a good §6 "open questions", but there is no single place
  that says what was never opened — which is why §1 of this critique had to be
  reconstructed from six separate sections.
- Name the stray screenshots in `research/` root or delete them (§0).
