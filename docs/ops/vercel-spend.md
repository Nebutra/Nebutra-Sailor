# Vercel spend (keep kuanlan Git-linked, ship on Fly)

Stop paying for monorepo noise. Do not Unlink the leftover kuanlan Vercel
project. Production for 观澜 is Fly Singapore, not Vercel.
All of this is owned in git. There is no Dashboard ritual.

## Tokens

Fly tokens that appeared in chat were revoked. New Fly credentials, when the
origin slice needs them, go in GitHub `FLY_API_TOKEN` or `fly auth` only.

## What the invoices actually said (2026-09-02 audit)

Read from `GET /v1/invoices` with the owner's CLI token. Two usage invoices
in the period that started 2026-08-23, each cut when accrued usage crossed
$100:

| Invoice | Total | Build CPU Minutes | Everything else combined |
| --- | --- | --- | --- |
| 2026-08-28 | $100.05 | $99.39 (33,998 CPU-min cumulative) | $0.66 |
| 2026-09-01 | $101.49 | $99.79 (62,510 CPU-min cumulative) | $1.70 |

Web Analytics events, Speed Insights, functions, ISR, image optimization and
bandwidth were pennies. One seat. No marketplace add-ons, stores or domains.
The bill is build CPU minutes, at about $22 a day, and two things made it:

1. **Turbo build machines.** Vercel's elastic machine selection promoted
   `nebutra-landing` and `nebutra-web` to `turbo` (30 vCPU) on 2026-08-20/22
   with reason `long-build-duration`. Build CPU minutes bill per vCPU, so a
   turbo minute costs 7.5× a standard one. Of the ~45,000 CPU-minutes the
   deployments API accounts for since 2026-08-19, 96% were those two projects.
   The same minutes on `standard` would have been about $26 instead of $158.
2. **The ignore script never skipped anything.** Every Vercel build log from
   the day `scripts/vercel-ignore-build.sh` landed carried
   `→ Building to avoid a false skip.` Vercel runs the Ignored Build Step
   inside the Root Directory with no usable git checkout; the script derived
   the repo root from `git rev-parse … || pwd`, got `apps/landing`, looked for
   `apps/landing/apps/landing`, and took the fail-open branch. Every branch
   push built a preview on every Git-linked project — 164 landing previews,
   98 web, 101 auth in 30 days. Fixed on 2026-09-02: the root is now the
   script's own parent directory, and the architecture test runs the script
   the way Vercel does.

Repo-side settings (`vercel.json`, the ignore script) only protect branches
that contain them; a stale branch keeps the behaviour it was cut with. The
project-level settings below apply to every branch and are the real lock:

| Project | Build machine | Dashboard Ignored Build Step |
| --- | --- | --- |
| `nebutra-landing` | `standard` (builds run on GitHub anyway) | `exit 0` — ships only from the workflow |
| `nebutra-web` | `standard` | `exit 0` — production is Fly |
| `nebutra-auth` | `standard` | `exit 0` — production is the edge Worker + Fly |
| `docs` | `standard` | script (CLI-only, not Git-linked) |
| `nebutra-kuanlan` | `standard` | script — leftover Git-linked project; Fly-primary skip |

Applied 2026-09-02 with `PATCH /v9/projects/{id}` (`resourceConfig.buildMachineType`,
`commandForIgnoringBuildStep`). Setting `buildMachineType` explicitly flips
`resourceConfig.buildMachineSelection` from `elastic` to `fixed` (the only two
values the API accepts), so landing, web and docs can no longer be promoted
by a long build. `nebutra-auth` and `nebutra-kuanlan` were never changed and
remain `elastic`; set their type once if they ever start building again.

## Why the bill moves

Vercel meters build minutes. Two things spend them: a remote build the Git
integration opens on push, and a remote build a `vercel deploy` from CI opens.
`Nebutra/Nebutra-Sailor` is Git-linked to several Vercel projects, so one
`main` push can open a deployment on every still-connected project, and a
workflow that also deploys the same commit doubles it. The repo decides which
of those builds actually run.

| Project | Git | How it ships | Repo lock |
| --- | --- | --- | --- |
| `nebutra-landing` | connected, auto-deploy off | [`deploy-landing-vercel.yml`](../../.github/workflows/deploy-landing-vercel.yml): `vercel build` on the GitHub runner, then `vercel deploy --prebuilt` | [`apps/landing/vercel.json`](../../apps/landing/vercel.json) `git.deploymentEnabled: false`; `ignoreCommand` kept for the day Git is re-enabled |
| `nebutra-kuanlan` | connected | Fly `nebutra-kuanlan` in `sin` via [`deploy-fly.yml`](../../.github/workflows/deploy-fly.yml) | [`apps/kuanlan/vercel.json`](../../apps/kuanlan/vercel.json) + Fly-primary skip |
| `nebutra-web` | connected, auto-deploy off | [`deploy-web-vercel.yml`](../../.github/workflows/deploy-web-vercel.yml) `workflow_dispatch` | `git.deploymentEnabled: false` |
| `nebutra-auth` | connected, auto-deploy off | [`deploy-auth-vercel.yml`](../../.github/workflows/deploy-auth-vercel.yml) `workflow_dispatch` | `git.deploymentEnabled: false` |
| `nebutra-sailor-docs` | see [`deploy-sailor-docs.yml`](../../.github/workflows/deploy-sailor-docs.yml) | push job gated by `DEPLOY_TARGET_SAILOR_DOCS`; `pnpm-lock.yaml` is not a trigger | path filter in the workflow |

Do not Unlink `nebutra-kuanlan`. Do not add web/auth push triggers back. Do
not put a bare `vercel deploy` back into the landing workflow.

## landing — build on GitHub, ship prebuilt

The repository is public, so GitHub Actions minutes are free. The landing
workflow runs `vercel pull` → `vercel build` → `vercel deploy --prebuilt` from
the repository root; the CLI reads the project's Root Directory and runs the
install and build commands from `apps/landing/vercel.json` inside
`apps/landing`, exactly as Vercel's builders would. Vercel receives only
`.vercel/output`, so it meters no build minutes for landing. Hosting, ISR,
`next/og`, and image optimization are unchanged: the output format is the
same.

What was removed, and why:

- **The Git integration build.** With `git.deploymentEnabled: false` a main
  push no longer opens a remote build alongside the workflow's. Before
  2026-09-02 a commit touching `packages/design/ui` built landing twice.
- **The nightly redeploy.** A `schedule` cron re-ran `vercel deploy --prod`
  every evening to retry a deploy the Hobby daily cap had refused. On a
  metered plan it rebuilt an unchanged site thirty times a month.
- **The quota soft-fail.** A refused upload used to leave the job green with a
  step-summary note. Without the nightly retry that would be a silent loss,
  so a refused upload now fails the job and the summary says nothing shipped.

`workflow_dispatch` with `promote: false` builds and uploads a preview URL
only. Use it after touching the workflow or the build command, before the
next main push promotes to nebutra.com. Variables marked **Sensitive** in the
Vercel dashboard cannot be pulled by `vercel pull`; if the build needs one it
fails on the runner rather than shipping without it — un-mark it or move it to
a GitHub secret.

## kuanlan — Fly-primary, leftover Vercel project

[`apps/kuanlan/vercel.json`](../../apps/kuanlan/vercel.json) stays Git-linked
so the Vercel project does not need a Dashboard ritual. The ignore script
exits 0 for `apps/kuanlan` unless someone opts in with
`VERCEL_ALLOW_FLY_OPTIONAL=1` or `[vercel:apps/kuanlan]`.

Do not put kuanlan on the ECS-optional list. Do not Unlink the project.

## Next slice

Global Fly Machines + Shanghai ECS as the China origin (not an ECS→Fly
proxy): [2026-08-31-fly-global-china-ecs-origin.md](../architecture/2026-08-31-fly-global-china-ecs-origin.md).
