# @nebutra/agents

## 1.1.2

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
  - @nebutra/billing@0.1.3
  - @nebutra/cache@0.0.3
  - @nebutra/logger@0.1.2

## 1.1.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/billing@0.1.2
  - @nebutra/cache@0.0.2
  - @nebutra/logger@0.1.1

## 1.1.0

### Minor Changes

- [`092a1ce`](https://github.com/Nebutra/Nebutra-Sailor/commit/092a1ce810965e2d81767642e4bad05b80df81f4) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add the Atelier agentic creative-canvas capability.
  - `@nebutra/agents`: new image/video **generation modality**
    (`@nebutra/agents/generation`) on the same env-key-gated provider layer as
    the LLM fallback chain, with a deterministic always-available mock provider.
  - `@nebutra/atelier-canvas`: new package — server-authoritative non-overlap
    placement, persist-then-broadcast consistency, per-`(tenant,canvas)`
    serialization, tenant-scoped store (in-memory + Prisma adapter). The
    `./agent` subpath adds the creative-direction prompt strategy + generation
    tool + `AgentConfig` factory (optional `@nebutra/agents` peer).
  - `@nebutra/feature-flags`: new `FLAGS.ATELIER_CANVAS` (off by default).

  Additive `AtelierCanvas` Prisma model. A flag-gated `/atelier` demo route in
  `apps/web` exercises the loop end-to-end with the mock provider (no AI key
  required).

### Patch Changes

- Updated dependencies [[`5d3d7e6`](https://github.com/Nebutra/Nebutra-Sailor/commit/5d3d7e6c59cae5aa242bb988b75a9888cfd0db39)]:
  - @nebutra/billing@0.1.1
