---
"@nebutra/agent-runtime": minor
---

Absorb the multi-channel-gateway delta (over the already-absorbed core).

- `channel-gateway`: channel-agnostic `InboundMessage`/`OutboundMessage`
  normalization, a `ChannelAdapter` port (parseInbound returns null for
  non-message events, never throws on junk), tenant-scoped `ChannelRegistry`,
  and outbound route-back through the originating channel.
- `inbound-admission`: deterministic tenant-prefixed `resolveSessionKey`
  (group/DM/thread bindings, cross-tenant non-colliding), allowlist gating
  (exact / `*` / `prefix:*`, closed-by-default), mention gating (group
  requires @mention or reply-to-assistant; DM never), a time-injected
  `InboundDebouncer`, composed by `admitInbound`.

Tenant-scoped & fail-closed; pure data/logic; transport + time injected.
Only the clean contracts were re-expressed (the messy source impl is not
ported). 365 package tests.
