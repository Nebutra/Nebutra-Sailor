---
"@nebutra/contracts": minor
"@nebutra/db": patch
"@nebutra/sleptons": patch
---

Sleptons résumé R0: schema, storage, and owner read/write.

- `@nebutra/contracts/sleptons` — `ResumeContentV1Schema` (the structured "track record" attached to a member profile), `ResumeWriteSchema`, `ResumeDerivedSchema`. Additive subpath export; nothing else in the package changes.
- `@nebutra/db` — `SleptonsResume` model + `ResumeLang` enum (migration `20260907000000_sleptons_resume`), 1:1 on `sleptons_member_profiles`, cascade delete. Not tenant-scoped, same as the other Sleptons tables.
- `@nebutra/sleptons` — `GET/PUT /api/resume` for the signed-in member: validate → derive (`headline`, `skills_flat`, `highlights`, `years_active`, `completeness`) → upsert. Plus a one-time importer for legacy CVise JSON exports.

Spec: `docs/superpowers/specs/2026-09-07-sleptons-resume-system-design.md`.
