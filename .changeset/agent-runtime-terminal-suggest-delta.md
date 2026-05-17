---
"@nebutra/agent-runtime": minor
---

Absorb the terminal-suggestion delta (over the already-absorbed core).

- `fuzzy-match`: smart-case subsequence fuzzy match returning
  `{score, indices}` (lowercase query ⇒ case-insensitive; any uppercase ⇒
  case-sensitive), case-insensitive + ignore-spaces variants (indices map to
  original text), anchored glob-wildcard (`* ? [a-z] \`, no catastrophic
  backtracking), stable `rankByFuzzy`. Pure, dependency-free.
- `command-suggestions`: `classifyMatch` with deterministic
  exact > prefix > fuzzy score banding, `rankSuggestions` (history-boost +
  shorter-text + stable tie-breaks), `dedupeByText` (history-wins,
  case-insensitive), tenant-scoped `SuggestionHistoryStore` (recency ring,
  cross-tenant isolation). Fuzzy matcher injected.

Tenant-scoped & fail-closed where stateful; pure data/logic. The source's
generated `command-signatures-v2` JS bundle was deliberately not ported.
426 package tests.
