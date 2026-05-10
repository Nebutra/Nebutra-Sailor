# Third-Party Data Service — STUB

> **Tier**: stub (concept preserved, no implementation)
> **ADR**: [docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md](../../../docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md)

This service has been **stubbed**. Source code, dependencies, and Dockerfile
have been removed. This README preserves the concept.

## Concept

A standalone Python service for **batch syncing of third-party data sources**
where the integration is heavy (multi-page GraphQL pagination, OAuth refresh
loops, rate-limited polling that runs for minutes at a time, scheduled
caches). Examples: Product Hunt feed sync, large-scale CRM imports, periodic
public-data scrapes.

Single, interactive third-party calls (one Stripe lookup, one GitHub user
fetch on the hot path) are **not** in scope. Those go through `fetch()` in a
TS gateway route — there is no benefit to crossing a service boundary for a
single API call.

## Why this exists as a stub

Some third-party integrations have batch characteristics that fit Python
better than TS edge runtimes (long-running pagination, mature rate-limit
libraries like `tenacity`, predictable scheduled jobs). But the original
implementation only had a Product Hunt module with zero callers — so the
"thought" is more valuable than the code.

If/when a real product feature requires batch third-party syncing, this
stub is the activation point.

## Activation criteria (per ADR)

To promote `stub` → `active`, a single PR must include **all** of:

1. A real consumer (typically a workflow under `workflows/inngest/` or
   `workflows/n8n/`) that calls this service.
2. README justification citing ADR D2.1 (batch).
3. Restored Python package + Dockerfile + k8s manifests + dependabot entry.

If activation is for *one-off interactive* third-party calls, redirect to a
TS gateway route or workflow step. Do not revive Python for that.

## What was previously here

FastAPI routes for Product Hunt (`routes_producthunt.py`) plus client/service
classes. Zero external callers at stub time. Recoverable from git history.
