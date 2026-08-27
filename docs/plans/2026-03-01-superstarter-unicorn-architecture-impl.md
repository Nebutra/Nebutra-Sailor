# Superstarter Unicorn Architecture Implementation Plan

Date: 2026-03-01  
Source Design: `docs/plans/2026-03-01-superstarter-unicorn-architecture-design.md`  
Scope: Execute only the approved architecture decisions for 2026 superstarter baseline.

## 1) Objective

Deliver a production-capable, warehouse-first superstarter baseline for:

- Marketing website + Product Hunt growth engine (first pack)
- Provider-agnostic identity core (Clerk-first, Auth.js-ready)
- Stripe-first hybrid billing with in-house metering
- Inngest-first async workflow reliability
- Tiered hybrid multitenancy with pooled default

## 2) Delivery Principles

- Contract-first: API/event schemas are blocking gates.
- Reliability-first: runtime correctness and observability before feature expansion.
- Shared-first isolation: pooled-by-default, isolation-on-demand.
- Provider-agnostic domains: external vendors behind adapters.
- Warehouse as source of truth for growth/revenue metrics.

## 3) Workstreams

### WS1: Baseline Reliability and Contract Consistency (P0)

- Fix runtime blockers (Python service syntax/startup failures).
- Unify tenant header contract across gateway/workflows/services.
- Align env/compose/service URLs/ports and health endpoints.
- Ensure local single-command startup produces green health checks.

### WS2: Platform Core Stabilization (P1)

- Define canonical identity domain schema.
- Implement identity adapter contract and Clerk adapter baseline.
- Add Auth.js adapter skeleton (ready path, feature-flag switch).
- Define pricing catalog, entitlements, usage ledger schema.

### WS3: Warehouse-first Growth Stack (P1)

- Define event contract package and version policy.
- Implement event gateway validation/idempotency/dedupe.
- Set up ClickPipes ingestion path to ClickHouse bronze tables.
- Create dbt bronze/silver/gold models for growth and revenue.

### WS4: Marketing + PH Launch Pack (P1)

- Build Git-based MDX content model for docs/blog/changelog/launch.
- Implement PH launch state machine (`draft -> ready -> launch -> 24h -> 72h`).
- Integrate attribution model (first/last/assist touch).
- Expose warehouse-backed growth dashboard/API endpoints.

### WS5: Security, Observability, and Release Governance (P2)

- Add CI security gates: CodeQL, dependency review, secret scanning, SBOM.
- Add OpenTelemetry traces/metrics/log correlation across gateway/workflows.
- Define SLOs and alert rules for ingestion/workflow/website/runtime health.
- Add replay and DLQ operational runbooks.

## 4) 4-Week Milestone Plan

### Week 1: P0 Hardening (Must Pass)

Tasks:

- Patch runtime blockers and verify service startup.
- Normalize tenant context propagation contract.
- Resolve compose/env/health endpoint drift.
- Add architecture smoke checks in CI.

Acceptance criteria:

- `docker compose up` baseline starts without critical failures.
- Health checks are consistent and green across declared services.
- Tenant context headers/claims consistent across API/events/workflows.

Exit gate:

- No P0 runtime or contract mismatch remains open.

### Week 2: Core Domain Foundations

Tasks:

- Implement canonical identity schema and adapter interfaces.
- Land Clerk adapter path and Auth.js-ready stub path.
- Implement pricing catalog + entitlement + usage ledger schemas.
- Add contract tests for identity and billing domain boundaries.

Acceptance criteria:

- Business services consume provider-agnostic claims contract only.
- Billing permission checks read internal entitlements, not provider status.
- Usage ledger is immutable and idempotent at event level.

Exit gate:

- Identity and billing domains run with contract test coverage.

### Week 3: Warehouse & Growth Runtime

Tasks:

- Land event schema package + validation middleware.
- Build ClickPipes-first ingestion and bronze modeling.
- Implement silver/gold metric models (activation, retention, funnel, MRR).
- Build MDX-first growth content pipeline and PH workflow integration.

Acceptance criteria:

- Gold metrics reproducible from raw events.
- Launch workflow writes review checkpoints at 24h/72h.
- Website and growth endpoints read warehouse models (not ad-hoc sources).

Exit gate:

- Marketing + PH growth pack works end-to-end in staging.

### Week 4: Production Guardrails

Tasks:

- Add security/policy CI gates and fail-fast rules.
- Add OTel instrumentation and SLO dashboards.
- Implement DLQ replay and reconciliation runbooks.
- Run gameday for workflow failure and data replay scenarios.

Acceptance criteria:

- CI blocks vulnerable or policy-violating changes.
- SLO alerts fire on synthetic incidents.
- Replay/reconciliation can recover from injected failure cases.

Exit gate:

- Superstarter baseline is release-ready with operational guardrails.

## 5) Tenant Tier Matrix v1 (Execution Rules)

### Bronze (default)

- Isolation: pooled DB/schema with strict `tenant_id` + RLS.
- Target: early-stage and content/growth-heavy tenants.
- Operations: standard queue/cache classes.

### Silver

- Isolation: pooled data + dedicated high-load queues/caches.
- Target: scaling B2B dashboard tenants.
- Operations: stricter quotas and higher SLO profile.

### Gold

- Isolation: dedicated schema or dedicated database/instance.
- Target: enterprise/high-compliance tenants.
- Operations: contractual SLO and dedicated capacity.

Upgrade policy:

- Triggered by sustained contention, compliance constraints, or enterprise contract.
- Managed via `tenant_deployment_map` without API/event contract changes.

## 6) Repository Change Plan (Initial Batch)

### Batch A (Week 1)

- `backends/gateway`: normalize tenant context and health/status routes.
- `backends/python/third-party`: fix runtime syntax/startup issues.
- root env/compose/openstatus: align ports and endpoint paths.

### Batch B (Week 2)

- `packages/contracts`: add identity + billing + event schema contracts.
- `packages/domain-*`: canonical identity/billing/entitlement modules.
- `infra/inngest`: workflow contract checks and retry/DLQ defaults.

### Batch C (Week 3)

- `backends/python/event-ingest` (new): event validation/dedupe/idempotency.
- `infra/clickhouse` + dbt project (new): bronze/silver/gold models.
- `apps/web`: marketing+launch data integration from warehouse.

### Batch D (Week 4)

- `.github/workflows`: security and policy gates.
- `infra/observability`: OTel and SLO dashboards.
- `docs/runbooks`: replay, reconciliation, incident response.

## 7) Testing Strategy

- Contract tests: schema compatibility and breaking-change detection.
- Integration tests: gateway -> workflow -> services tenant propagation.
- Billing tests: idempotent usage ingest, rating, and Stripe sync.
- Data tests: dbt tests for uniqueness, freshness, referential integrity.
- Reliability tests: retry backoff, DLQ handling, replay correctness.

## 8) Risks and Mitigations

- Risk: provider lock-in via auth/billing shortcuts.
  - Mitigation: strict adapter boundaries and internal canonical domains.
- Risk: warehouse model drift and metric inconsistency.
  - Mitigation: metric-as-code with versioned dbt models and CI tests.
- Risk: multitenant data leakage.
  - Mitigation: mandatory tenant context, RLS tests, deny-by-default policies.
- Risk: async side-effect duplication.
  - Mitigation: idempotency keys + dedupe + reconciliation jobs.

## 9) Definition of Done (Program)

- P0 issues closed and verified in CI/staging.
- Marketing + PH growth pack available as reusable starter pack.
- Warehouse-first analytics and revenue metrics operational.
- Clerk-first login works with Auth.js-ready adapter interface.
- Stripe hybrid billing reconciles with internal usage ledger.
- Tiered tenancy mapping operational without contract changes.

## 10) Immediate Next Execution Step

Execute **Batch A / Week 1** only, in this exact order:

1. Fix runtime blockers.
2. Normalize tenant header contract.
3. Align env/compose/health endpoints.
4. Add architecture smoke test command in CI.
