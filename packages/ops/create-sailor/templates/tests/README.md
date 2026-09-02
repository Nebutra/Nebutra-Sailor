# tests

Cross-cutting tests that don't belong to a single package.

| Folder | Tool | Purpose |
|--------|------|---------|
| `architecture/` | vitest | Architecture rules — import boundaries, layering, no-cycle |
| `load/` | k6 | Load + perf tests against deployed environments |

## `degradation.test.example.ts`

A template, not a live test — no vitest glob matches `.example.ts`, so it is
inert until you activate it. It is the gateway degradation suite: one
`describe` per dependency outage (Redis failing every command, Redis
credentials missing, Redis healthy, database down), each `it` stating the
behaviour the gateway must have while the outage lasts — which routes keep
answering, what the health endpoint reports, which failures are logged rather
than surfaced.

To activate it, move the file to `backends/gateway/src/__tests__/degradation.test.ts`
(drop `.example`) and follow the numbered steps in its header: point the
imports at your middleware chain and health routes, mounted in the same order
as your `index.ts`, and point the `vi.mock()` specifiers at whatever your
gateway imports for cache, database and logging. The point of the suite is
that a misconfigured dependency has a tested behaviour before it has an
incident; add a `describe` for every dependency your gateway gains.
