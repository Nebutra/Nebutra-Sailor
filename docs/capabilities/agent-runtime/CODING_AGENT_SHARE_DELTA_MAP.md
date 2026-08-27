# agent-runtime — coding-agent share/permission delta map (P2)

> Source: an open-source client/server AI coding agent (conversation-only).
> Frame (consistent across 9 absorptions): **extend `@nebutra/agent-runtime`,
> translate ONLY the delta**.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tools, rollout, dispatcher, sandbox seam, skills, hooks, commands, subagents, artifact-stream, workbench, design-context, edit-planner, project-repo, deployment-status, memory-provider, skill-distillation, channel-gateway, inbound-admission, fuzzy-match, command-suggestions, provider, server, agent-mode | **SKIP** | already absorbed / overlaps subagents+dispatcher |
| 1 | **Permission ruleset evaluator** — `Rule{permission,pattern,action:allow\|deny\|ask}`, `evaluate(permission,pattern,...rulesets)` first-match over BOTH dimensions with fail-safe `ask` default, a `wildcardMatch` with the faithful trailing `" *"`-optional rule (no catastrophic backtracking), and a bash-command-prefix/arity extractor (`commandPrefix`/`commandPermissionKey`) that derives the "human-understandable command" for permission matching. Richer than the existing approval policy (which is single-axis rule→policy). | **PORT** | `permission-ruleset.ts` |
| 2 | **Shareable session** — mint a read-only `ShareRecord{id,url,secret,...}` for a session, revoke it, and a public secret-gated `verifyViewer` path (no tenantId — security rests on the unguessable secret; constant-time compare). Injected id-mint / url-builder / sync-sink / store ports; kill-switch; persist-first best-effort sync. Distinct from rollout (local log) and project-repo (git). | **PORT** | `session-share.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **496 tests green,
  typecheck clean**. Owner plane tenant-scoped & fail-closed; viewer plane
  secret-gated (documented threat model); pure where stateless; transport /
  crypto / store injected.
- **Deliberately not ported (not faked):** the client/server daemon &
  transport, provider/model catalog (already absorbed via the provider
  seam), the TUI/desktop/console apps, LSP.
- **Not in scope (already absorbed):** the agent loop, agent-mode
  (subagents), dispatcher protocol — reused via the existing package.
