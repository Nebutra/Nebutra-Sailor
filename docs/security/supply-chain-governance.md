# Supply Chain Governance

Nebutra-Sailor treats package installation as a privileged operation. The
default policy is intentionally conservative because npm supply-chain attacks
commonly execute through fresh package versions, dependency lifecycle scripts,
or privileged GitHub Actions workflows.

## Blocking controls

- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, delaying newly
  published versions by 24 hours before they can be resolved.
- `pnpm-workspace.yaml` sets `strictDepBuilds: true`; any dependency with an
  unreviewed lifecycle script fails installation.
- Root `package.json` owns the reviewed lifecycle-script allowlist in
  `pnpm.onlyBuiltDependencies`.
- `pnpm-workspace.yaml` sets `ignorePnpmfile: true`, so dependency resolution
  cannot execute project-local pnpmfile JavaScript.
- `.npmrc` pins package-manager strictness and fails `pnpm run` when
  `node_modules` is stale.
- CI and nightly security scans run `pnpm supply-chain:verify`.

## Workflow policy

`pull_request_target` is only allowed for workflows that do not check out or run
untrusted pull request code. The current allowlist is:

- `.github/workflows/cla.yml`
- `.github/workflows/labeler.yml`

`id-token: write` is only allowed for jobs that need OIDC by design. The current
workflow allowlist is:

- `.github/workflows/docker-build-push.yml`
- `.github/workflows/release.yml`
- `.github/workflows/scorecard.yml`

Any change to these allowlists must update
`scripts/verify-supply-chain-policy.mjs` in the same PR.

## Local checks

Run the policy gate before merging dependency, lockfile, or workflow changes:

```bash
pnpm install --frozen-lockfile
pnpm supply-chain:verify
pnpm audit --prod --audit-level=high
```

If `pnpm supply-chain:verify` reports stale dependencies after a policy change,
run `pnpm install --frozen-lockfile` once so pnpm refreshes its local dependency
state.
