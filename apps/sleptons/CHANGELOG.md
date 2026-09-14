# @nebutra/sleptons

## 0.1.4

### Patch Changes

- [#541](https://github.com/Nebutra/Nebutra-Sailor/pull/541) [`a29746f`](https://github.com/Nebutra/Nebutra-Sailor/commit/a29746fdd9eabdfb9c1692a2dc43fc7d5810779c) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Sleptons résumé R0: schema, storage, and owner read/write.
  - `@nebutra/contracts/sleptons` — `ResumeContentV1Schema` (the structured "track record" attached to a member profile), `ResumeWriteSchema`, `ResumeDerivedSchema`. Additive subpath export; nothing else in the package changes.
  - `@nebutra/db` — `SleptonsResume` model + `ResumeLang` enum (migration `20260907000000_sleptons_resume`), 1:1 on `sleptons_member_profiles`, cascade delete. Not tenant-scoped, same as the other Sleptons tables.
  - `@nebutra/sleptons` — `GET/PUT /api/resume` for the signed-in member: validate → derive (`headline`, `skills_flat`, `highlights`, `years_active`, `completeness`) → upsert. Plus a one-time importer for legacy CVise JSON exports.

  Spec: `docs/superpowers/specs/2026-09-07-sleptons-resume-system-design.md`.

- Updated dependencies [[`0ea06f4`](https://github.com/Nebutra/Nebutra-Sailor/commit/0ea06f4b7ca492d20911a3d68a8c4da16c680dc0), [`a29746f`](https://github.com/Nebutra/Nebutra-Sailor/commit/a29746fdd9eabdfb9c1692a2dc43fc7d5810779c), [`025abf8`](https://github.com/Nebutra/Nebutra-Sailor/commit/025abf8b94aad96ffe56f50632a094782a30b968)]:
  - @nebutra/db@0.1.3
  - @nebutra/contracts@2.0.0
  - @nebutra/ui@2.0.0
  - @nebutra/fonts@2.0.0
  - @nebutra/icons@2.0.0
  - @nebutra/tokens@2.0.0

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @nebutra/icons@0.1.2
  - @nebutra/tokens@0.1.2
  - @nebutra/ui@0.2.2
  - @nebutra/db@0.1.2

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @nebutra/icons@0.1.1
  - @nebutra/tokens@0.1.1
  - @nebutra/ui@0.2.1
  - @nebutra/db@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [[`34bd161`](https://github.com/Nebutra/Nebutra-Sailor/commit/34bd16140436c966896bf7a2276e8c20777c256f), [`d0b0e62`](https://github.com/Nebutra/Nebutra-Sailor/commit/d0b0e623a322e35f9ce2ae8d117e803b803b5e0b)]:
  - @nebutra/ui@0.2.0
