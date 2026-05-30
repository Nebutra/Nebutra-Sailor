---
"create-sailor": minor
---

Maintenance + dependency upgrades:

- Bump CLI dependencies: `commander` 12→15, `ignore` 5→7, `@clack/prompts` 0.7→1.5, `@mrleebo/prisma-ast` 0.15→0.16.
- Raise the Node engine floor to `>=20.9.0` (Node 18 is EOL; `commander` 15 requires Node 20+).
- Migrate `@clack/prompts` `validate` callbacks to v1's stricter `string | undefined` value type.
- Drop an unused `@ts-expect-error` on the optional `@nebutra/analytics` import (was failing `tsc` with TS2578).

CLI commands, flags, and scaffold behavior are unchanged.
