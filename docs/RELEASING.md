# Releasing to npm

> **TL;DR**: write code → `pnpm changeset` → PR to main → merge → CI opens a "version packages" PR → merge it → CI publishes to npm.

No manual `npm publish`, no OTP typing, no juggling `.npmrc` with tokens. Everything goes through GitHub Actions using the `NPM_TOKEN` secret.

---

## The 4-step flow

### 1. Make your changes on a feature branch

```bash
git checkout -b feat/my-change
# edit packages/create-sailor/... or packages/cli/...
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

### 3. Merge your PR to main → CI opens a "version packages" PR

Once your PR lands on `main`, `.github/workflows/release.yml` runs:
- `changesets/action@v1` detects the pending `.changeset/*.md` file
- Opens (or updates) a PR titled **`chore(release): version packages`**
- That PR contains:
  - `package.json` version bumps
  - `CHANGELOG.md` additions
  - `.changeset/*.md` files deleted (consumed)

**Don't merge this PR immediately** — batch up more changesets into it if you have multiple features shipping together. Each new changeset merged to main updates the same "version packages" PR.

### 4. Merge the "version packages" PR → CI publishes to npm

When you merge **`chore(release): version packages`** to main:
- `release.yml` runs again
- This time, no `.changeset/*.md` files remain, and `package.json` versions differ from what's on npm
- `changesets/action@v1` calls `bash ./scripts/release-publish.sh`
- That script reads `NPM_TOKEN` from secrets, runs `pnpm exec changeset publish`
- Packages go up to npm with provenance attestation (OIDC-signed)
- GitHub Releases are auto-created with the changelog

Confirm on https://www.npmjs.com/package/create-sailor (or whatever you shipped).

---

## Pipeline pieces

| File / Location | What it does |
|---|---|
| `.changeset/config.json` | Changesets CLI config (baseBranch, changelog repo, access level) |
| `.github/workflows/release.yml` | GitHub Actions that runs on every main push |
| `scripts/release-publish.sh` | Picks `NPM_TRUSTED_PUBLISHING` (OIDC) or `NPM_TOKEN` and runs `changeset publish` |
| `package.json` root scripts | `pnpm version:packages` → `changeset version` |
| GitHub secrets | `NPM_TOKEN` — a granular access token with `bypass_2fa: true` scoped to the `nebutra` org |

---

## Publishable packages today

Anything in `packages/*/package.json` **without** `"private": true` gets published. Currently:

- `create-sailor` — the scaffolder invoked by `npm create sailor@latest`
- `nebutra` — the CLI (`npx nebutra ...`)

All `apps/*` and all other `packages/*` are marked `private: true` so they never ship to npm.

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
- `scripts/release-publish.sh` exited 1 because `NPM_TOKEN` was missing → re-set the secret
- The package's version in `package.json` matches what's already on npm → changeset thinks there's nothing to publish (this is the silent "success" case)
- Package has `"private": true` → excluded from publish

### "Can I see what will publish before merging?"

Yes — in the "version packages" PR, the diff shows exactly which `package.json`s get version bumps. Only those packages ship.

### "My account has `auth-and-writes` 2FA and I'm worried about CI being blocked"

Use a **granular access token with `bypass_2fa: true`** (which is what `NPM_TOKEN` already is). `auth-and-writes` only blocks classic publish tokens; granular tokens with the bypass flag work fine in CI.

You can create new ones at https://www.npmjs.com/settings/tseka_luk/tokens (requires OTP via web login — save the token value somewhere safe the moment it's created, npm only shows it once).

---

## Moving to OIDC trusted publishing (future)

npm now supports OIDC-based trusted publishing without any token at all. Our `scripts/release-publish.sh` already branches on `NPM_TRUSTED_PUBLISHING=true`. To migrate:

1. On npmjs.com, set up trusted publisher for `create-sailor` and `nebutra` → link to `Nebutra/Nebutra-Sailor` + `release.yml` workflow
2. Add `NPM_TRUSTED_PUBLISHING=true` as a GitHub **variable** (not secret) on the repo
3. Remove the `NPM_TOKEN` secret

After this, CI publishes via short-lived OIDC tokens — no long-lived credential exists anywhere.

---

## What you should NOT do

- ❌ **Never commit `.npmrc` with an auth token.** The root `.npmrc` is tracked for pnpm hoisting config only. `.gitignore` blocks any `.npmrc` in subdirectories.
- ❌ **Never `npm publish` a package whose version already exists on npm.** npm's immutability rule rejects it. Bump the version (via changeset) first.
- ❌ **Never run `changeset version` on main directly** — always go through the "version packages" PR that CI opens. Running locally + pushing diverges the release history.
- ❌ **Never share the bypass `NPM_TOKEN` in chat, issues, or PRs.** If leaked, rotate at https://www.npmjs.com/settings/tseka_luk/tokens immediately and re-run `gh secret set NPM_TOKEN ...`.
