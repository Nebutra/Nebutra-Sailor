---
"@nebutra/agent-runtime": minor
---

Absorb the differentiated coding-agent-harness capabilities (the delta over
the already-absorbed core).

- `definitions`: shared layered-tier resolver (precedence + dual
  availability/enabled gate) + frontmatter parser — backs commands, skills,
  subagents from one kernel.
- `skills`: two-phase progressive disclosure (token-budget listing,
  first-party never-truncated, path-activation), lazy body expansion,
  per-skill model/tool override merge.
- `hook-pipeline`: 18-event taxonomy, config matcher/`if` resolver,
  structured decision protocol, multi-transport (function/http/prompt),
  parallel fan-out with deterministic precedence merge; wraps the bare
  `ToolHooks` as the in-process transport.
- `commands`: unified command=skill model with dual user/model front-doors
  and a pure arg-substitution + templating expander.
- `subagents`: definition resolver (tool allow−deny), fork-vs-spawn
  context-boundary contract, typed terminal-envelope result contract, and a
  tenant-scoped Task lifecycle registry.

All tenant-scoped & fail-closed; pure data/logic (no FS/shell/TUI — those
transports deliberately dropped for multi-tenant safety). 135 package tests.
