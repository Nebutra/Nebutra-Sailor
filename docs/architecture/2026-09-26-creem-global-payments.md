# Creem for global payments

- **Date:** 2026-09-26
- **Status:** Accepted. Amends the payments line of ADR 2026-09-24 Sailor convergence.
- **Owner:** Tseka Luk
- **Related:** ADR 2026-09-24 Sailor convergence, ADR 2026-09-25 payment orders

## Context

ADR 2026-09-24 settled payments on two providers, the legal pair: Stripe for cards worldwide, and
WeChat Pay / Alipay for mainland China. The Nebutra instance is operated by a mainland company.
Stripe does not onboard mainland entities, and selling abroad directly would also mean registering
for sales tax or VAT in every country that requires it. The card rail in the ADR could not be
opened by the company the ADR was written for.

A merchant of record solves both problems. It is the seller in law: it takes the card, charges and
remits the tax, and pays the merchant out. Creem is one, and it onboards mainland sellers.

## Decision

**The pair becomes Creem (cards, worldwide, merchant of record) + WeChat Pay / Alipay (mainland).**
There are still exactly two providers, one per legal region, as ADR 2026-09-24 requires.

- `method: "card"` on a payment order routes to Creem. It is live when `CREEM_API_KEY` and
  `CREEM_PRODUCT_ID` are set.
- **One Creem product carries every offer.** A one-time product in the Creem dashboard is opened
  per checkout with `custom_price` (minor units, 100–99,999,999), so the offer catalog stays the
  only place a price is written. The order id travels as `request_id`.
- **Webhook:** `POST /api/webhooks/creem`. The `creem-signature` header is the hex HMAC-SHA256 of
  the raw body under `CREEM_WEBHOOK_SECRET`. `checkout.completed` settles the order. Its
  `order.amount` is compared with the locked price **before tax**, because Creem adds tax on top as
  merchant of record, and the offer's price is what we charged.
- **Reconcile:** a pending Creem order is checked with `GET /v1/checkouts?checkout_id=…`, so a lost
  webhook costs minutes, not a sale.
- **Refunds are full only.** Creem's `POST /v1/refunds` takes a `transaction_id` and refunds the
  full remaining amount, with no amount and no idempotency key. `refundPaymentOrder` refuses a
  partial refund with `REFUND_PARTIAL_UNSUPPORTED` before calling Creem, finds the transaction by
  Creem order id, and treats an already-refunded transaction as done.
- Hand-rolled against the REST API (https://docs.creem.io), with no SDK. This is the same reasoning
  as the wallet adapters: the key never passes through an unaudited dependency.

## Consequences

- Payouts arrive from Creem in USD. How they reach the company account (a foreign-currency
  account, or Airwallex and then conversion) is an operations decision, not a code one.
- **Stripe is retired from new work.** The existing Stripe code for subscriptions, the billing
  portal, the licence webhook and legacy credit sessions stays until those surfaces move. Nothing
  new is built on it. When subscriptions arrive, they are Creem subscriptions (`subscription.*`
  events) through the same payment-order and fulfillment seams.
- Setup for an operator: create the one-time product, then set `CREEM_API_KEY`,
  `CREEM_PRODUCT_ID` and `CREEM_WEBHOOK_SECRET`, plus `CREEM_TEST_MODE=true` against
  `test-api.creem.io`. Point the Creem webhook at `https://<gateway>/api/webhooks/creem`.
