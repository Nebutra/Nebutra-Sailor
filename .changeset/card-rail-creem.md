---
"nebutra": patch
"create-sailor": patch
---

Update the card-rail capability check and scaffold copy from Stripe to Creem
(ADR 2026-09-26): `nebutra status`/`sync` now check `CREEM_API_KEY` and
`CREEM_PRODUCT_ID` for the `billing` capability's card provider, and
`create-sailor`'s help text and README describe Creem (cards worldwide,
merchant of record) + WeChat Pay/Alipay as the current payments pair. Stripe
env vars and code remain read only by the legacy `credit_purchase` checkout
path and are no longer advertised as the current or recommended rail.
