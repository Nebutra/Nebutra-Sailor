# Vercel spend (keep kuanlan launchable)

Stop paying for monorepo noise. Do not close the kuanlan release channel.
All of this is owned in git. There is no Dashboard ritual.

## Tokens

Fly tokens that appeared in chat were revoked. New Fly credentials, when the
origin slice needs them, go in GitHub `FLY_API_TOKEN` or `fly auth` only.

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
| `nebutra-kuanlan` | connected | Git, once `apps/kuanlan/package.json` is on `main` | [`apps/kuanlan/vercel.json`](../../apps/kuanlan/vercel.json) + ignore script |
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

## kuanlan — same path as landing

[`apps/kuanlan/vercel.json`](../../apps/kuanlan/vercel.json) is the project
root for Vercel (Root Directory `apps/kuanlan`). It only declares
`ignoreCommand`. [`scripts/vercel-ignore-build.sh`](../../scripts/vercel-ignore-build.sh)
exits 0 until `apps/kuanlan/package.json` exists, so monorepo pushes do not
compile an app that is not on the SHA.

Launch is a normal app PR:

1. Land `package.json`, source, and a real `buildCommand` in the same
   `vercel.json` (keep the `ignoreCommand`).
2. Tighten the `apps/kuanlan` scope in the ignore script to the workspace
   deps that PR actually adds. Do not put kuanlan on the ECS-optional list.
3. Push to `main`. In-scope changes deploy. To force one ship, put
   `[vercel-force]` in the commit message.

## Next slice

Global Fly Machines + Shanghai ECS as the China origin (not an ECS→Fly
proxy): [2026-08-31-fly-global-china-ecs-origin.md](../architecture/2026-08-31-fly-global-china-ecs-origin.md).
