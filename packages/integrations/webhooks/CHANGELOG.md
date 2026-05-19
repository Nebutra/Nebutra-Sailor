# @nebutra/webhooks

## 0.1.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/logger@0.1.1

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
