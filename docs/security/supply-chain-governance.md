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
- The production dependency gate counts high and critical records from pnpm's
  structured advisory report. pnpm 11 removes configured ignores from advisory
  records but leaves the metadata totals unchanged. Neither text summaries nor
  metadata totals determine the decision. Registry errors retry three times;
  a missing or malformed report fails the gate. Raw reports and evaluations
  are uploaded as CI evidence.

The two former image-size audit ignores were removed after updating its
Fumadocs dependency to the fixed 2.0.3+ line. No GHSA ignore remains in the
workspace policy.

## Locally patched advisory (2026-10-09)

`braces@3.0.3` has no published fix for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The checked-in pnpm patch limits brace/parenthesis parsing depth and validates
AST depth, cycles and node count before recursive walkers run. Regular glob,
range, quoted and escaped input behavior is covered alongside malicious cases
in `scripts/ci/braces-patch.test.mjs`.

The audit gate recognizes only this exact advisory/version after checking the
reviewed SHA-256 against the patch file, workspace declaration and lockfile,
then executing those regression tests against the installed dependency. A
changed/missing patch, unpatched lock snapshot or failing test blocks CI. This
is not an `ignoreGhsas` entry: raw npm findings remain in the artifact and a
separate evaluation identifies the locally remediated record. Replace the
patch with an upstream fixed version when available.

`sprintf-js` still has no upstream fix for
[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
(moderate, invalid precision throwing a RangeError). It remains visible in the
audit; it is reached through the legacy js-yaml 3 / argparse tooling subtree.

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
node scripts/ci/dependency-audit.mjs
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
