# 2026 Superstarter Unicorn Architecture Design

Date: 2026-03-01  
Project: Nebutra-Sailor  
Primary Goal: Build a 2026 unicorn-grade superstarter template for AI SaaS, marketing website, high-density B2B dashboard, China outbound growth, community, and solo-founder ecosystem.

## 1) Target Positioning

- Benchmark: Neon / Dub / Supabase quality bar.
- Primary narrative: **The AI-Native Backend for Builders**.
- Strategic principle: **Warehouse-first**, **shared-first with isolation-on-demand**, **provider-agnostic core domains**.

## 2) Confirmed Architecture Decisions

- Warehouse engine: **ClickHouse Cloud**
- Ingestion backbone: **ClickPipes-first**
- Content system: **Git-based MDX-first**
- Auth: **Clerk-first + Auth.js-ready adapter infrastructure**
- Billing: **Stripe-first + usage metering in-house**
- Metering model: **Hybrid** (base subscription + variable usage)
- Workflow orchestration: **Inngest-first**
- Multi-tenant strategy: **Tiered Hybrid**, default pooled model

## 3) System Architecture (Recommended)

### 3.1 Core Platform (Control Plane)

- Tenant/Organization domain
- Auth/RBAC domain (internal canonical identity model)
- Billing/Metering domain
- Feature flags and experiments domain
- Audit/compliance domain
- Workflow orchestration domain

### 3.2 Data Platform (Warehouse-first)

- Event contract layer (schema-versioned)
- Event gateway (validation, dedupe, PII policy, idempotency)
- Streaming ingestion (ClickPipes)
- Warehouse modeling (bronze/silver/gold via dbt)
- Serving layer (dashboards/APIs read from gold only)
- Reverse activation to CRM/email/ads

### 3.3 Experience Packs

- pack-marketing-growth (website, blog, docs, changelog, launch)
- pack-ai-saas
- pack-devops-dashboard
- pack-community
- pack-portfolio

Rule: pack interfaces are stable contracts; packs are pluggable without changing core platform domains.

## 4) Growth Architecture (Marketing + Product Hunt)

- Website runtime: Next.js App Router with static + dynamic hybrid rendering
- Structured content model for distribution and attribution
- Full-funnel attribution in warehouse: first-touch, last-touch, assisted
- Product Hunt launch engine state machine:
  - draft -> ready -> launch -> 24h-review -> 72h-review
- Experimentation: server-side bucketing + warehouse-native evaluation

## 5) Identity Architecture (Provider-Agnostic)

### 5.1 Canonical Identity Model

Internal tables are source of truth:

- users
- organizations
- memberships
- roles
- permissions

### 5.2 Adapter Layer

- ClerkAdapter
- AuthJsAdapter

Adapters map provider identities to internal domain identity and emit the same claims contract.

### 5.3 Migration Safety

- external_accounts mapping table
- dual-write capable migration path
- provider switch by feature flag per environment/tenant

## 6) Billing + Metering Architecture (Hybrid)

- Versioned pricing catalog and entitlements
- Immutable usage ledger for event-level auditability
- Internal rating engine maps usage -> billable metrics
- Stripe metered sync with idempotency
- Webhook signature verification + retries + DLQ
- Reconciliation jobs (internal ledger vs Stripe invoice lines)
- Revenue metrics computed in warehouse (MRR/NRR/churn/expansion)

## 7) Multi-Tenant Isolation Strategy (Tiered Hybrid)

### 7.1 Default

- Shared DB + Shared Schema + tenant_id + RLS

### 7.2 Upgrade Path

- Bridge model:
  - Bronze: pooled
  - Silver: pooled + dedicated heavy resources and stricter limits
  - Gold: dedicated schema or dedicated database/instance

### 7.3 Tenant Tier Matrix v1

- Bronze
  - Target: early teams, content-led growth workloads
  - Isolation: pooled RLS
  - SLO: standard
  - Trigger to upgrade: sustained resource contention or compliance request
- Silver
  - Target: scaling B2B tenants, dashboard-heavy workloads
  - Isolation: pooled data + dedicated compute queues/caches
  - SLO: higher latency/error budget requirement
  - Trigger to upgrade: enterprise contracts and strict governance needs
- Gold
  - Target: enterprise/high-compliance tenants
  - Isolation: dedicated schema or dedicated database
  - SLO: contractual
  - Trigger to downgrade: none by default (manual governance decision)

### 7.4 Low-Cost Switching Rules

- tenant_deployment_map is mandatory and versioned
- API/event contracts stay unchanged across tiers
- app logic never branches by physical storage topology
- migration playbook must be online (backfill + dual-read window + cutover + rollback)

## 8) Data Flow (End-to-End)

1. User/Backend emits event with contract version.
2. Event gateway validates schema, injects tenant context, deduplicates.
3. Event ingested through ClickPipes into bronze.
4. dbt transforms bronze -> silver -> gold.
5. Product dashboards and growth APIs query gold.
6. Activation jobs sync selected segments/actions out.
7. Revenue and growth review workflows run via Inngest.

## 9) Error Handling and Reliability Baseline

- Idempotency key required for all asynchronous side effects
- Dead-letter queues for non-recoverable pipeline failures
- Replay tooling for data and workflow recovery
- Saga compensation for cross-system partial failures
- Graceful degradation: non-critical growth/analytics failures cannot block product core flows

## 10) Testing and Release Gates

- Contract tests: API and event schemas are CI-blocking
- Workflow tests: retries, DLQ paths, compensation paths
- Billing tests: usage rating idempotency and reconciliation correctness
- Multi-tenant tests: RLS enforcement and tenant context propagation
- Security gates: CodeQL, dependency review, secret scanning, SBOM
- Observability gates: golden signals + SLO alert checks before release

## 11) Current Repository Gaps (Priority)

### P0

- Runtime break in backends/python/third-party/app/main.py (indentation)
- Tenant header contract mismatch across gateway/workflows/services
- Health endpoint and env/compose drift

### P1

- In-memory placeholders in billing/usage/feature flag/event bus paths
- Incomplete gateway routing and workflow integration registration

### P2

- Infra stubs (k8s/terraform) not production-ready
- CI lacks full security and policy gates

## 12) Phased Execution

- Week 1: fix runtime and contract consistency, make template baseline reliable
- Week 2: stabilize platform core domains (identity/tenant/billing/events)
- Week 3: deliver marketing + PH growth pack end-to-end
- Week 4: harden reliability, observability, and release governance

## 13) Non-Goals (v1)

- Full microservice decomposition for every domain
- Multi-cloud infra parity
- Complex enterprise custom workflows before core platform stability

## 14) Acceptance Criteria

- Single command local startup succeeds with healthy checks
- Tenant-safe contracts enforced across API/events/workflows
- Warehouse metrics are reproducible from raw events
- Marketing + PH launch pipeline is executable and reviewable end-to-end
- Auth provider switch can be tested without business-domain code changes
