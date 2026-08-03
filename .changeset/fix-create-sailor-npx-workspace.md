---
"create-sailor": patch
"nebutra": patch
---

Make `npx create-sailor` / `npx nebutra` installable again when the published package.json still carries monorepo protocols.

`create-sailor@1.9.1` (and `nebutra@0.4.1`) shipped `"@nebutra/brand": "workspace:*"` as a production dependency. npm cannot resolve that protocol, so `npx create-sailor@latest` fails with `EUNSUPPORTEDPROTOCOL`.

Fix: keep `@nebutra/*` as build-time devDependencies, bundle them into the CLI via tsup `noExternal`, and reject monorepo-only protocols on CLI production deps in `verify:release-surface`.
