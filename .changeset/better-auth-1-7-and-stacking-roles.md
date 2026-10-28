---
"@nebutra/auth": patch
"@nebutra/ui": patch
"@nebutra/legal": patch
"@nebutra/marketing": patch
"create-sailor": patch
---

Upgrade `better-auth` and `@better-auth/core` to 1.7.14, which clears GHSA-965c-763c-88jm (critical), GHSA-q84f-53jg-9ppm and GHSA-r4xp-prcw-77qf (high). Generic OAuth callbacks moved from `/api/auth/oauth2/callback/:id` to `/api/auth/callback/:id`: register `/api/auth/callback/feishu` with Feishu before enabling it, and re-run `scripts/register-admin-oidc-client.ts` for the dormant admin SSO client. Google and GitHub sign-in already used the new path.

Stacking is chosen by role everywhere: every Tailwind `z-50`-and-above utility in apps and packages now names a `--layer-*` role (or a local `z-10`/`z-20`), and `lint-z-index` catches that spelling from now on. `Avatar` groups stack with a local `isolate` context instead of `z-10`…`z-60`.
