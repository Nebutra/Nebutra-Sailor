# @nebutra/capability-kit

## 0.2.2

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

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

## 0.2.0

### Minor Changes

- [`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Cross-cutting governance extractions (audit-driven SSoT close-out).
  - **New `@nebutra/provider-factory`**: the identical `explicit → env →
detect-chain → fallback` provider selection + production guard that ~10
    packages hand-rolled. `@nebutra/queue` migrated as the proof consumer
    (behaviour + exact error message preserved). Remaining factories migrate
    incrementally on next touch.
  - **New `@nebutra/capability-kit`**: shared `CapabilityError`
    (code+suggestion+toJSON, subclass-safe), `DoctorReportBase`/`DoctorCheck`
    contract, and the `doctor`/`debug` CLI runner that ~9 `src/cli.ts` files
    copied. `@nebutra/collab` migrated as the proof consumer — `CollabError`
    now extends `CapabilityError`, `DoctorReport` extends the shared base, the
    CLI uses the shared runner; output + 14/14 tests unchanged.
  - **`@nebutra/tenant-store`**: `InMemoryTenantStore` gained `delete`/`size`;
    `@nebutra/knowledge-rag` `InMemoryVectorStore` now composes it instead of a
    private tenant-partition Map (consistency-debt close-out for the canvas
    governance). collab's live-`Room` registry deliberately NOT migrated
    (object pool, not a record store — rationale in
    docs/capabilities/canvas/ANTI_PATTERNS.md §8).

  All public contracts preserved; every migrated package's suite stays green.
