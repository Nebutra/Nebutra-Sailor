# agent-runtime — self-improving-loop delta map (P2)

> Source: an open-source self-improving agent (conversation-only). Frame
> (consistent with prior 5 absorptions): **extend `@nebutra/agent-runtime`,
> translate ONLY the delta** — harness/skills-loader/rollout core already
> absorbed.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tools, rollout, dispatcher, sandbox seam, skills *loader*, hooks, commands, subagents, artifact-stream, workbench, design-context, edit-planner, project-repo, deployment-status, provider | **SKIP** | already absorbed; reused |
| — | vendor memory backends (honcho/mem0/…), Telegram/cron/CLI surfaces | **SKIP (as seam / out-of-scope)** | provider-bound; injected port |
| 1 | **Cross-session memory provider** — pluggable `MemoryProvider` port with the full lifecycle (initialize / prefetch / syncTurn / onSessionEnd / onSessionSwitch / onPreCompress / onDelegation / systemPromptBlock) + a `MemoryManager` that degrades safely + **memory-context injection defense** (recalled text is banner-wrapped as authoritative *reference, not instructions*; a streaming scrubber strips model-forged memory banners, split-safe). | **PORT** | `memory-provider.ts` |
| 2 | **Skill distillation (the learning loop)** — the inverse of the skills loader: an eligibility gate (only non-trivial successful trajectories), `distillSkill` (deterministic prompt → injected synthesize → a skill record with `allowedTools` clamped to tools the experience actually used = least privilege), `improveSkill` (versioned, tenant-locked, tools union∩used), and a pure `shouldNudgePersist` heuristic. | **PORT** | `skill-distillation.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **288 tests green,
  typecheck clean**.
- **Deliberately not ported (not faked):** vendor memory backends and the
  LLM synthesis call (injected ports); Telegram/cron/serverless surfaces;
  the TUI. Distilled skills are emitted as records the existing skills
  loader can consume — least-privilege tool clamping is enforced, never
  granting a capability the trajectory did not exercise.
- **Not in scope (already absorbed):** the agent loop, skills *disclosure*,
  per-thread rollout, sandbox delegation, provider routing — reused.
