---
"create-sailor": patch
"nebutra": patch
---

Align the published CLI surface with the MIT scaffold contract and stop leftover Aug 3 hotfix changesets from re-bumping already-shipped versions.

- Backfill create-sailor 1.9.2–1.9.5 and nebutra 0.4.2–0.4.3 changelog entries the hotfix train skipped
- Fix README, welcome-page, and template `package.json` copy still describing AGPL / get-license
- Document `--audit-log` as default-off (`@nebutra/audit` is WIP)
- Raise the create-sailor tsup target to Node 22 to match `engines`
