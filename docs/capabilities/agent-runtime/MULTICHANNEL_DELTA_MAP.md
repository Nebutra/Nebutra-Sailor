# agent-runtime — multi-channel-gateway delta map (P2)

> Source: an open-source multi-channel AI assistant (conversation-only; an
> intentionally messy monorepo — clean design extracted, not the mess).
> Frame (consistent across 7 absorptions): **extend `@nebutra/agent-runtime`,
> translate ONLY the delta**.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tools, rollout, dispatcher, sandbox seam, skills, hooks, commands, subagents, artifact-stream, workbench, design-context, edit-planner, project-repo, deployment-status, memory-provider, skill-distillation, provider | **SKIP** | already absorbed; reused |
| — | platform SDKs (messaging clients), TUI, telemetry sprawl | **SKIP (as seam / out-of-scope)** | transport injected; the "屎山" is not ported |
| 1 | **Multi-channel gateway** — channel-agnostic `InboundMessage`/`OutboundMessage` normalization, a `ChannelAdapter` port (parseInbound returns null for non-message events, never throws on junk), a tenant-scoped `ChannelRegistry`, and outbound route-back through the originating channel/conversation. The agent runtime begins at "a turn"; this is the front-door transport layer below it. | **PORT** | `channel-gateway.ts` |
| 2 | **Inbound admission + conversation resolution** — deterministic tenant-prefixed `resolveSessionKey` (group=per-chat / DM=per-sender / per-thread bindings; cross-tenant keys can never collide), allowlist gating (exact / `*` / `prefix:*`, closed-by-default), mention gating (group requires @mention or reply-to-assistant; DM never), and a time-injected `InboundDebouncer` that coalesces bursts. Composed by `admitInbound` → a normalized turn input or a typed rejection reason. | **PORT** | `inbound-admission.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **365 tests green,
  typecheck clean**. Tenant-scoped & fail-closed; pure data/logic; transport
  injected; time injected (no timers).
- **Deliberately not ported (not faked):** platform messaging SDKs, the TUI,
  the source's telemetry/ops sprawl — the messy implementation is excluded;
  only the clean adapter/admission contracts are re-expressed.
- **Not in scope (already absorbed):** the agent loop and everything
  downstream of "a turn" — reused via the existing package.
