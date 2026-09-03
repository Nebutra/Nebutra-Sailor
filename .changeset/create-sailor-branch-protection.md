---
"create-sailor": patch
---

`templates/infra/ops/platform-expected.example.json` gains `github.branchProtection[]` — the required status checks, up-to-date rule, admin enforcement and review count a protected branch must carry — so `scripts/ops/platform-reconcile.mjs` reports when the bar that decides "CI is green" changes in the GitHub UI. Read from `GET /repos/{owner}/{repo}/branches/{branch}/protection`; a token without `administration:read` reports the row as skipped, never as an error.
