# Product wallets — one checkout, a balance per product

- **Date:** 2026-09-27
- **Status:** Accepted
- **Owner:** Tseka Luk
- **Related:** ADR 2026-09-25 payment orders (offer → order → fulfillment), ADR 2026-09-26 Creem for
  global payments

## Context

Nebutra sells more than one product, and they do not share a business model. The first three to
sell, and what each is benchmarked against:

| Product | Benchmarks | Business model |
|---|---|---|
| 观澜 Kuanlan | 剪映 / CapCut (and 即梦 for AI credits) | membership + credits |
| Para | RunningHub, LibTV / LiblibAI | membership + credits |
| Router | SiliconFlow, OpenRouter, 302.AI | prepaid balance, pay as you go |

The code assumed one wallet per organization: `credit_balances.tenant_id` is unique, and Kuanlan
(`@nebutra/billing` credits), Forge (`@nebutra/prepaid-wallet` over the same service) and Router
(`RouterBillingRepository` holds and settlement) all read and write that one row. A top-up bought
for Router could be spent on a Kuanlan shoot. There was also no real way to pay: Router had its
own console top-up, Forge a mock one, and Kuanlan none.

The owner's rule for decisions like these: follow the benchmarks first, innovate after
(先守正再创新). Every choice below cites what the benchmarks do. Evidence tiers: **O** read on an
official page or agreement, **I2** strongly implied or corroborated, **U** unknown.

## Decision

### 1. Payment is shared; what is sold, and the balance it feeds, belongs to a product

One merchant stands behind every rail (Creem, Alipay, WeChat Pay all contract with 无锡云毓智能科技有限公司),
so checkout, orders, webhooks, reconcile and refunds stay the single path of ADR 2026-09-25. Every
offer names its `product`, and fulfillment credits that product only.

Balances are **per organization per product** and never cross. ByteDance keeps 剪映, 即梦 and
CapCut on separate paid-service agreements and ledgers, with no cross-reference between them (I2:
three official agreements, none mentions pooling).

### 2. Credits are lots with an expiry, spent soonest-to-expire first

A grant is a **lot**: product, source, amount, remaining, expiry. The balance is the sum of the
unexpired remainders. A debit consumes lots in expiry order, and a nightly job expires what is left.

| Source | Expiry | Benchmark |
|---|---|---|
| `subscription` — a membership's periodic grant | end of that period, no rollover | 剪映 积分规则: 订阅积分 expires at the end of the subscription month (O); RunningHub member RH币 expire in 31 days (I2) |
| `purchase` — a credit pack | 2 years from purchase | 剪映, CapCut and 即梦 充值积分: 2 years (O, all three) |
| `promo` — sign-up, daily, campaign | set per grant | 即梦 赠送积分: same day (O); daily login drips on RunningHub, LiblibAI, 即梦 (I2) |

Spend order is soonest expiry first: CapCut states "subscription credits first, then activity,
then purchased" and 剪映 states nearest-expiry-first (both O). They agree in practice.

Router is the exception. Its balance is money, bought as `purchase` lots that **do not expire**
(302.AI: "valid permanently" (O); SiliconFlow: gifted balance has no expiry (O)). OpenRouter
reserves a 365-day expiry, which is the minority.

### 3. Units: Kuanlan and Para count credits, Router counts US dollars

- Kuanlan and Para each define their own credit, priced per action by the product (a shoot, a
  generation). What a credit buys is a product decision, not a platform one: RunningHub bills GPU
  seconds and LiblibAI bills per image or video, and the ledger supports either.
- Router's balance is **USD**. OpenRouter prices in dollars only and converts Alipay payments into
  dollar credits (O). 302.AI uses PTC, commonly pegged to $1 (U on the peg). SiliconFlow runs a
  separate RMB site with its own balance (O). Two of three hold one dollar-denominated balance, so
  Router does. A CNY top-up converts at a rate held in the offer catalog, as data.
- Router: no subscription (all three, O). Minimum top-up $5 (302.AI, O) and ¥50 when paid in CNY
  (SiliconFlow's floor, I2). No top-up fee (SiliconFlow and 302.AI state none; OpenRouter's 5.5%
  is the outlier). A custom amount is allowed above the floor.

### 4. Memberships (Kuanlan, Para)

A membership is a row: organization, product, tier, period start and end, and how it renews.
Buying a period extends `endsAt`. Each period grants that tier's `subscription` credits. An annual
membership grants monthly, from a cron.

Tiers follow the benchmarks' shape: a free tier with the core product and a small promo drip, then
two or three paid tiers, each a superset of the one below, differing mainly by monthly credits
(即梦 ¥79 / ¥239 / ¥649 for 1,080 / 4,000 / 15,000 credits, I2; 剪映 VIP 1,200 and SVIP 3,200
credits a month, O). Prices and tiers are data in the catalog and will change.

**Renewal.** The benchmarks sell both a single period and an auto-renewing one (连续包月) at about
25% less (剪映 SVIP ¥79 a single month, ¥59 连续包月, I2), with Alipay 代扣 and WeChat 委托代扣
as the CN rails and a reminder 5 days before each charge (O). Nebutra ships in two steps:

1. Now: single periods on every rail.
2. Next: auto-renew on card through Creem subscriptions, then on Alipay and WeChat once the merchant
   accounts are approved for recurring deduction. The discounted auto-renew price arrives with it.

### 5. Refunds

No refunds for purchases in principle. The exceptions are a platform fault or a duplicate charge,
and anything the law requires. Grants already consumed reduce the refund. This is the rule at 剪映
and 即梦 (O) and at 302.AI (O: platform-fault only, request within 7 business days). The admin
refund path of ADR 2026-09-25 carries it out. Customers have no self-serve refund.

### 6. Surfaces

- **Checkout** (`/checkout?offer=…&returnTo=…` on the dashboard app, `apps/web`): shows the product, the offer and the
  price. The buyer picks a live method, pays by redirect or QR, the page waits for settlement, then
  returns to `returnTo`. This is the only payment UI. `returnTo` must be a product origin.
- **Each product** owns its pricing or membership page, a balance chip in its header, and its
  insufficient-balance prompt, which opens checkout with a suitable offer preselected. Balances in
  the header are the benchmark convention (LibTV shows 积分 in every header, O).
- **Account ledger** (`/billing` on the dashboard app): orders and receipts across products. It is not a
  place to buy.
- Router's console top-up and Forge's mock top-up route to checkout.

### Not decided by this ADR

- Auto top-up for Router when the balance crosses a threshold (OpenRouter and 302.AI have it, O).
  It needs a saved card, which arrives with Creem subscriptions.
- 发票 (China VAT invoices). SiliconFlow issues them on request by email (O). Until Nebutra
  automates it, the same.
- Creator revenue share (RunningHub and LiblibAI pay authors when others run their work, I2). It
  belongs to the UGC ecosystem, later.
- Team plans (即梦 团队版 for 3 or more people, O).

## Consequences

- `credit_balances` is keyed by `(tenant_id, product)`, and a `credit_lots` table holds grants.
  Every credits call takes a `product`. Callers that do not pass one fail to compile, so nothing
  keeps spending the shared balance by accident. Existing rows are assigned to a product by a data
  migration that reads each transaction's `metadata.app`.
- `Offer` gains `product` and `kind` (`credits` | `membership` | `topup`). A `topup` offer
  takes a custom amount between a floor and a ceiling. The order request carries the amount, and
  the server still prices and locks it.
- The payment path of ADR 2026-09-25 is unchanged.
- A product that wants to sell registers offers and, if it sells something new, one fulfillment
  handler. It never touches payment code.

## Delivery

1. Balances per product, offers owned by a product, buyer-named top-up amounts, the `balance`
   fulfillment and Router's catalog (`ops/nebutra/offers.json`).
2. The checkout page, then Router's top-up routed to it.
3. Credit lots with expiry and memberships, then Kuanlan's and Para's offers.

Until step 3 lands, purchased credits do not expire, which is more generous than the rule above,
never less.

## Sources

- 剪映会员服务协议 — lf9-cdn-tos.draftstatic.com/obj/ies-hotsoon-draft/vco/f445affd-403f-4ddd-8f86-b7e29f5c6523.html
- 剪映积分规则说明 — lf26-cdn-tos.draftstatic.com/obj/ies-hotsoon-draft/vco/44b47133-7c7a-45d0-8beb-f2a1449ed898.html
- CapCut credits order — sf16-draftcdn-sg.ibytedtos.com/obj/ies-hotsoon-draft-sg/capcut/323d0899-733c-42e9-a68d-357b4b92e8cd_en.html
- 即梦付费服务协议 — lf3-cdn-tos.draftstatic.com/obj/ies-hotsoon-draft/dreamina/b966ce40-d931-4397-8def-38fe5d03c729.html
- OpenRouter FAQ — openrouter.ai/docs/faq
- SiliconFlow pricing and finance FAQ — siliconflow.com/pricing, docs.siliconflow.com/cn/faqs/misc_finance
- 302.AI pricing, auto top-up, refunds — help.302.ai/en/docs/API-Pricing, help.302.ai/en/docs/zi-dong-chong-zhi, 302.ai/refund-policy
- RunningHub billing and creator reward — runninghub.cn/bill-task, runninghub.cn/creator-reward
- LiblibAI VIP agreement and billing — liblib.art/document/vip_agreement, liblib.art/transaction
- LibTV observation (O, 2026-09-08) — research/competitors/libtv/
