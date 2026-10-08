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
- `pnpm-workspace.yaml` owns the reviewed lifecycle-script allowlist in
  `allowBuilds`, plus `overrides` and audit exceptions. Current pnpm does not
  read `package.json#pnpm` or project settings in `.npmrc`.
- `pnpm-workspace.yaml` sets `ignorePnpmfile: true`, so dependency resolution
  cannot execute project-local pnpmfile JavaScript.
- `package.json#packageManager` pins pnpm 11.28.5; pnpm manages the matching
  runtime automatically. `verifyDepsBeforeRun: error` in the workspace blocks
  commands when `node_modules` is stale.
- CI and nightly security scans run `pnpm supply-chain:verify`.

## Workflow policy

`pull_request_target` is only allowed for workflows that do not check out or run
untrusted pull request code. The current allowlist is:

- `.github/workflows/cla.yml`
- `.github/workflows/labeler.yml`

`id-token: write` is only allowed for jobs that need OIDC by design. The current
workflow allowlist is:

- `.github/workflows/release.yml`
- `.github/workflows/scorecard.yml`

(`docker-build-push.yml` held the third entry until it was retired on
2026-09-02; a future image-publish workflow must be added back here and in the
script before it may request `id-token: write`.)

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

## pnpm 11 migration review (2026-10-08)

The install-script approvals move unchanged to `allowBuilds`, and public
hoisting and stale-dependency checks move from `.npmrc` to the workspace.
`trustPolicy: no-downgrade` stays enabled. Registry metadata for the locked
express-rate-limit, react-redux, reselect and uuid releases lacks provenance;
same-major attested versions replace them via exact overrides.

One new exact trust exception remains: `groq@3.88.1-typegen-experimental.0`,
pinned by `@sanity/sdk@2.11.1`. The npm dist-tag identifies Sanity's TypeGen
experiment; the tarball JS was compared with attested `groq@3.88.1`: its only
additional runtime operation is a no-op `defineProjection`. It has no
dependencies or lifecycle scripts, but **no provenance attestation**. The
experimental declaration file exposes projection/schema types used by the SDK,
so replacing it with stable 3.88.1 would change the type contract. Remove the
exception when Sanity ships a compatible attested dependency.
