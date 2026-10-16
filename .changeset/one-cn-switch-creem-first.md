---
"@nebutra/contracts": minor
"@nebutra/billing": minor
"create-sailor": patch
---

`NEBUTRA_LOCALE=cn` is now a real runtime switch. `@nebutra/contracts/market` reads it (and `NEXT_PUBLIC_NEBUTRA_LOCALE` on the client, with `NEBUTRA_REGION` / `NEXT_PUBLIC_REGION` kept as aliases). Checkout detection is Creem-first and puts WeChat Pay / Alipay first under `cn`; the legacy Stripe adapter is no longer auto-detected from `STRIPE_SECRET_KEY` and runs only with `BILLING_PROVIDER=stripe`. Every scaffold now ships the mainland compliance pieces (ICP / 公安备案 footer, AIGC disclaimer), switched on at runtime.
