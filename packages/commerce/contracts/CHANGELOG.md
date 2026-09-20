# @nebutra/contracts

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
