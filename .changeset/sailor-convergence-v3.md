---
"@nebutra/identity": major
"@nebutra/billing": major
"@nebutra/search": major
"@nebutra/permissions": major
---

One stack (ADR 2026-09-24 Sailor convergence, amended 2026-09-26). The
`@nebutra/*` packages now ship one provider per domain; everything else is
removed, not deprecated.

- `@nebutra/identity`: the Clerk and Auth.js adapters are gone; Better Auth is
  the only identity source.
- `@nebutra/billing`: Polar and LemonSqueezy are gone. The card rail is Creem
  (merchant of record) with WeChat Pay / Alipay for the mainland; Stripe stays
  only to complete checkouts opened before the switch.
- `@nebutra/search`: Meilisearch, Typesense and Algolia are gone; search runs on
  Postgres (pgvector + full-text).
- `@nebutra/permissions`: OpenFGA is gone; CASL is the engine.
- Also narrowed across the group: queue is QStash only (BullMQ/SQS removed),
  notifications are built-in (Novu/Knock removed), webhooks are built-in (Svix
  removed), uploads are S3-compatible (Vercel Blob removed), SMS is Twilio
  Verify + Aliyun (Tencent removed), email is Resend (Nodemailer removed).

Migrating: drop the removed provider env vars, set the keys for the kept
provider, and run `nebutra status` to see what is live.
