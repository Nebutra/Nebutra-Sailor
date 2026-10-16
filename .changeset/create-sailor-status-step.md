---
"create-sailor": patch
---

The finish screen and `.sailor/next-steps.md` now list `pnpm nebutra status` (with `--json` for agents) right after `pnpm dev`. A freshly scaffolded project answers it without a separate build step.

`npx create-sailor` now installs with pnpm by default. It used to pick npm from the `npx` user agent, and npm cannot resolve the workspace's `catalog:` specifiers (`EUNSUPPORTEDPROTOCOL`); the finish screen then printed `npm install` / `npm dev`. `--pm` still overrides.
