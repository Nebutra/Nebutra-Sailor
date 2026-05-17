---
"@nebutra/agent-runtime": minor
---

Absorb the IDE-coding-agent delta (over the already-absorbed CLI core).

- `code-review`: a pure unified-diff parser, branch-base resolution, a
  confidence-banded review prompt (CRITICAL ≥95% / WARNING ≥85% /
  SUGGESTION ≥75% / below → omit) with an untrusted-content injection guard
  over diff + commit messages, an advisory/no-edit invariant, a fail-closed
  finding parser (`ReviewParseError` rather than a fabricated empty result),
  and a deterministic post-review mode handoff.
- `context-compaction`: in-session, mid-turn context-overflow recovery — a
  1.3× token-correction estimator, a 60%-floored budget, greedy whole-message
  packing with an oversized-message clipped-transcript fallback,
  bounded-concurrency chunk summarization with a preserve-rubric prompt, a
  recursive binary reduce capped at an output token limit, and a fail-closed
  `"compact"` retry sentinel (never silently drops context).
- `commit-message` (WRAP): a Conventional-Commits prompt + git-context shape +
  "regenerate materially different" negative constraint + fence/quote
  stripping + bounded retry over the existing injected small-model seam.

Tenant-scoped / fail-closed where stateful; pure where stateless; the only
impurity is an injected model/summarize port. 632 package tests.
