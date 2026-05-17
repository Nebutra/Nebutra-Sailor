---
"@nebutra/agent-runtime": minor
---

Absorb the self-improving-loop delta (over the already-absorbed core).

- `memory-provider`: pluggable cross-session `MemoryProvider` port (full
  lifecycle: initialize/prefetch/syncTurn/onSessionEnd/onSessionSwitch/
  onPreCompress/onDelegation/systemPromptBlock) + a `MemoryManager` that
  degrades safely + memory-context injection defense (recalled text
  banner-wrapped as reference-not-instructions; a split-safe streaming
  scrubber strips model-forged memory banners). Vendor backends injected.
- `skill-distillation`: the learning loop — eligibility gate (only
  non-trivial successful trajectories), `distillSkill` (deterministic
  prompt → injected synthesize → skill record with `allowedTools` clamped
  to tools the experience actually used = least privilege), `improveSkill`
  (versioned, tenant-locked), pure `shouldNudgePersist` heuristic.

Tenant-scoped & fail-closed; pure data/logic; LLM synthesis + memory
backends are injected ports. 288 package tests.
