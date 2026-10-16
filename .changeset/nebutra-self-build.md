---
"nebutra": patch
---

Inside a Sailor workspace, an unbuilt `nebutra` bin now builds itself once (`pnpm --filter nebutra... run build`, output on stderr) instead of exiting with "built entry not found". `pnpm nebutra status --json` works right after `create-sailor`. Outside a workspace the build hint is unchanged.
