# agent-runtime — terminal-suggestion delta map (P2)

> Source: an open-source agentic terminal (Rust, conversation-only). Frame
> (consistent across 8 absorptions): **extend `@nebutra/agent-runtime`,
> translate ONLY the delta**.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tools, rollout, dispatcher, sandbox seam, skills, hooks, commands, subagents, artifact-stream, workbench, design-context, edit-planner, project-repo, deployment-status, memory-provider, skill-distillation, channel-gateway, inbound-admission, provider | **SKIP** | already absorbed; reused |
| — | block/persistence model, LSP, syntax-tree, vim | **SKIP** | overlaps rollout/workbench / out-of-scope |
| — | `command-signatures-v2` | **DROPPED (not faked)** | it is a generated JS-bundle embedder, not portable design — honestly excluded |
| 1 | **Fuzzy-match primitive** — smart-case subsequence fuzzy match returning `{score, indices}` (lowercase query ⇒ case-insensitive; any uppercase ⇒ case-sensitive), case-insensitive + ignore-spaces variants (indices point at original text), anchored glob-wildcard (`* ? [a-z] \` escape, `/` ordinary, no catastrophic backtracking), and a stable `rankByFuzzy`. Pure, dependency-free — a primitive `@nebutra/agent-runtime` lacked. | **PORT** | `fuzzy-match.ts` |
| 2 | **Command/input suggestion engine** — `classifyMatch` with deterministic exact > prefix > fuzzy score banding, `rankSuggestions` (drop non-matches unless empty query; tie-break: score → history-boost → shorter text → stable), `dedupeByText` (history-wins, case-insensitive), and a tenant-scoped `SuggestionHistoryStore` (recency ring, cross-tenant isolation). Fuzzy matcher injected (no coupling). | **PORT** | `command-suggestions.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **426 tests green,
  typecheck clean**. Tenant-scoped & fail-closed where stateful; pure
  data/logic; fuzzy matcher injected into the suggestion engine.
- **Deliberately not ported (not faked):** `command-signatures-v2` (a
  generated JS bundle, not design); block/persistence/LSP/syntax/vim
  subsystems (overlap or out-of-scope); the Rust terminal UI.
- **Not in scope (already absorbed):** the agent loop and everything
  downstream — reused via the existing package.
