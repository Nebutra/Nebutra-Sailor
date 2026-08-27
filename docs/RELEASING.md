# Releasing Packages

> **TL;DR**: write code → `pnpm changeset` → PR to main → merge → run the manual Release workflow → merge the "version packages" PR or publish from it → mirror package artifacts to GitHub Packages.

No ad hoc `npm publish`, no OTP typing, no juggling `.npmrc` with tokens. Everything goes through GitHub Actions using trusted publishing or `NPM_TOKEN`.

---

## The 4-step flow

### 1. Make your changes on a feature branch

```bash
git checkout -b feat/my-change
# edit packages/ops/create-sailor/... or packages/ops/cli/...
```

### 2. Author a changeset

```bash
pnpm changeset
```

Interactive prompt asks:
- **Which packages changed?** → space-select `create-sailor`, `nebutra`, etc.
- **Major / minor / patch?** → follow semver
- **Summary** → one line that will show up in `CHANGELOG.md` and on the GitHub release page

A new file appears in `.changeset/` (e.g. `.changeset/witty-llama-wave.md`). Commit it with your feature:

```bash
git add .changeset/
git commit -m "feat(create-sailor): add --template flag"
git push origin feat/my-change
```

Open a PR to `main` and merge as usual.

### 3. Merge your PR to main → run Release

Once your PR lands on `main`, run `.github/workflows/release.yml` from the Actions tab:
- `changesets/action@v1` detects the pending `.changeset/*.md` file
- Opens (or updates) a PR titled **`chore(release): version packages`**
- That PR contains:
  - `package.json` version bumps
  - `CHANGELOG.md` additions
  - `.changeset/*.md` files deleted (consumed)

**Don't merge this PR immediately** — batch up more changesets into it if you have multiple features shipping together. Each new changeset merged to main updates the same "version packages" PR.

### 4. Merge the "version packages" PR → run Release again to publish

When you merge **`chore(release): version packages`** to main, run `release.yml` again:
- This time, no `.changeset/*.md` files remain, and `package.json` versions differ from what's on npm
- `changesets/action@v1` calls `bash ./scripts/release-publish.sh`
- That script publishes **two identities**:
  - Unscoped CLIs (`create-sailor`, `nebutra`) via GitHub OIDC trusted publishing
  - `@nebutra/*` via `secrets.NPM_TOKEN` (granular token scoped to the nebutra npm org)
- An org-scoped token **cannot** `PUT` unscoped names. That is the `E404 PUT create-sailor` failure, not a missing version bump.
- Published scoped packages are mirrored to GitHub Packages

Confirm on https://www.npmjs.com/package/create-sailor (or whatever you shipped).

---

## Pipeline pieces

| File / Location | What it does |
|---|---|
| `.changeset/config.json` | Changesets CLI config (baseBranch, changelog repo, access level) |
| `.github/workflows/release.yml` | Manual GitHub Actions release workflow |
| `scripts/release-publish.sh` | Unscoped CLIs via OIDC, then `changeset publish` for `@nebutra/*` with `NPM_TOKEN` |
| `scripts/publish-unscoped-packages.mjs` | Publishes pending `create-sailor` / `nebutra` without the org token |
| `config/npm-publish-identity.json` | SSOT for which names must not use the org token |
| `scripts/release-publish-github-packages.sh` | Mirrors scoped packages to GitHub Packages |
| `package.json` root scripts | `pnpm version:packages` → `changeset version` |
| GitHub secrets | `NPM_TOKEN` — a granular access token with `bypass_2fa: true` scoped to the `nebutra` org. It cannot publish unscoped names. |

---

## Publishable packages today

Anything in `apps/*`, `backends/*`, or `packages/*/*` with a `package.json` and without `"private": true` is part of the release surface. Verify it with:

```bash
pnpm verify:release-surface
node scripts/print-release-filters.mjs
```

The current publishable surface includes the `@nebutra/*` infrastructure packages, `create-sailor`, and `nebutra`. Publishable packages must not depend at runtime on private workspace packages, must declare a license, and scoped packages must use `publishConfig.access=public`.

The **build/test release graph** is a different cut: `nebutra.graph` of
`core` or `runtime`. Labs stay in the workspace but are excluded from
`pnpm build:release` / `pnpm test:release`. See `docs/package-status.md`.

Unscoped CLIs stay unscoped on purpose (`npm create sailor`, `npx nebutra`). They are listed in `config/npm-publish-identity.json` and must have a GitHub Actions trusted publisher on npmjs.com:

- Organization or user: `Nebutra`
- Repository: `Nebutra-Sailor`
- Workflow filename: `release.yml` (filename only)
- Environment name: leave empty
- Allowed actions: `npm publish`

Do this once per unscoped package at `https://www.npmjs.com/package/<name>/access`. Until that row exists, Release will fail on the unscoped package with a setup hint instead of a bare `E404`.

## GitHub Packages and subrepo mirrors

After npm publish, `release.yml` mirrors scoped packages to GitHub Packages and runs `scripts/verify-package-registry.mjs`. That check intentionally fails on missing mirrors, private packages, orphan GitHub Packages, and unexpected container packages.

Public package subrepos are generated mirrors, not source-of-truth repos. The first-wave manifest lives in `config/subrepo-mirrors.json`.

```bash
pnpm verify:subrepo-mirrors
pnpm subrepo:create -- --cohort=first-wave
pnpm subrepo:create -- --cohort=first-wave --apply
pnpm subrepo:sync -- --cohort=first-wave --all --out=/tmp/nebutra-subrepo-mirrors
pnpm subrepo:sync -- --cohort=first-wave --all --out=/tmp/nebutra-subrepo-mirrors --push
```

Use `SUBREPO_MIRROR_TOKEN` for Actions-based mirror creation and pushes. Accepted external changes from subrepos must be ported back to the package source in `Nebutra-Sailor` before release. Packages with private workspace dependencies, including optional peers or dev-only imports, must not enter the mirror manifest until that boundary is made public.

---

## Common situations

### "I want to ship a quick hot-fix without going through 2 PRs"

OK — you can do it locally from a clean checkout. But this path has zero automation:

```bash
cd /tmp                                    # a fresh worktree, not your main workspace
git clone https://github.com/Nebutra/Nebutra-Sailor.git hotfix && cd hotfix
# edit + bump version in packages/xxx/package.json
pnpm install
pnpm changeset add
pnpm exec changeset version                # consumes the changeset
pnpm --filter <package> publish --access public --no-git-checks
```

You'll need a project-local `.npmrc` with the `NPM_TOKEN`:
```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN_FROM_ENV}
registry=https://registry.npmjs.org/
```

Prefer the CI flow unless you're in production triage.

### "I merged the 'version packages' PR but nothing got published"

Check the run log:
```bash
gh run list --workflow=release.yml -R Nebutra/Nebutra-Sailor --limit 5
gh run view <run-id> --log
```

Common causes:
- `E404 PUT create-sailor` / `nebutra` → the org `NPM_TOKEN` cannot publish unscoped names. Add the trusted publisher (see above) and re-run Release. Do not mint a second org token.
- `scripts/release-publish.sh` exited 1 because `NPM_TOKEN` was missing → re-set the secret
- The package's version in `package.json` matches what's already on npm → changeset thinks there's nothing to publish (this is the silent "success" case)
- Package has `"private": true` → excluded from publish

### "Can I see what will publish before merging?"

Yes — in the "version packages" PR, the diff shows exactly which `package.json`s get version bumps. Only those packages ship.

### "My account has `auth-and-writes` 2FA and I'm worried about CI being blocked"

Use a **granular access token with `bypass_2fa: true`** (which is what `NPM_TOKEN` already is). `auth-and-writes` only blocks classic publish tokens; granular tokens with the bypass flag work fine in CI.

You can create new ones at https://www.npmjs.com/settings/tseka_luk/tokens (requires OTP via web login — save the token value somewhere safe the moment it's created, npm only shows it once).

---

## OIDC trusted publishing

Unscoped CLIs already publish this way from `release.yml` (`permissions.id-token: write`, npm >= 11.5.1). The remaining migration is for `@nebutra/*`:

1. Add the same trusted publisher (`Nebutra` / `Nebutra-Sailor` / `release.yml`) on every `@nebutra/*` package, or at the npm org default
2. Set the GitHub variable `NPM_TRUSTED_PUBLISHING=true`
3. Remove the `NPM_TOKEN` secret

Until then, keep the org token for scoped packages only. Do not flip the variable early — scoped packages without a trusted publisher will fail.

---

## What you should NOT do

- ❌ **Never commit `.npmrc` with an auth token.** The root `.npmrc` is tracked for pnpm hoisting config only. `.gitignore` blocks any `.npmrc` in subdirectories.
- ❌ **Never `npm publish` a package whose version already exists on npm.** npm's immutability rule rejects it. Bump the version (via changeset) first.
- ❌ **Never run `changeset version` on main directly** — always go through the "version packages" PR that CI opens. Running locally + pushing diverges the release history.
- ❌ **Never share the bypass `NPM_TOKEN` in chat, issues, or PRs.** If leaked, rotate at https://www.npmjs.com/settings/tseka_luk/tokens immediately and re-run `gh secret set NPM_TOKEN ...`.
