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
  records but leaves the metadata totals unchanged. With no ignores in this
  policy, the gate requires record counts to match metadata exactly; hidden or
  missing findings fail validation. Record severities determine the decision,
  while metadata is used only to check report integrity. Registry errors retry three times;
  a missing or malformed report fails the gate. Raw reports and evaluations
  are uploaded as CI evidence.

The two former image-size audit ignores were removed after updating its
Fumadocs dependency to the fixed 2.0.3+ line. No GHSA ignore remains in the
workspace policy.

## Dependency remediation (2026-10-26)

The four production high findings reported after the October 23 advisory
updates are fixed in the locked graph without changing the audit gate:

| Package | Locked version | Security floor | Advisory |
| --- | --- | --- | --- |
| `zod` | `4.6.7` | `4.6.6` | `GHSA-mrhx-c7xc-m3w5` |
| `body-parser` | `2.4.0` | `2.4.0` | `GHSA-27r3-jxmh-p828` |
| `undici` (7.x) | `7.30.1` | `7.30.1` | `GHSA-xjj6-f33q-929c` |
| `undici` (8.x) | `8.12.2` | `8.12.2` | `GHSA-xjj6-f33q-929c` |

Zod's shared catalog also governs transitive consumers. Every Undici override,
including the exact AI SDK / Miniflare pins and the dormant 6.x floor, rejects
the affected versions while keeping each scoped major intact. Body-parser's
override remains on 2.x; its new `content-type` dependency is the only other
package added to the lockfile.

All four selected releases have npm provenance attestations and were older
than the 24-hour release-age gate when resolved. No install-script permission,
trust exception, advisory ignore or severity threshold changes are needed.

`scripts/ci/security-dependencies.test.mjs` checks every locked package and
snapshot against the fixed-version floors. It also verifies that Zod rejects
an oversized constrained array before inspecting its elements, and replays the
excessive-encoding / early-close attack against both installed Undici versions
in isolated child processes. The old Undici versions crashed despite handling
the fetch rejection; both fixed versions survive. These tests run in the
existing security-regressions workflow.

After a frozen install, both production and full audits on October 26 report
zero high/critical findings, with two moderate and two low findings still
visible. The existing Braces patch and its verification remain in place even
though the current registry report no longer includes that advisory.

## Dependency remediation (2026-10-22)

The production gate's six unpatched high findings are addressed in the locked
graph with these same-major upgrades:

| Package | Fixed version | Advisory |
| --- | --- | --- |
| `follow-redirects` | `1.16.1` | `GHSA-q3jh-wrc6-jgq8`, `GHSA-8r9p-f939-6h3c` |
| `@modelcontextprotocol/sdk` | `1.32.0` | `GHSA-22jm-h49p-29qw`, `GHSA-46jr-4wx8-v453` |
| `vite` | `8.1.6` | `GHSA-587h-7wmj-h5pm` |
| `markdown-it` | `15.0.3` | `GHSA-gfr2-rv44-r23c` |

Vite's catalog and transitive override share one version. The MCP package's
declared dependency matches its override, so a published consumer receives the
fixed SDK too. The redirect and Markdown floors reject the affected releases
while staying within their currently locked major versions.

The production audit still records the locally patched `braces` finding and
the unpatched moderate `sprintf-js` finding below. No advisory ignore or
severity threshold has been added.

The full audit's development graph also contained these fixed-version findings:

| Package | Fixed version | Advisory |
| --- | --- | --- |
| `@opennextjs/cloudflare` | `1.20.2` | `GHSA-2vc4-c4r6-p6v6` |
| Storybook 8 packages | `8.6.19` | `GHSA-f2ph-cmg5-wxc8` |
| `vitest` / `@vitest/coverage-v8` / `@vitest/mocker` | `4.1.12` | `GHSA-qxg6-89mg-rqv8`, `GHSA-xp26-3454-mjgp` |

OpenNext is used by the auth, Sailor docs and TypeLens development toolchains.
All declared Storybook 8 packages in the Storybook app and UI package move
together to 8.6.19, the first patched v8 release; no Storybook major upgrade
is included. Vitest and its coverage package move through the shared catalog so
the patched mocker is selected consistently. These releases were older than
the 24-hour `minimumReleaseAge` gate when resolved.

All 26 resolved Storybook 8.6.19 packages have npm GitHub Actions
trusted-publisher and registry-signature metadata, and their `gitHead` matches
the official `v8.6.19` release commit
`117b95a45b27138796c151b7928ba7956ca6da45`. They lack
`dist.attestations`, so pnpm 11.28.5's `trustPolicy: no-downgrade` rejects this
hotfix after the previously attested release. The workspace contains
exact-version `trustPolicyExclude` entries for those packages following this
manual metadata and upstream release review. Publisher metadata and a matching
commit do not replace provenance attestation; this exception accepts that gap
to install the patched v8 suite. Remove the entries when a compatible attested
release is available. The release-age gate and advisory policy stay enabled.

After regeneration and a frozen install, both the production and full audits
report zero active high/critical findings. Each raw report retains one high
`braces` finding, verified as locally patched, and one unpatched moderate
`sprintf-js` finding.

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

Free-form dispatch inputs, branch names and secrets must enter shell steps
through `env`, then quoted shell variables. Do not interpolate them into
`run` source: quotes around an Actions expression do not prevent command
substitution after GitHub renders the script. Derived step outputs carrying
these values follow the same rule. Single-line output writers must reject
CR/LF so inputs cannot forge additional output keys.

`scripts/ci/workflow-input-safety.test.mjs` checks this boundary and executes
the Lighthouse steps with command-substitution and quote-breaking payloads.
The independent `security-regressions.yml` workflow runs these regressions,
the production dependency audit and actual PostgreSQL/PGlite tenant attacks
without queuing behind the full application build. Full CI keeps its gates.

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
node scripts/ci/dependency-audit.mjs --all
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
