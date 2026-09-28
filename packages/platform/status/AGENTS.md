# AGENTS.md — @nebutra/status

- One implementation: do not add third-party status-page adapters (ADR 2026-09-24 convergence).
- `src/math.ts` must stay free of storage/server imports; client components import it via `@nebutra/status/math`.
- Chat channels are outputs: a failed notification never fails an incident write.
- Tests: `pnpm --filter @nebutra/status test`.
