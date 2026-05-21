# @nebutra/queue

## 0.1.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/logger@0.1.1
  - @nebutra/provider-factory@0.2.1
  - @nebutra/db@0.1.1

## 0.1.1

### Patch Changes

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

- [`5d3d7e6`](https://github.com/Nebutra/Nebutra-Sailor/commit/5d3d7e6c59cae5aa242bb988b75a9888cfd0db39) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Harden production-readiness seams for published platform packages.
  - Billing entitlement checks now account for pending requested usage before allowing quota-bound operations.
  - Tenant JWT resolution now supports bearer-token extraction and typed request-compatible resolver inputs.
  - Permissions OpenFGA support now targets store-scoped REST endpoints with auth token support and fail-closed checks.
  - Queue QStash support now exposes an injectable dead-letter fetcher seam without assuming unstable provider SDK APIs.
  - Webhooks custom delivery now supports injectable dead-letter storage so exhausted deliveries can be persisted outside process memory.
  - Notifications direct delivery now supports bounded retry attempts with delivery-attempt telemetry hooks.
  - MCP context server primitives now expose a usable registry and plan-aware tool execution seam instead of a placeholder-only server.

- Updated dependencies [[`d58d691`](https://github.com/Nebutra/Nebutra-Sailor/commit/d58d691f64cda31011f488f75a5a4ae425311704)]:
  - @nebutra/provider-factory@0.2.0
