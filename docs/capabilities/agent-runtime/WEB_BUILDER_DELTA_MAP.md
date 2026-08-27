# agent-runtime — web-app-builder delta map (P2)

> Source: an open-source browser AI web-app builder (conversation-only).
> Frame (governance-confirmed): **extend `@nebutra/agent-runtime`, translate
> ONLY the delta** — the harness/agent core is already absorbed.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tool/MCP, rollout, dispatcher, sandbox seam, skills, hooks, commands, subagents, LLM provider/routing | **SKIP** | already absorbed; reused |
| — | in-browser WebContainer runtime | **SKIP (as seam)** | maps onto existing `ExternalSandbox` / injected ports — not re-ported (browser-bound) |
| 1 | **Streaming artifact/action protocol** — model emits an `<artifact>` of ordered `<action type=file\|shell\|start\|build\|data>` blocks; an incremental chunk-fed parser extracts them mid-stream (split-tag safe, no dup emit); an action runner executes them in submission order behind injected exec ports with a `pending→running→complete\|aborted\|failed` state-machine and queue-halt-on-failure. Distinct from tool-calling (a streamed structured plan). | **PORT** | `artifact-stream.ts` |
| 2 | **Workbench project-state model** — tenant-scoped project FileMap (immutable ops, auto-derived folders), apply-file-mutation, snapshot/restore with deep-copy isolation, bounded snapshot history, project diff summary; behind a `ProjectPersistencePort` (in-memory ref impl, mirrors the rollout-store seam). | **PORT** | `workbench.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **181 tests green,
  typecheck clean**. Tenant-scoped & fail-closed; pure data/logic; execution
  delegated via injected ports (no in-process exec, no host FS).
- **Deliberately not ported (not faked):** the in-browser WebContainer
  runtime (browser-bound — its role is filled by the existing
  `ExternalSandbox`/injected-port seam); deploy-provider integrations; the
  IDE/editor/preview UI; provider-specific data actions are generalised to a
  neutral `data` action.
- **Not in scope (already absorbed):** the agent loop, tools, policy,
  rollout, dispatcher, provider routing — reused via the existing package.
