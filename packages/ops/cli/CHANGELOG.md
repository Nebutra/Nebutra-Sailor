# nebutra

## 0.6.2

### Patch Changes

- [`1f7bff8`](https://github.com/Nebutra/Nebutra-Sailor/commit/1f7bff84bcebedb2afd3031ef716ec1e29540019) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Fix the CLI's "customer path": running `nebutra` (via `npx` or a global install) from inside a project scaffolded by create-sailor no longer breaks.
  - Root resolution (`findMonorepoRoot`) now walks up from `process.cwd()` — never from the CLI's own install location under `node_modules` — checking `nebutra.config.json`, then `pnpm-workspace.yaml`, then a `package.json` with `workspaces`. Every delegating command (`doctor`, `env`, `db`, `infra`, `services`, `i18n`, `generate`, `e2e`, `ui`) was audited and fixed. When no project root is found, commands fail fast with a clear message and a `create-sailor` suggestion instead of silently resolving to the wrong directory.
  - `db status` (and every other Prisma-backed `db` subcommand) no longer hangs: it now runs non-interactively with a 20s timeout, and checks for a configured `DATABASE_URL` up front with a clear error instead of letting `npx prisma` block on an unreachable database or an interactive install prompt.
  - `--format json` now actually works on `db status`, `infra status`, `services status`, and `env <verb>` — it was previously captured by the root program's global `--format` option and silently discarded by each subcommand's own (never-reachable) local default.
  - `infra status` falls back to plain `docker compose ps` on older Docker Compose that rejects `--format json`, and every `infra`/`services` command now reports "Docker not found" / "Docker daemon not running" instead of a raw stderr dump.
  - `services` description and health checks no longer reference deleted services (meilisearch, novu, openfga); the service list is now read from `docker-compose.yml`. Added `services list` as an alias of `services status`.
  - `ui search`/`component`/`validate`/`migrate` degrade with a clear, accurate message when the (Nebutra-internal, non-scaffolded) UI agent manifest isn't present, instead of pointing at a `build:registry` script that doesn't exist.
  - `nebutra license` no longer claims to unlock "premium CLI features" — Sailor scaffolds are MIT-licensed and nothing in the CLI is gated by a license key; `activate`/`status` now say so honestly.
  - `create-sailor`'s done screen and welcome page no longer tell users to run `pnpm db:seed` (it doesn't exist). The must-do path is now `nebutra status` then `pnpm dev` (http://localhost:3001); `infra:up`/`db:migrate` are called out as optional, for when you want your own Postgres.

## 0.6.1

### Patch Changes

- [`7c616b4`](https://github.com/Nebutra/Nebutra-Sailor/commit/7c616b433f43ecd9fae7c2e5d48e084b72bce713) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Update the card-rail capability check and scaffold copy from Stripe to Creem
  (ADR 2026-09-26): `nebutra status`/`sync` now check `CREEM_API_KEY` and
  `CREEM_PRODUCT_ID` for the `billing` capability's card provider, and
  `create-sailor`'s help text and README describe Creem (cards worldwide,
  merchant of record) + WeChat Pay/Alipay as the current payments pair. Stripe
  env vars and code remain read only by the legacy `credit_purchase` checkout
  path and are no longer advertised as the current or recommended rail.

## 0.6.0

### Minor Changes

- [`b25ba64`](https://github.com/Nebutra/Nebutra-Sailor/commit/b25ba64f86fdc5cfe3718fa379d1f50b6bc46053) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add `nebutra login` (RFC 8628 device authorization) and `nebutra whoami`. `login` requests a
  device code from the auth center, opens a browser for the user to confirm it, and stores the
  resulting session in the OS keychain (falling back to `~/.config/nebutra/credentials.json`,
  mode 0600). `login --json` prints the verification link/code and exits immediately without
  blocking — for agents; `login --poll` resumes and blocks to completion. `NEBUTRA_TOKEN`
  overrides stored credentials for CI. `logout` now also clears the keychain entry and any
  pending device-code state.

- [`edfaafc`](https://github.com/Nebutra/Nebutra-Sailor/commit/edfaafc93f3532c536568c5bcfbdc8074a45c977) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add `nebutra sync` — makes a project's `.env.example` / `.env.local` agree with
  the capabilities declared in `nebutra.config.json`, idempotently. It reuses the
  same capability→provider→env-key table `nebutra status` already reads (now
  factored into `src/utils/capabilities.ts`, the single source of truth for
  both commands), appends any env key a declared capability's providers read
  that isn't already present anywhere in `.env.example` (grouped under a
  `# <capability> (<provider>)` comment, values left empty — never a real
  secret), and creates an empty `.env.local` with a header comment if missing.
  Unknown capability names in the manifest fail with `CONFIG_ERROR` and list the
  valid names; duplicates are deduped with a warning. Supports `--dry-run`
  (prints the planned additions, writes nothing, exits `10`) and `--json` for
  agent-consumable output shaped `{ added, unchanged, warnings }`.

## 0.5.0

### Minor Changes

- [`46fa1fe`](https://github.com/Nebutra/Nebutra-Sailor/commit/46fa1fee122c9e922776a08c6587efaa4a716a7d) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - One stack, zero questions (ADR 2026-09-24 Sailor convergence).

  `create-sailor` no longer asks anything but where to put the project. All stack
  flags (`--region`, `--auth`, `--payment`, `--email`, `--storage`, `--queue`,
  `--search`, `--deploy`, …) are removed; every project is the same converged
  stack and each capability goes live when its key is set. Projects now ship a
  portable `Dockerfile.web` + `docker-compose.yml` instead of a platform choice.

  `nebutra` drops `create`, `add`, `auth`, `billing`, `search`, `workflow`,
  `backend`, `admin`, `community`, `growth`, `stats` and `ecosystem`, and adds
  `nebutra status [--json]` — what is live, what each capability still needs.

## 0.4.3

### Patch Changes

- [`739439a`](https://github.com/Nebutra/Nebutra-Sailor/commit/739439a4781de645b153fe57f46f50f2a9193a4e) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Converge `nebutra create` with create-sailor: pass-through argv (no double outro), `upgrade` reads the real package version, `doctor` prints the post-scaffold golden path, and the shared first-run banner uses picocolors.
- [`2a118b4`](https://github.com/Nebutra/Nebutra-Sailor/commit/2a118b477f4cf4467f107430d1b47a220a22ed86) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Expand `nebutra dev --app` filters for monorepo product apps and keep the CLI Node floor aligned with create-sailor `>=22`.

  Published on the 2026-08-03 hotfix train; the official changeset changelog was not generated.

## 0.4.2

### Patch Changes

- [`739439a`](https://github.com/Nebutra/Nebutra-Sailor/commit/739439a4781de645b153fe57f46f50f2a9193a4e) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Restore `npx nebutra`. `0.4.1` shipped `"@nebutra/brand": "workspace:*"` as a production dependency, which npm cannot resolve (`EUNSUPPORTEDPROTOCOL`). Keep `@nebutra/*` as build-time deps and bundle them into the CLI.

## 0.4.1

### Patch Changes

- [`8acefae`](https://github.com/Nebutra/Nebutra-Sailor/commit/8acefae3b5f119ce650563a78ca089c8c7fecc83) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Align scaffolded `@nebutra/*` dependency ranges with monorepo package.json versions.
  - Make `packages/ops/preset/src/nebutra-package-versions.ts` the single source of truth
  - Re-export it from the `nebutra` and `create-sailor` CLIs (remove the stale CLI-local map)
  - Add `pnpm package-versions:sync` / `package-versions:check` and wire check into release

## 0.4.0

### Minor Changes

- Retire the scaffold-marker signing apparatus.

  The signed `.nebutra/scaffold-meta.json` marker existed for one reason: its
  presence and a valid HMAC were what conferred the Independent Developer
  License instead of AGPL copyleft. That tier was retired on 2026-07-26 and
  scaffolded projects are now MIT unconditionally, so the marker gated nothing
  and the cryptography protected nothing — while still costing a signing-key
  registry, a mirrored verifier, and a key-rotation runbook to maintain.

  Removed:
  - `nebutra license verify [path]` — the subcommand and its implementation
  - the signing-key registry and the CLI-side verifier that mirrored it
  - `POST /api/license/verify` on the marketing site, which had no callers
  - the key-rotation runbook

  `nebutra license activate <key>` and `nebutra license status` are unaffected —
  they handle paid support tiers, which still issue keys.

  The marker file itself stays, unsigned, as a provenance breadcrumb: which CLI
  version produced this project and when. It grants nothing, and deleting it
  costs a project no rights — the emitted file now says so in its own `purpose`
  field. Markers written by create-sailor <= 1.8.4 still carry `signature`,
  `nonce` and `signingKeyId`; nothing reads them any more, and their presence is
  ignored rather than rejected.

  Minor rather than patch: this removes a published CLI subcommand and a public
  HTTP endpoint.

## 0.3.8

### Patch Changes

- Updated dependencies []:
  - @nebutra/brand@0.1.2

## 0.3.7

### Patch Changes

- Stop `license verify` claiming a licence tier that no longer exists.

  The command printed "Independent Developer License valid." on success. That
  tier was retired on 2026-07-26 — commercial use is now free at any size under
  MIT (packages) and FSL-1.1-ALv2 (repository), so a scaffold marker grants
  nothing. The command now reports "Scaffold marker valid." and states that the
  marker is provenance only, with the MIT licence applying regardless of it.

  Marker verification itself is unchanged, and the legacy `independent` tier
  value is still accepted so projects scaffolded by create-sailor <= 1.8.2 keep
  verifying.

  Also adds the MIT `LICENSE` file the package declared but never shipped.

## 0.3.6

### Patch Changes

- Template / platform maintenance release:
  - Document Sailor-Template CI contract (mirror-only checks vs source monorepo).
  - Align doctor/scaffold messaging with auth-center multi-app RP topology.
  - Keep CLI compatible with Next.js `^16.2.11` platform floor.

## 0.3.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/theme@0.1.1

## 0.3.1

### Patch Changes

- [`94adc0a`](https://github.com/Nebutra/Nebutra-Sailor/commit/94adc0ad7d305e92ef62411768b04f8fd79cdb48) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Close drift between the CLI/scaffolder surface and the current monorepo.

  `nebutra`:
  - Read VERSION from package.json at module load (was hardcoded "0.1.0"
    while published as 0.3.0, breaking --version and update-notifier).
  - Switch `@nebutra/theme` dep from `workspace:*` to published `^0.1.0`
    and bundle @nebutra/\* via tsup `noExternal` so the npm package runs
    standalone (the upstream @nebutra/theme ships .ts sources Node refuses
    to import from node_modules).
  - Replace stale `api-gateway` strings with `backends/gateway` in preset
    apps, test VALID_APPS, generate route description, and ai agents
    scanner comments (file paths were already correct).
  - Clean preset app lists to actual scaffolded apps: drop `admin`, `blog`
    (don't exist as scaffolded apps; were moved into feature flags), and
    rename `docs` → `sailor-docs`.
  - Extend `nebutra doctor` with monorepo-layout drift checks: legacy
    `apps/api-gateway/` warning, presence of `backends/gateway/`,
    categorized-packages enforcement (flag flat `packages/<name>/`),
    and `.nebutra/scaffold-meta.json` marker check.
  - Add `--category <design|iam|commerce|integrations|platform|ops|ai>`
    required option to `nebutra generate package`, placing new packages
    under the categorized layout `packages/<category>/<name>/`. Also
    point `generate component` at `packages/design/ui` (was the old
    pre-merger `packages/ui`).

  `create-sailor`:
  - Show the same `NEBUTRA_TELEMETRY` first-run banner that the runtime
    CLI shows, using a shared `~/.config/nebutra/first-run-acked` marker
    so the banner only fires once per machine across both tools. Users
    running `npm create sailor@latest` now see the opt-out notice on
    first scaffold, matching what the Privacy + Cookies pages document.
