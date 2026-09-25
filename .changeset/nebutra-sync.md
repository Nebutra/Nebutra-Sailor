---
"nebutra": minor
---

Add `nebutra sync` — makes a project's `.env.example` / `.env.local` agree with
the capabilities declared in `nebutra.config.json`, idempotently. It reuses the
same capability→provider→env-key table `nebutra status` already reads (now
factored into `src/utils/capabilities.ts`, the single source of truth for
both commands), appends any env key a declared capability's providers read
that isn't already present anywhere in `.env.example` (grouped under a
`# <capability> (<provider>)` comment, values left empty — never a real
secret), and creates an empty `.env.local` with a header comment if missing.
Unknown capability names in the manifest fail with `CONFIG_ERROR` and list the
valid names; duplicates are deduped with a warning. Supports `--dry-run`
(prints the planned additions, writes nothing, exits `10`) and `--json` for
agent-consumable output shaped `{ added, unchanged, warnings }`.
