# @nebutra/billing

## 4.0.0

### Patch Changes

- Updated dependencies []:
  - @nebutra/contracts@4.0.0
  - @nebutra/logger@4.0.0
  - @nebutra/metering@4.0.0

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
  - @nebutra/contracts@3.0.0
  - @nebutra/logger@3.0.0
  - @nebutra/metering@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [[`a29746f`](https://github.com/Nebutra/Nebutra-Sailor/commit/a29746fdd9eabdfb9c1692a2dc43fc7d5810779c)]:
  - @nebutra/contracts@2.0.0
  - @nebutra/logger@2.0.0
  - @nebutra/metering@2.0.0

## 0.1.3

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
  - @nebutra/contracts@0.1.2
  - @nebutra/metering@0.1.2
  - @nebutra/logger@0.1.2
  - @nebutra/db@0.1.2

## 0.1.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/contracts@0.1.1
  - @nebutra/logger@0.1.1
  - @nebutra/metering@0.1.1
  - @nebutra/db@0.1.1

## 0.1.1

### Patch Changes

- [`5d3d7e6`](https://github.com/Nebutra/Nebutra-Sailor/commit/5d3d7e6c59cae5aa242bb988b75a9888cfd0db39) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Harden production-readiness seams for published platform packages.
  - Billing entitlement checks now account for pending requested usage before allowing quota-bound operations.
  - Tenant JWT resolution now supports bearer-token extraction and typed request-compatible resolver inputs.
  - Permissions OpenFGA support now targets store-scoped REST endpoints with auth token support and fail-closed checks.
  - Queue QStash support now exposes an injectable dead-letter fetcher seam without assuming unstable provider SDK APIs.
  - Webhooks custom delivery now supports injectable dead-letter storage so exhausted deliveries can be persisted outside process memory.
  - Notifications direct delivery now supports bounded retry attempts with delivery-attempt telemetry hooks.
  - MCP context server primitives now expose a usable registry and plan-aware tool execution seam instead of a placeholder-only server.
