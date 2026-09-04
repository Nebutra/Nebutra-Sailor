# ops — declared provider state

Some production settings live only in a provider dashboard: which build machine
Vercel picked, whether an env var is flagged Sensitive, which secrets a Fly app
carries, what a Cloudflare Worker is bound to, which deploy target a GitHub
variable selects, which status checks a pull request must pass before it can
merge. Git cannot see them, so a change there is invisible until it costs
money, breaks a deploy, or lets a red build into `main`.

This directory declares those settings per brand. A read-only engine compares
the declaration with what each provider reports and exits non-zero on drift.

```text
ops/
  README.md                          this file — the schema
  <brand>/platform-expected.json     one declaration per brand
scripts/ops/platform-reconcile.mjs   the engine (Node 22, no dependencies)
.github/workflows/platform-reconcile.yml   runs it daily; a failed run is the alert
```

`ops/` sits at the repository root rather than under `infra/ops/` because it
holds one directory per brand — what a brand expects from its providers — while
`infra/ops/` holds scripts that act on infrastructure. A second brand adds
`ops/<brand>/`, not a file among the scripts. The `create-sailor` scaffold has
one brand and ships the example as `infra/ops/platform-expected.example.json`.

## Run

```bash
node scripts/ops/platform-reconcile.mjs ops/<brand>/platform-expected.json
node scripts/ops/platform-reconcile.mjs ops/<brand>/platform-expected.json --strict
node scripts/ops/platform-reconcile.mjs ops/<brand>/platform-expected.json --only=vercel,fly --json
```

| Environment | Used for | Without it |
| --- | --- | --- |
| `VERCEL_TOKEN` + `VERCEL_ORG_ID` (or `VERCEL_TEAM_ID`) | Vercel projects and env types | Vercel rows are `skipped` |
| `FLY_API_TOKEN` + `flyctl` on PATH | `flyctl secrets list --json` | Fly rows are `skipped` |
| `PLATFORM_RECONCILE_GITHUB_VARS` (JSON object) or an authenticated `gh` | GitHub repository variables | GitHub variable rows are `skipped` |
| `GH_TOKEN` or `GITHUB_TOKEN` with `administration:read`, or an authenticated `gh` | GitHub branch protection via `GET /repos/{owner}/{repo}/branches/{branch}/protection` | branch-protection rows are `skipped` |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Worker bindings via `GET /workers/scripts/{name}/settings` | Cloudflare rows are `skipped` |

Every row ends in one of four states:

| Status | Meaning | Exit code |
| --- | --- | --- |
| `ok` | provider agrees with the declaration | 0 |
| `drift` | provider disagrees | 1 |
| `skipped` | could not ask — no token, tool not installed, token lacks the scope | 0, or 1 with `--strict` |
| `error` | asked and got no usable answer — network, unparseable output | 1 |

The scheduled workflow runs with `--strict`, so a secret that vanishes from the
repository is noticed the same way a changed setting is. Locally, without
tokens, the engine prints every row as `skipped: no <TOKEN>` and exits 0.

Inside GitHub Actions the engine also emits `::error::` annotations per drift
and appends the table to the job summary.

## What it never does

- Write. Every call is a GET or a `list`. Fixing drift is a human decision made
  in the dashboard or the CLI — the engine only says where.
- Print a secret value. Fly returns names and digests; only names are kept.
  Vercel env entries are read for `key`, `type` and `target`; the `value` field
  is never touched. GitHub variables and branch protection are configuration,
  not secrets, by GitHub's own definition, and their values are compared and
  printed.

## Schema

`version` is `1`. Every provider section is optional; every check inside a
target is optional. Declare what has bitten you and grow the file from there.

```json
{
  "version": 1,
  "vercel": {
    "teamId": "team_…  (optional; VERCEL_ORG_ID / VERCEL_TEAM_ID otherwise)",
    "projects": [
      {
        "name": "project-name",
        "buildMachineType": "standard",
        "ignoreBuildStep": "exit 0",
        "gitLinked": false,
        "envNotSensitive": { "production": ["NEXT_PUBLIC_SITE_URL"] }
      }
    ]
  },
  "fly": {
    "apps": [
      { "name": "app-name", "secretsPresent": ["QUEUE_PROVIDER"], "secretsAbsent": ["REDIS_URL"] }
    ]
  },
  "github": {
    "repo": "owner/name  (optional; GITHUB_REPOSITORY otherwise)",
    "variables": { "DEPLOY_TARGET_GATEWAY": "cloudflare-workers" },
    "branchProtection": [
      {
        "branch": "main",
        "requiredStatusChecks": ["Lint & Typecheck", "Test"],
        "strict": false,
        "enforceAdmins": false,
        "requiredApprovingReviewCount": null
      }
    ]
  },
  "cloudflare": {
    "accountId": "(optional; CLOUDFLARE_ACCOUNT_ID otherwise)",
    "workers": [
      { "name": "worker-name", "bindings": [{ "name": "IP_LIMITER", "type": "ratelimit" }] }
    ]
  }
}
```

### vercel.projects[]

| Key | Compared with | Why declare it |
| --- | --- | --- |
| `buildMachineType` | `resourceConfig.buildMachineType` from `GET /v9/projects/{name}` | Vercel's elastic selection promotes a slow build to `turbo`, which bills 7.5× per minute. An unset value reports as `(unset)`, which is drift on purpose: unset means elastic. |
| `ignoreBuildStep` | `commandForIgnoringBuildStep` | The project-level Ignored Build Step applies to every branch; `vercel.json` only protects branches that contain it. |
| `gitLinked` | whether `link` is present | A Git link opens a remote build per push. Declare `false` for projects that ship prebuilt from CI, `true` for the ones that must stay linked. |
| `envNotSensitive.<target>[]` | `type` of each listed key on that target from `GET /v10/projects/{name}/env` | A Sensitive variable cannot be pulled, so `vercel pull` writes it empty and a CI build dies on `new URL("")`. A key missing from the target is also drift. |

### fly.apps[]

| Key | Compared with | Why declare it |
| --- | --- | --- |
| `secretsPresent[]` | names from `flyctl secrets list -a <app> --json` | The runtime refuses to start, or falls back to something unsafe, without them. |
| `secretsAbsent[]` | same | Secrets copied from an older host select a backend the app must not use. |

### github.variables

Name → expected value. In the workflow the engine reads the variables from
`PLATFORM_RECONCILE_GITHUB_VARS`, which the workflow fills with `toJSON(vars)`,
so no token needs permission on the Variables API. Locally it shells out to
`gh variable get <name> -R <repo>`.

### github.branchProtection[]

One entry per protected branch. Every field but `branch` is optional; a field
the declaration leaves out is not reported. Read from
`GET /repos/{owner}/{repo}/branches/{branch}/protection` with `GH_TOKEN` or
`GITHUB_TOKEN` when one is set, else through `gh api` and whatever login it
holds.

| Key | Compared with | Why declare it |
| --- | --- | --- |
| `requiredStatusChecks[]` | `required_status_checks.contexts` ∪ `checks[].context`, as a set | This list is what "CI is green" means for the branch. A check removed here lets a red build merge; a check added that no workflow produces blocks every merge. Order does not matter; the row's detail names what is `missing` and what is `extra`. |
| `strict` | `required_status_checks.strict` | GitHub's "Require branches to be up to date before merging". |
| `enforceAdmins` | `enforce_admins.enabled` | Whether the rules above also bind administrators. |
| `requiredApprovingReviewCount` | `required_pull_request_reviews.required_approving_review_count`, or `null` when no review is required | A solo maintainer declares `null`; a team declares its number. Reported as `none` or the count. |

A branch whose protection was removed altogether reports `drift` (`protected` /
`not protected`). A token that cannot see the protection reports `skipped` with
the reason: the endpoint needs `administration:read`, which the Actions
`GITHUB_TOKEN` cannot hold, so the scheduled run needs a fine-grained token in
`GH_TOKEN` or reports the row as skipped — and, under `--strict`, fails.

Raising the bar — adding `Lint & Typecheck`, `Test`, a review count — is a
decision made by editing this list and then changing Settings → Branches to
match. The engine reports the difference; it never changes either side.

For Nebutra the rule for `main` is declared in `ops/nebutra/platform-expected.json`
and the `Reconcile` step already reads `GH_TOKEN: ${{ secrets.PLATFORM_RECONCILE_GH_TOKEN }}`
(`.github/workflows/platform-reconcile.yml`) — `tests/architecture/platform-reconcile.test.ts`
fails a declaration that arrives without that workflow line, so the two can
only land together. The one thing that has to happen outside this repo,
because GitHub does not expose fine-grained PAT creation over any API — a
human has to click through the web UI once:

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) →
   Resource owner: `Nebutra` → Repository access: **Only select repositories** →
   `Nebutra-Sailor` → Repository permissions → **Administration: Read-only**
   (leave every other permission at its default, No access) → Generate token.
2. `gh secret set PLATFORM_RECONCILE_GH_TOKEN --repo Nebutra/Nebutra-Sailor`,
   paste the token, Enter.

Until that secret exists, `GH_TOKEN` evaluates to an empty string and the
reconcile script falls back to the ambient `GITHUB_TOKEN`, which cannot read
branch protection — the four `branchProtection` rows report `skipped`, and
because `--strict` treats any skip as a run failure
(`scripts/ops/platform-reconcile.mjs`'s `exitCodeFor`), the daily schedule
goes red until the secret is set. That is expected for the gap between this
PR merging and step 2 above running, not a bug. [#514](https://github.com/Nebutra/Nebutra-Sailor/issues/514).

### cloudflare.workers[]

`bindings[]` names a binding that must exist on the deployed Worker; `type` is
optional and, when given, must match (`ratelimit`, `kv_namespace`, `d1`, …). The
token needs Workers Scripts read; with less it reports `skipped` and says so.

## Adding a brand

1. `mkdir ops/<brand>` and write `platform-expected.json` from the schema above.
2. Run the engine locally with whatever tokens you hold; fix the declaration
   until it matches reality, or fix reality.
3. Point a scheduled workflow at the file with `--strict`.

`packages/ops/create-sailor/templates/infra/ops/platform-expected.example.json`
is the scaffold copy of this schema.

The live declarations are the brand directories beside this file
(`ops/<brand>/platform-expected.json`). They and the scheduled workflow stay in
this repository: `.templateignore` strips them from the `create-sailor` mirror,
so a scaffold starts from the example above rather than from another brand's
names.
