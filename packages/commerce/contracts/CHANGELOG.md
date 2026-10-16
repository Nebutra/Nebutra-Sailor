# @nebutra/contracts

## 5.0.0

### Minor Changes

- [`9ced744`](https://github.com/Nebutra/Nebutra-Sailor/commit/9ced744cb57245abd70267a46d93d3347e166e84) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - `NEBUTRA_LOCALE=cn` is now a real runtime switch. `@nebutra/contracts/market` reads it (and `NEXT_PUBLIC_NEBUTRA_LOCALE` on the client, with `NEBUTRA_REGION` / `NEXT_PUBLIC_REGION` kept as aliases). Checkout detection is Creem-first and puts WeChat Pay / Alipay first under `cn`; the legacy Stripe adapter is no longer auto-detected from `STRIPE_SECRET_KEY` and runs only with `BILLING_PROVIDER=stripe`. Every scaffold now ships the mainland compliance pieces (ICP / 公安备案 footer, AIGC disclaimer), switched on at runtime.

### Patch Changes

- [`8c77238`](https://github.com/Nebutra/Nebutra-Sailor/commit/8c772384caec2c5a7cb7f259d397dc73e2df57e3) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Relicense to Apache-2.0. Every package now declares `"license": "Apache-2.0"` and ships the Apache-2.0 LICENSE text (previously MIT). `create-sailor` writes an Apache-2.0 LICENSE and a NOTICE into each generated project and prints `Skip to production.` in its banner. See ADR 2026-10-16 apache-2-relicense.

## 4.0.1

## 4.0.0

## 3.0.0

## 2.0.0

### Minor Changes

- [#541](https://github.com/Nebutra/Nebutra-Sailor/pull/541) [`a29746f`](https://github.com/Nebutra/Nebutra-Sailor/commit/a29746fdd9eabdfb9c1692a2dc43fc7d5810779c) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Sleptons résumé R0: schema, storage, and owner read/write.
  - `@nebutra/contracts/sleptons` — `ResumeContentV1Schema` (the structured "track record" attached to a member profile), `ResumeWriteSchema`, `ResumeDerivedSchema`. Additive subpath export; nothing else in the package changes.
  - `@nebutra/db` — `SleptonsResume` model + `ResumeLang` enum (migration `20260907000000_sleptons_resume`), 1:1 on `sleptons_member_profiles`, cascade delete. Not tenant-scoped, same as the other Sleptons tables.
  - `@nebutra/sleptons` — `GET/PUT /api/resume` for the signed-in member: validate → derive (`headline`, `skills_flat`, `highlights`, `years_active`, `completeness`) → upsert. Plus a one-time importer for legacy CVise JSON exports.

  Spec: `docs/superpowers/specs/2026-09-07-sleptons-resume-system-design.md`.

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

## 0.1.1

### Patch Changes

- Publish registry package metadata under the MIT license.
