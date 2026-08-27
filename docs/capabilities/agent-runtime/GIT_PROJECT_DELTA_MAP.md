# agent-runtime — git-backed-project delta map (P2)

> Source: an open-source AI app builder where every project is a git repo
> (conversation-only). Frame (governance-confirmed): **extend
> `@nebutra/agent-runtime`, translate ONLY the delta** — harness/codegen/
> workbench core already absorbed.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tools, rollout, dispatcher, sandbox seam, skills, hooks, commands, subagents, artifact-stream, workbench, design-context, edit-planner, provider | **SKIP** | already absorbed; reused |
| — | Freestyle VM / dev-server / embedded terminal | **SKIP (as seam)** | provider-bound; maps onto `ExternalSandbox` / injected ports |
| 1 | **Git-backed project repository model** — a project IS a git repo: metadata + per-conversation jsonl logs live as committed files; one commit per turn; history/restore by commit SHA (the commit graph IS the history — distinct from `workbench`'s in-memory snapshot ring); branchable, externally syncable. Injected `GitHostPort` (provider git impl not ported); tenant ownership gate (`ownsRepo`, default-deny). | **PORT** | `project-repo.ts` |
| 2 | **Deployment lifecycle status model** — commit-keyed `idle\|deploying\|live\|failed`, latest-status derivation (matched record wins / agent-running ⇒ deploying), timeline-from-commits, explicit `advanceState` machine; preview domain from an injected suffix (no hardcoded host). | **PORT** | `deployment-status.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **252 tests green,
  typecheck clean** (resolved a `CommitRef` barrel collision by renaming the
  deployment-status structural type to `DeploymentCommitRef`).
- **Deliberately not ported (not faked):** the provider git client and the
  VM/dev-server/terminal (injected ports / `ExternalSandbox` seam); the
  builder UI; hardcoded preview domains (now an injected config value).
- **Not in scope (already absorbed):** codegen streaming, in-memory project
  file state, sandbox delegation, provider routing, edit planning, design
  ingestion — reused via the existing package.
