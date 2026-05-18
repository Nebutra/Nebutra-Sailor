---
"nebutra": patch
"create-sailor": patch
---

Close drift between the CLI/scaffolder surface and the current monorepo.

`nebutra`:
- Read VERSION from package.json at module load (was hardcoded "0.1.0"
  while published as 0.3.0, breaking --version and update-notifier).
- Switch `@nebutra/theme` dep from `workspace:*` to published `^0.1.0`
  and bundle @nebutra/* via tsup `noExternal` so the npm package runs
  standalone (the upstream @nebutra/theme ships .ts sources Node refuses
  to import from node_modules).
- Replace stale `api-gateway` strings with `backends/gateway` in preset
  apps, test VALID_APPS, generate route description, and ai agents
  scanner comments (file paths were already correct).
- Clean preset app lists to actual scaffolded apps: drop `admin`, `blog`
  (don't exist as scaffolded apps; were moved into feature flags), and
  rename `docs` → `sailor-docs`.
- Extend `nebutra doctor` with monorepo-layout drift checks: legacy
  `apps/api-gateway/` warning, presence of `backends/gateway/`,
  categorized-packages enforcement (flag flat `packages/<name>/`),
  and `.nebutra/scaffold-meta.json` marker check.
- Add `--category <design|iam|commerce|integrations|platform|ops|ai>`
  required option to `nebutra generate package`, placing new packages
  under the categorized layout `packages/<category>/<name>/`. Also
  point `generate component` at `packages/design/ui` (was the old
  pre-merger `packages/ui`).

`create-sailor`:
- Show the same `NEBUTRA_TELEMETRY` first-run banner that the runtime
  CLI shows, using a shared `~/.config/nebutra/first-run-acked` marker
  so the banner only fires once per machine across both tools. Users
  running `npm create sailor@latest` now see the opt-out notice on
  first scaffold, matching what the Privacy + Cookies pages document.
