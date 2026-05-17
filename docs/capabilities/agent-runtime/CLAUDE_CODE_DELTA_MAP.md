# agent-runtime — Claude-Code-class delta map (P2)

> Source: a reconstructed coding-agent harness v2.1.88 (conversation-only).
> Absorption frame (governance-confirmed): **extend `@nebutra/agent-runtime`,
> translate ONLY the differentiated capabilities** — the harness core is
> already absorbed (from the prior codex absorption). "Architecture
> translator, not mover": do not re-absorb what structurally exists.

## Decision legend

SKIP = already in `@nebutra/agent-runtime`. WRAP = primitive exists, add the
config/orchestration layer. PORT = genuinely absent design, re-expressed
tenant-scoped.

## Map

| # | Capability | Verdict | Re-expression (new module) |
|---|---|---|---|
| — | thread/turn/item, policy, tool/MCP, rollout, dispatcher, loop, durable turn, sandbox seam, bare ToolHooks | **SKIP** | already absorbed; reused, not rebuilt |
| 1 | Shared definition kernel (layered-tier merge + precedence + dual availability/enabled gate + frontmatter parser) | **PORT** | `definitions.ts` — backs #2/#4/#5 (the source uses one loader for all three) |
| 2 | Skills — two-phase progressive disclosure (budget algorithm, per-entry cap, first-party never-truncate, path-activation), inline-vs-fork dispatch, per-skill model/tool override merge | **PORT** | `skills.ts` |
| 3 | Hook pipeline — 27→18-event taxonomy, config matcher/`if` resolver, structured decision protocol (updatedInput/updatedToolOutput/additionalContext/permissionBehavior/preventContinuation), multi-transport (function/http/prompt; shell dropped), parallel fan-out + precedence merge, progress bus | **WRAP** | `hook-pipeline.ts` (wraps bare `ToolHooks` as the in-process transport) |
| 4 | Slash-command registry — unified Command=Skill type, dual front-door (user-invocable vs model-invocable), arg-substitution+templating expander | **PORT** | `commands.ts` (reuses `definitions.ts`) |
| 5 | Subagent/Task dispatch — definition resolver (tool allow−deny), fork-vs-spawn context-boundary contract (incomplete-tool-call filtering), typed terminal-envelope result contract (sync usage trailer / deferred, no-peek guard), uniform tenant-scoped Task lifecycle registry | **WRAP** | `subagents.ts` (reuses `definitions.ts`, `model.ts`; child loop/policy/rollout = SKIP) |

## Honest scope

- **Done (built + tested):** all five above. Package total **135 tests
  green, typecheck clean**. Every module tenant-scoped & fail-closed; pure
  data/logic (no FS scan, no host shell, no TUI — those transports
  deliberately dropped for multi-tenant safety, documented in each file).
- **Deliberately dropped (not faked):** body-side shell injection in skills;
  `command`/`async` shell hook transports; `local`/`local-jsx` TUI commands;
  `local_bash`/`monitor_mcp`/worktree task kinds; local-FS discovery (replaced
  by tenant-scoped record stores + injected loaders/resolvers).
- **Not in scope (already absorbed):** the harness core (loop, policy, tools,
  rollout, dispatcher, sandbox seam) — reused via the existing package.
