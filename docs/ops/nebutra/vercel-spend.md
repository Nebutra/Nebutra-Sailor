# Vercel spend (keep kuanlan Git-linked, ship on Fly)

Stop paying for monorepo noise. Do not Unlink the leftover kuanlan Vercel
project. Production for 观澜 is Fly Singapore, not Vercel.
All of this is owned in git. There is no Dashboard ritual.

## Tokens

Fly tokens that appeared in chat were revoked. New Fly credentials, when the
origin slice needs them, go in GitHub `FLY_API_TOKEN` or `fly auth` only.

## What the invoices actually said (2026-09-02 audit)

The invoice lines themselves are in [cost-history.md](./cost-history.md).
Everything other than build CPU minutes was pennies; the bill ran at about
$22 a day, and two things made it:

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
| `nebutra-landing` | connected, auto-deploy off | [`deploy-vercel.yml`](../../../.github/workflows/deploy-vercel.yml) `app=landing` (push to main + dispatch): `vercel build` on the GitHub runner, then `vercel deploy --prebuilt` | [`apps/landing/vercel.json`](../../../apps/landing/vercel.json) `git.deploymentEnabled: false`; `ignoreCommand` kept for the day Git is re-enabled |
| `nebutra-kuanlan` | connected | Fly `nebutra-kuanlan` in `sin` via [`deploy-fly.yml`](../../../.github/workflows/deploy-fly.yml); `deploy-vercel.yml` `app=kuanlan` on demand | [`apps/kuanlan/vercel.json`](../../../apps/kuanlan/vercel.json) + Fly-primary skip |
| `nebutra-web` | connected, auto-deploy off | [`deploy-vercel.yml`](../../../.github/workflows/deploy-vercel.yml) `app=web`, `workflow_dispatch` only | `git.deploymentEnabled: false` |
| `nebutra-auth` | connected, auto-deploy off | [`deploy-vercel.yml`](../../../.github/workflows/deploy-vercel.yml) `app=auth`, `workflow_dispatch` only | `git.deploymentEnabled: false` |
| `nebutra-pebble` | not linked | `deploy-vercel.yml` `app=pebble`, `workflow_dispatch` only (production is ECS PM2) | — |
| `docs` | not linked | `deploy-vercel.yml` `app=docs`, `workflow_dispatch` only (production is Fly) | — |
| `nebutra-sailor-docs` | see [`deploy-sailor-docs.yml`](../../../.github/workflows/deploy-sailor-docs.yml) | push job gated by `DEPLOY_TARGET_SAILOR_DOCS`; `pnpm-lock.yaml` is not a trigger | path filter in the workflow |

Do not Unlink `nebutra-kuanlan`. Do not add web/auth push triggers back. Do
not put a bare `vercel deploy` back into `deploy-vercel.yml`.

## One workflow, every app prebuilt

[`deploy-vercel.yml`](../../.github/workflows/deploy-vercel.yml) is the only
path from this repository to Vercel. It is a matrix keyed by app — `landing`,
`web`, `auth`, `pebble`, `kuanlan`, `carina`, `docs` — with the per-app table
(project names to resolve, Root Directory, domain to attach, production host
to smoke) in its `plan` job. Only `landing` has a push trigger, with its own
path filter; every other app is `workflow_dispatch` with `app:` chosen by the
operator. All seven use the same steps: resolve the project (by configured id
or by name, creating pebble/kuanlan/carina if absent), reconcile Root
Directory, attach the domain, `vercel pull` → `vercel build` →
`vercel deploy --prebuilt`, then smoke. A refused upload fails the job for
every app; the old per-app workflows let web, auth, pebble and carina go green
on a Hobby quota refusal, which without a nightly retry was a silent loss.

`carina` checks out `Nebutra/carina` at `inputs.ref` and builds `apps/docs`
(Astro) from that checkout. Production `carina.nebutra.com` is Fly
(docs/DOMAINS.md) and the Carina repository has its own Vercel workflow, so
this entry only keeps the Sailor `VERCEL_*` secrets able to bootstrap the
project. `docs` deploys `apps/sailor-docs` to the Vercel project `docs` on
demand; `docs.nebutra.com` is Fly, and the push-gated Vercel job in
`deploy-sailor-docs.yml` is unchanged.

## landing — build on GitHub, ship prebuilt

The repository is public, so GitHub Actions minutes are free. The workflow
runs `vercel pull` → `vercel build` → `vercel deploy --prebuilt` from the
repository root; the CLI reads the project's Root Directory and runs the
install and build commands from `apps/landing/vercel.json` inside
`apps/landing`, exactly as Vercel's builders would. Vercel receives only
`.vercel/output`, so it meters no build minutes for landing. Hosting, ISR,
`next/og`, and image optimization are unchanged: the output format is the
same. The other apps take the identical path from their own `apps/<app>`.

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
only. By default it builds with the **production** environment variables, so
it rehearses exactly what the next main push will ship; use it after touching
the workflow or the build command.

Variables marked **Sensitive** in the Vercel dashboard cannot be pulled;
`vercel pull` writes them with an empty value. The first production run
(2026-09-02) died in `new URL("")` because `NEXT_PUBLIC_SITE_URL`,
`DOCS_ORIGIN_URL` and `NEXT_PUBLIC_API_URL` are flagged Sensitive on the
production target — public URLs that gain nothing from the flag. The workflow
now drops empty entries after the pull and exports the URLs declared in
`apps/<app>/vercel.json` `env`, the same values Vercel applies on its own
builders. Un-flagging those three in the dashboard is still the tidy thing to
do; the workflow no longer depends on it.

## kuanlan — Fly-primary, leftover Vercel project

[`apps/kuanlan/vercel.json`](../../../apps/kuanlan/vercel.json) stays Git-linked
so the Vercel project does not need a Dashboard ritual. The ignore script
exits 0 for `apps/kuanlan` unless someone opts in with
`VERCEL_ALLOW_FLY_OPTIONAL=1` or `[vercel:apps/kuanlan]`.

Do not put kuanlan on the ECS-optional list. Do not Unlink the project.

## Next slice

Global Fly Machines + Shanghai ECS as the China origin (not an ECS→Fly
proxy): [2026-08-31-fly-global-china-ecs-origin.md](../../architecture/2026-08-31-fly-global-china-ecs-origin.md).
