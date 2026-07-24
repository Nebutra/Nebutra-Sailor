# RFC B3/B5/B6: Add Evidence Gates Before Public Content and ECS Right-Sizing Decisions

Status: Proposed
Date: 2026-06-02
Dimensions: B3 observability maturity, B5 cloud cost optimization, B6 test blind spots

## Delta Scope

This proposal covers two related changes since the 2026-05-31 governance baseline:

- Public content and Startup OS surfaces became more important user-facing paths.
- Infra/runtime changes touched ECS and deployment hygiene, including Node runtime updates and deploy workflow hardening.

No code or configuration was changed by this review. Any ECS right-sizing decision remains a human decision.

## Current State

### Observability

- `apps/landing/src/instrumentation.ts` intentionally keeps the marketing app OpenTelemetry hook as a no-op to avoid bundling the shared OTel stack.
- `apps/landing/src/lib/blog.ts` treats selected CMS/network failures as recoverable and returns `[]` or `null`. That prevents hard crashes, but a CMS outage can become an empty blog index or post 404 without a domain-level signal.
- `packages/platform/logger/src/otel.ts` only initializes when `OTEL_ENABLED=true` and currently creates generic HTTP request/error counters.
- `packages/platform/alerting/AGENTS.md` explicitly scopes alerting to low-level dispatch and in-memory error-rate tracking, not durable incident policy.
- `packages/platform/alerting/src/index.ts` provides channel fan-out and process-local `trackError`, but it is not a cross-instance SLO or alert policy engine.
- Startup OS execute routes already have meaningful audit and metering hooks: auth/role checks, AI token metering, audit logs for executed/failed runs, and error logging. The missing layer is SLO-quality aggregation and alert thresholds.

### Cost and Runtime

- `.github/workflows/deploy-ecs.yml` documents the current ECS box as a `2C4G Aliyun Lite` instance and notes that retained release directories plus `node_modules` can fill disk before upload.
- `infra/iac/ecs/ecosystem.config.cjs` runs landing, web, design docs, sailor docs, and API gateway on the same PM2 host with memory restart thresholds from `350M` to `700M`.
- The API gateway comment says the old `300M` limit caused PM2 memory restarts before smoke tests could reach a stable listener.
- Terraform modules still encode broader cloud defaults such as AWS `db.t3.medium`, Redis `cache.t3.micro`, EKS `t3.medium` nodes, Tencent `S5.XLARGE8` workers, and Tencent PostgreSQL `2C4G`.

## Observability Tradeoffs

Option A: keep landing OTel disabled but add domain-level content health signals.

- Pros: preserves the lightweight marketing bundle while making CMS freshness, post count, fetch failures, renderer failures, and 404 spikes visible.
- Cons: requires an explicit metrics boundary outside generic request tracing.

Option B: enable the shared OTel stack in landing.

- Pros: centralizes traces and metrics.
- Cons: may reintroduce the bundle/runtime pressure the no-op hook was designed to avoid.

Option C: rely on external uptime checks only.

- Pros: cheap and simple.
- Cons: misses silent content degradation, such as empty blog index, stale Sanity data, or Mermaid renderer failures that still return 200.

Recommended direction: Option A.

## Cost Tradeoffs

Option A: keep the current ECS Lite host but add measurement gates.

- Pros: avoids premature infra churn and preserves a simple deploy target.
- Cons: the host may stay overpacked if release artifacts, docs apps, and gateway memory keep growing.

Option B: split public docs/marketing surfaces away from the shared ECS host.

- Pros: reduces blast radius and may cut disk/memory pressure on the API/web host.
- Cons: adds deployment topology and observability complexity.

Option C: resize the host upward.

- Pros: fastest operational relief if current headroom is too small.
- Cons: increases recurring cost and can mask deploy artifact bloat.

Option D: resize downward.

- Pros: direct cost reduction if live utilization is low.
- Cons: unsafe without real RSS, restart, latency, and disk trend data.

Recommended direction: Option A first, then choose B, C, or D from evidence.

## Decision Information Needed

- Last 7 to 14 days of PM2 RSS per process, restart counts, and uptime for landing, web, docs, and API gateway.
- Disk free trend before and after deploy cleanup, plus release artifact sizes by app.
- Request volume, p95/p99 latency, and error rate for public content, dashboard, gateway, and Startup OS execute paths.
- CMS health: successful fetch ratio, empty-post-index events, missing translation ratio, stale-content age, and post renderer error counts.
- Startup OS health: run success/failure ratio, provider latency, metering ingestion failures, token cost per run, audit write failures, and user-visible 4xx/5xx rates.
- Current bill or invoice slices for ECS/CVM, managed database, Redis/cache, object storage, CDN, and CI minutes.
- Business owner decision on whether public docs/marketing should share the same host as authenticated product/API surfaces.

## Proposed Decision Path

1. Define service-level indicators before adding alerts: content freshness, CMS fetch success, renderer failure rate, Startup OS execute success, metering ingestion success, PM2 restart rate, disk headroom, and deploy artifact size.
2. Attach alert thresholds only to user-impacting or burn-rate signals. Avoid paging on generic 4xx noise or expected authoring errors.
3. Gather a one-week ECS evidence packet before any right-sizing decision.
4. Decide whether to split public docs/marketing surfaces, tune release retention/artifacts, or resize the host.

## Non-Goals

- This RFC does not change ECS instance size, PM2 memory thresholds, Terraform defaults, or deployment retention.
- This RFC does not enable landing OpenTelemetry.
- This RFC does not suppress tests, change CI, or add `continue-on-error`.
