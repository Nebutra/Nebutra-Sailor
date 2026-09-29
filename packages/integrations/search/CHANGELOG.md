# @nebutra/search

## 4.0.1

### Patch Changes

- Updated dependencies []:
  - @nebutra/logger@4.0.1

## 4.0.0

### Minor Changes

- [`d57958c`](https://github.com/Nebutra/Nebutra-Sailor/commit/d57958ce7314dfb0e69a120a5171797c135b7cb8) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - The pgvector provider now accepts an optional `db` adapter (`config.db`, or `createSearch({ db })`) — a `PgvectorDbAdapter` (`getSystemDb`/`getTenantDb`) the host injects so search reaches Postgres through the host's own connection pool, tenant RLS session, and any preview/Hyperdrive routing, instead of a private connection this package opens itself. Tenant-scoped operations route through `db.getTenantDb(tenantId)`.

  Omitting `db` keeps the previous behavior unchanged: the provider opens and owns its own `pg.Pool` from `connectionString` or `DATABASE_URL`. That path now logs a one-time deprecation warning and will be removed in a future major version — pass `db` instead.

### Patch Changes

- Updated dependencies []:
  - @nebutra/logger@4.0.0

## 3.0.0

### Major Changes

- [`6684e47`](https://github.com/Nebutra/Nebutra-Sailor/commit/6684e47930383dc572406c6f900827827375278b) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - One stack (ADR 2026-09-24 Sailor convergence, amended 2026-09-26). The
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

### Patch Changes

- Updated dependencies []:
  - @nebutra/logger@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/logger@2.0.0

## 0.1.2

### Patch Changes

- Ship the MIT LICENSE file these packages have always declared but never included.

  Every one of these declares `"license": "MIT"` in its manifest, and npm shows
  that on the registry page — but the tarball carried no licence text at all.
  MIT's own terms require the notice to accompany "all copies or substantial
  portions of the Software", so a consumer vendoring one of these packages had
  nothing to comply with.

  No code changes. This is the licence text only, published so the tarballs
  match what the manifests have been claiming.

  `tests/architecture/release-surface.test.ts` now asserts the LICENSE _file_
  exists and is MIT, not just the manifest _field_ — the field-only check is how
  this went unnoticed, and is also how `create-sailor` shipped the full AGPL-3.0
  text under an MIT declaration for its entire published history.

- Updated dependencies []:
  - @nebutra/logger@0.1.2

## 0.1.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/logger@0.1.1
