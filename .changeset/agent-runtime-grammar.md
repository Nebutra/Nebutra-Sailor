---
"@nebutra/agent-runtime": minor
"@nebutra/feature-flags": patch
---

Add `@nebutra/agent-runtime`: a multi-tenant agent-runtime grammar.

- New package re-expresses a coding-agent runtime *design* in Sailor grammar —
  thread/turn/item model + event lifecycle, two-axis approval/capability
  policy, uniform tool/MCP abstraction, event-sourced rollout with compaction,
  and an external-sandbox delegation seam.
- Every serialization scope, store key, and dispatch is tenant-scoped;
  cross-tenant requests can never share a serial lane.
- No infra change and no in-process untrusted-code execution: the default
  executor fails closed; real execution is delegated behind `ExternalSandbox`.
- Adds an off-by-default `agent-runtime-demo` feature flag gating a demo route
  in `apps/web`.
