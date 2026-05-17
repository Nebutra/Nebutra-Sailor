---
"@nebutra/agents": minor
"@nebutra/atelier-canvas": minor
"@nebutra/feature-flags": patch
---

Add the Atelier agentic creative-canvas capability.

- `@nebutra/agents`: new image/video **generation modality**
  (`@nebutra/agents/generation`) on the same env-key-gated provider layer as
  the LLM fallback chain, with a deterministic always-available mock provider.
- `@nebutra/atelier-canvas`: new package — server-authoritative non-overlap
  placement, persist-then-broadcast consistency, per-`(tenant,canvas)`
  serialization, tenant-scoped store (in-memory + Prisma adapter). The
  `./agent` subpath adds the creative-direction prompt strategy + generation
  tool + `AgentConfig` factory (optional `@nebutra/agents` peer).
- `@nebutra/feature-flags`: new `FLAGS.ATELIER_CANVAS` (off by default).

Additive `AtelierCanvas` Prisma model. A flag-gated `/atelier` demo route in
`apps/web` exercises the loop end-to-end with the mock provider (no AI key
required).
