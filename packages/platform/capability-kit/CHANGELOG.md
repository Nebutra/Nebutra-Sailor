# @nebutra/capability-kit

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
