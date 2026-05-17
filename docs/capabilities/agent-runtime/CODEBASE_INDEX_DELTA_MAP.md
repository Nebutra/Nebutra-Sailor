# agent-runtime — codebase-index / scoped-review delta map (P2)

> Source (10th): an IDE-extension AI coding agent that is itself a fork of the
> 9th source's coding-agent CLI (conversation-only). Frame (consistent across
> 10 absorptions): **extend the absorbed grammar, translate ONLY the delta**.
> Because the base is the already-absorbed 9th source, almost everything is
> SKIP; the genuine delta is the fork's *own* additions.

## Governance decision (P2 confirmed)

The strongest delta (semantic code index) is **orthogonal to the agent
turn/loop** — a search UI / RAG endpoint / editor feature can consume it with
no agent present. Per the maintainer's call it became its **own package
`@nebutra/code-index`** carrying the same `getX()` provider-auto-detect seam as
`@nebutra/search` / `@nebutra/queue`, NOT a runtime module. The remaining
deltas extend `@nebutra/agent-runtime`.

## Map

| # | Capability | Verdict | Where |
|---|---|---|---|
| — | agent loop, durable turns, dispatcher, approval/capability policy, tool/MCP abstraction, MCP bridge, rollout + persistent store, external-sandbox seam, skills, hook pipeline, commands, subagents, artifact-stream, workbench, design-context, edit-planner, project-repo, deployment-status, memory-provider, skill-distillation, channel-gateway, inbound-admission, fuzzy-match, command-suggestions, permission-ruleset, session-share | **SKIP** | base = 9th source, already absorbed |
| — | git shadow-repo workspace snapshot; V4A `apply_patch` parser; device-auth + provider routing; worktree-isolated multi-session manager; "mode marketplace" | **SKIP** | overlap workbench/project-repo, artifact-stream/edit-planner, auth+provider seam, subagents+worktree; marketplace has no real subsystem |
| — | bundled inline-completion (FIM/NextEdit) engine | **DROP** | the source itself documents it as a vendor extraction from a third project; the source's own glue is a thin SSE call. Not ours to port; build fresh on the provider seam if ever wanted |
| B1 | **Codebase semantic-index engine** — deterministic content-addressed chunking (structural via injected parser port / line with re-balancing back-track + oversized-line hard-split / markdown header-aware / pure fallback), incremental hash-diff scan, embedding-profile drift → recreate, batched embed, exponential backoff, >10% full-scan failure gate, cosine retrieval with min-score + directory-prefix scope, fail-closed on missing/incomplete/drifted index | **PORT** | new pkg `@nebutra/code-index` (`interfaces`, `chunker`, `index-engine`, `provider`) |
| B2 | **Scoped advisory code review** — pure unified-diff parser, branch-base resolution, confidence-banded review prompt (CRITICAL ≥95 / WARNING ≥85 / SUGGESTION ≥75 / else omit), untrusted-content (diff + commit messages) injection guard, advisory/no-edit invariant, fail-closed finding parser, deterministic post-review mode handoff | **PORT** | `agent-runtime/src/code-review.ts` |
| B4 | **In-session map-reduce context compaction** — 1.3× token-correction estimator, 0.6 budget ratio (min 1000), greedy whole-message packing + oversized-message clipped-transcript fallback (tool 2000 / text 16000 char clip), bounded-concurrency (3) chunk summarization with a preserve-rubric prompt, recursive binary reduce (depth 3) capped at 2048 tokens, fail-closed `"compact"` retry sentinel | **PORT** | `agent-runtime/src/context-compaction.ts` |
| B3 | **Conventional-Commits message generation** — git-context shape + CC system prompt + "regenerate materially different" negative-constraint + fence/quote stripping + bounded retry, over the existing injected small-model seam | **WRAP** | `agent-runtime/src/commit-message.ts` |

## Honest scope

- **Done (built + TDD-tested):**
  - `@nebutra/code-index` — new package, **62 tests green, package typecheck
    clean**. Tenant-scoped (collection key = `tenantId` + `project`,
    Zod-validated, no unscoped path), fail-closed (retrieval throws
    `CodeIndexNotConfiguredError` on missing/incomplete/drifted index, never
    returns stale "looks fine" hits), deterministic content-addressing
    (segment/file hash + dependency-free stable point id), Embedder /
    VectorStore / FileSource / IndexCacheStore / CodeParser all host-injected
    (no bundled vendor, no native tree-sitter dep, no auto-detected backend
    that isn't actually present — `provider.ts` fail-closes honestly before
    configure).
  - `@nebutra/agent-runtime` += `code-review` (43), `context-compaction` (38),
    `commit-message` (29). Package total **632 tests green, typecheck clean**.
    Pure where stateless; the only impurity is an injected model/summarize
    port; advisory-review never emits edits; compaction never silently drops
    context.
- **Deliberately not ported (not faked):** the bundled inline-completion
  engine (third-party vendor extraction — documented as such by the source),
  the IDE-extension shell / TUI / SolidJS webview, telemetry, the
  auto-generated HTTP SDK, device-auth + provider routing.
- **Not in scope (already absorbed via the 9th source):** the agent loop,
  sessions, tool/MCP/permission machinery, git shadow-repo snapshot, V4A patch
  application, worktree multi-session manager.
