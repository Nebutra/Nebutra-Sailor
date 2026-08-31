# Vercel spend (keep kuanlan launchable)

Stop paying for monorepo noise. Do not close the kuanlan release channel.
All of this is owned in git. There is no Dashboard ritual.

## Tokens

Fly tokens that appeared in chat were revoked. New Fly credentials, when the
origin slice needs them, go in GitHub `FLY_API_TOKEN` or `fly auth` only.

## Why the bill moves

`Nebutra/Nebutra-Sailor` is Git-linked to several Vercel projects. Each `main`
push can open a deployment on every still-connected project. The repo decides
which of those builds actually run.

| Project | Git | How it ships | Repo lock |
| --- | --- | --- | --- |
| `nebutra-landing` | connected | Git + [`deploy-landing-vercel.yml`](../../.github/workflows/deploy-landing-vercel.yml) | [`apps/landing/vercel.json`](../../apps/landing/vercel.json) `ignoreCommand` |
| `nebutra-kuanlan` | connected | Git, once `apps/kuanlan/package.json` is on `main` | [`apps/kuanlan/vercel.json`](../../apps/kuanlan/vercel.json) + ignore script |
| `nebutra-web` | connected, auto-deploy off | [`deploy-web-vercel.yml`](../../.github/workflows/deploy-web-vercel.yml) `workflow_dispatch` | `git.deploymentEnabled: false` |
| `nebutra-auth` | connected, auto-deploy off | [`deploy-auth-vercel.yml`](../../.github/workflows/deploy-auth-vercel.yml) `workflow_dispatch` | `git.deploymentEnabled: false` |

Do not Unlink `nebutra-kuanlan`. Do not add web/auth push triggers back.

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
