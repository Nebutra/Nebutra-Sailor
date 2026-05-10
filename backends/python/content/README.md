# Content Service — STUB

> **Tier**: stub (concept preserved, no implementation)
> **ADR**: [docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md](../../../docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md)

This service has been **stubbed**. Source code, dependencies, Dockerfile, and
infrastructure manifests have been removed. This README preserves the concept
so the namespace and design intent are not lost.

## Concept

A standalone Python service for **batch content operations** — bulk feed
generation, comment-tree denormalization for cold reads, content moderation
pipelines that depend on Python ML libs (toxicity classifiers, embedding-based
similarity search across the post corpus).

Interactive content management — CRUD on posts, real-time comment threads,
authoring workflows — is **not** in scope for this service. Those flows live
in:

- `apps/studio` — Sanity Studio for editorial content
- `apps/web` and `backends/gateway` — for user-generated content (UGC) APIs

## Why this exists as a stub instead of being deleted

Unlike `billing` (which was deleted because `packages/commerce/billing` already
captures the canonical TS surface), there is **no TS package** that captures
"batch content pipeline." If/when batch moderation, large-scale feed
materialization, or ML-driven content scoring becomes a real product
requirement, this stub is the activation point.

## Activation criteria (per ADR)

To promote this service from `stub` → `active`, a single PR must include
**all** of:

1. A real consumer in `backends/gateway/` or `workflows/` that calls this
   service over HTTP. (Status checks and MCP registry entries do not count.)
2. A justification paragraph at the top of this README citing one of the ADR
   D2 clauses (batch / ML / specialized library).
3. Restored: `pyproject.toml`, `requirements.txt`, `Dockerfile`, `app/main.py`
   with `/health` plus the consumed endpoints.
4. Restored k8s manifests under `infra/iac/k8s/base/{deployments,services}/`.
5. Restored entries in `infra/iac/k8s/base/kustomization.yaml`,
   `infra/iac/k8s/base/configmaps/nebutra-config.yaml`, and
   `.github/dependabot.yml`.

If you find yourself activating this for *interactive* CRUD over content,
stop — that work belongs in TS (`backends/gateway/` + a `packages/...` shared
library), not here.

## What was previously here (for archaeology)

The pre-stub implementation had FastAPI routes for posts, feeds, and comments
(`routes_posts.py`, `routes_feed.py`, `routes_comments.py`). It had **zero
external callers** at the time of stubbing — no gateway route, no workflow,
no app. Recoverable from git history if ever needed.
