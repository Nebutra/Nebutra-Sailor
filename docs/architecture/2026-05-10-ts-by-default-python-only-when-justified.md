# ADR: TS-by-Default for Backends, Python Only When Justified

- **Date**: 2026-05-10
- **Status**: **Accepted**
- **Owner**: tseka_luk
- **Supersedes**: nothing — first formal ADR codifying language-choice policy across `backends/`
- **Extends**: `e0acf965` (`docs(ai): clarify TS-vs-Python AI service boundary`) — which scoped the rule for AI only; this ADR generalizes it
- **Related**: `backends/python/ai/README.md`, `CLAUDE.md`

---

## Context

`backends/python/` was scaffolded with nine domain services (`ai`, `billing`, `content`, `ecommerce`, `event-ingest`, `recsys`, `third-party`, `web3`, plus `_shared`). A caller-graph audit (2026-05-10) revealed:

| Service | Real callers | TS equivalent | Verdict |
|---------|-------------|---------------|---------|
| `ai` | gateway/ai route, MCP, status | complementary (Vercel AI SDK on edge) | keep — boundary ratified in `e0acf965` |
| `billing` | **zero** (gateway billing route imports `@nebutra/billing` TS package) | **complete** (`packages/commerce/billing` — 40 files, multi-provider) | shadow clone |
| `content` | zero | partial (Sanity in `apps/studio`) | speculative |
| `web3` | zero | none | speculative |
| `third-party` | zero | none | speculative |
| `recsys` | Inngest workflows (`recsys_refresh`, `daily_digest_email`) | none | keep |
| `ecommerce` | Inngest workflow (`ecommerce_sync`) | none | keep |
| `event-ingest` | gateway events route + tests | none | keep |
| `_shared` | foundation | — | keep |

**Root cause of the duplication**: when scaffolding a new Python service, contributors (human and AI) copy the existing service template. The marginal cost of "one more FastAPI scaffold" looks low, but the aggregate maintenance and cognitive cost compounds. `e0acf965` already documented the symptom for AI: *"consumers default to whichever was added last."*

Without an explicit cross-cutting rule, this pattern repeats. `billing` is the most egregious instance — 3,042 lines of Python that do exactly what 40 TS files already do, with fewer providers.

---

## Decisions

### D1 — Default language: TypeScript

All new backend work defaults to **TypeScript** in either:
- `backends/gateway/` — for HTTP-facing routes (auth, tenancy, edge-served APIs)
- `packages/<category>/<name>/` — for shared business logic, called by gateway routes or workflows

Python is a justified exception, **not** the default.

### D2 — Python is justified only when

A new Python service is acceptable **only** when at least one of these is true and documented in the service's `README.md`:

1. **Batch / queued work that is too long for edge runtimes** (>5s typical), where the workload benefits from process-level concurrency or long-running connections.
2. **ML / scientific compute** that depends on the Python ecosystem (transformers, PyTorch, vLLM, scikit-learn, etc.) — where re-implementing in TS is infeasible or strictly worse.
3. **Specialized libraries** with no comparable TS port (e.g., mature i18n pipelines, certain protobuf/grpc tooling, scientific format readers).

CRUD over a database, webhook receipt, subscription/billing logic, content management, blockchain RPC reads, third-party API proxies — **none** of these qualify on their own. They go in TS.

### D3 — Three-tier module lifecycle

Every module in `backends/python/` and `packages/` falls into exactly one tier:

```
active     — has real callers; participates in build, typecheck, tests, CI
stub       — preserves concept (README + interface) but src/ is empty or NotImplemented;
             excluded from Python venv builds, listed in INDEX with "(stub)" suffix
incubator  — moved to incubator/ at repo root; excluded from pnpm/uv workspaces; not in CI
```

Activation is **explicit**: moving from `stub` → `active` requires a real consumer landing in the same PR. This blocks speculative reactivation.

### D4 — TS package wins ties

Where a domain has both a TS package and a Python service implementing the same surface area:
- The **TS package is canonical**.
- The **Python service is deleted** (not stubbed) — its concept is already captured by the TS package's interface; preserving Python adds noise without preserving anything new.

### D5 — Caller graph as forcing function

A Python service exists if and only if at least one of these is true:
- A `backends/gateway/` route or middleware fetches it
- A workflow under `workflows/` invokes it
- An app under `apps/` calls it via documented HTTP

Status-check probes and MCP server registry entries **do not count** as callers — they're observability, not consumption.

---

## Consequences

### Immediate cleanup (this PR / this week)

1. **Delete** `backends/python/billing/` entirely. Remove `BILLING_SERVICE_URL` from `backends/gateway/src/config/env.ts` and the corresponding entry in `backends/gateway/src/routes/system/status.ts`.
2. **Stub** `backends/python/{content,web3,third-party}/` — keep `README.md` (rewritten with concept + activation criteria) and a one-line `pyproject.toml` placeholder; delete `app/`, `services/`, `utils/`, `requirements.txt`, `.venv/`, `__pycache__/`, `.ruff_cache/`.
3. **Update** `docs/INDEX.md` and `docs/DOMAINS.md` to reflect deleted/stubbed services.
4. **Update** `CLAUDE.md` with the TS-by-default rule and the three-tier lifecycle.

### Ongoing rules

- New Python services require a paragraph in their `README.md` quoting which D2 clause justifies them.
- During PR review, a Python service whose `README.md` does not cite a D2 clause is rejected.
- Quarterly: re-run the caller-graph audit. Any `active` Python service with zero callers for one quarter is moved to `stub`. Any `stub` untouched for two quarters is moved to `incubator`.

### Costs accepted

- Loss of `backends/python/billing` — 3,042 lines deleted. The work is recoverable from git history if ever needed; in practice, re-implementing in TS would be faster than reviving stale Python.
- Loss of "language polyglot" optionality for some domains. Worth it: optionality has been demonstrated to convert into duplication, not flexibility.
- One-time cost of writing this ADR and updating CLAUDE.md.

### Costs avoided

- Schema sync between TS and Python billing models (would have grown).
- CI matrix and Docker image proliferation per Python service.
- New-contributor confusion ("which one do I edit?").
- Future AI agents auto-generating more shadow clones.

---

## Status review trigger

Revisit this ADR when any of the following becomes true:
- A real product requirement emerges that forces Python on a domain currently TS (e.g. heavy ML on billing data).
- The TS edge runtime gains a feature that closes the gap for current Python services (would justify migrating `recsys`/`ecommerce` back to TS).
- More than two new Python services are proposed in a single quarter — that's a smell that the rule needs tightening, not loosening.
