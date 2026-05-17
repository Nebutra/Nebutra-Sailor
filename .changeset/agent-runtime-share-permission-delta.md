---
"@nebutra/agent-runtime": minor
---

Absorb the coding-agent share/permission delta (over the already-absorbed core).

- `permission-ruleset`: `Rule{permission,pattern,action:allow|deny|ask}` +
  `evaluate(...rulesets)` first-match over both dimensions with fail-safe
  `ask` default, a `wildcardMatch` with the faithful trailing `" *"`-optional
  rule (no catastrophic backtracking), and a bash-command-prefix/arity
  extractor (`commandPrefix`/`commandPermissionKey`).
- `session-share`: mint a read-only `ShareRecord{id,url,secret}` for a
  session, revoke it, public secret-gated `verifyViewer` (no tenantId —
  constant-time compare; documented threat model). Injected id-mint /
  url-builder / sync-sink / store ports; kill-switch; persist-first
  best-effort sync.

Owner plane tenant-scoped & fail-closed; viewer plane secret-gated; pure
where stateless; transport/crypto/store injected. 496 package tests.
