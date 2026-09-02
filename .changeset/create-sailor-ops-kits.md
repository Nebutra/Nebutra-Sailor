---
"create-sailor": minor
---

Ship the ops kits that came out of the 2026-09-02 convergence as scaffold assets:

- `templates/tests/degradation.test.example.ts` — a gateway failure-mode suite: Redis unreachable or misconfigured falls back to the in-memory rate limiter instead of answering 500, health reports `degraded`, and a healthy Redis costs exactly one EVAL per request.
- `templates/infra/ops/platform-expected.example.json` — the declaration format for `scripts/ops/platform-reconcile.mjs`, which checks Vercel project settings, Fly secret names, GitHub variables and Cloudflare Worker bindings against what the repo says they should be, daily, and fails loudly on drift.

Also: the template no longer carries Nebutra-instance runbooks, DNS one-shots and VM ops workflows (`TEMPLATE.md`, "Instance vs product"), and the shared `deploy-vercel.yml` builds every app on the GitHub runner and uploads prebuilt output, so Vercel meters no build minutes.
