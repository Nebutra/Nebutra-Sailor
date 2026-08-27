# browser-control Anti-Patterns

- Do not put a browser agent loop in this package. The orchestration layer owns tool choice.
- Do not persist cookies inside an ephemeral sandbox profile.
- Do not replay actions without tenant-scoped recordings.
- Do not let browser automation decide user consent for login, cookies, or payment steps.
- Do not use the read-only HTTP driver for flows that need DOM mutation.
