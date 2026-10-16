---
name: sailor
description: Scaffold, run and extend a Nebutra Sailor SaaS project (create-sailor, Next.js + Hono gateway, Better Auth, Creem plus WeChat Pay/Alipay billing, Postgres with generated row-level security). Use when the user wants to start a production SaaS, mentions Sailor, create-sailor, the nebutra CLI or nebutra.config.json, or is working inside a project scaffolded from Sailor and needs to add an endpoint, a table, a page, a provider key or a China (NEBUTRA_LOCALE=cn) deployment. Not for unrelated apps that merely use Next.js.
license: Apache-2.0
---

# Sailor

Sailor is one converged SaaS stack. The scaffold asks nothing but the target
directory, every capability runs locally with an empty `.env`, and a provider
goes live when its key is present. Your job is to use that stack as it is, not
to re-choose it.

## Establish the context

1. Decide whether this is **creation** (no project yet) or **work in an
   existing project** (a `nebutra.config.json` exists in the root or a parent).
2. In an existing project, read the root `AGENTS.md` and `CLAUDE.md` before
   writing code. They ship with every scaffold and override this skill where
   they differ. Check `git status` and keep the user's unrelated edits.
3. Requirements: Node.js >= 22 and pnpm 11 on `PATH` (`npm i -g pnpm@11`).
   The scaffold is a pnpm + Turborepo monorepo.
4. Installing this skill installs neither CLI. Run them from npm:
   `npx create-sailor@latest …` and `npx nebutra@latest …`.

## Choose the workflow

Paths are relative to this skill's directory.

| Intent | First action | Reference |
|---|---|---|
| Create a project | `npx create-sailor@latest <dir> --dry-run --json` | [Scaffold and run](references/scaffold-and-run.md) |
| Run it locally | `pnpm dev` in the project root | [Scaffold and run](references/scaffold-and-run.md#run-it-locally) |
| Take a capability live | `npx nebutra@latest status --json` | [Scaffold and run](references/scaffold-and-run.md#capabilities-read-act-re-read) |
| Add an endpoint, table, page or UI | read `AGENTS.md`, then the rule for that layer | [Project rules](references/project-rules.md) |
| Deploy for mainland China | `NEBUTRA_LOCALE=cn`, the CN keys, `NEXT_PUBLIC_ICP_NUMBER` | [Project rules](references/project-rules.md#china) |
| Sign the CLI in (license, template updates) | `npx nebutra@latest login --json` | [Scaffold and run](references/scaffold-and-run.md#sign-in-device-flow) |

## Hard rules

- **Never scaffold into the home directory or a filesystem root.** The CLI
  refuses (`UNSAFE_TARGET_DIR`); pick a new folder such as `./my-app`.
- **There is nothing to choose at scaffold time.** No provider, region, ORM or
  app-type flags exist. Do not invent them; `--help` is the source of truth.
- **One provider per domain.** Do not add a second adapter (no Stripe, Clerk,
  BullMQ, Meilisearch, …) beside the shipped one. The only pairs are the ones
  law or network force: payments Creem + WeChat Pay/Alipay, SMS Twilio Verify +
  Aliyun, object storage one S3-compatible adapter for R2 and OSS.
- **Business endpoints go in `backends/gateway`** (Hono), not in Next route
  handlers under `apps/web`.
- **The database has one source:** `packages/platform/db/prisma/schema.prisma`,
  with each table's access rule as a `/// @rls` comment. Never hand-write a
  policy or migration SQL.
- **Use the design system:** `@nebutra/ui` primitives, `@nebutra/icons`,
  semantic token utilities, no raw hex, no raw `<input>`/`<select>`.
- **Guards only shrink.** `pnpm lint` runs Biome plus ratchets with allowlists
  in `governance.config.json`. Fix the code; never add an allowlist entry to
  make a new violation pass.

## Report the actual result

State the create-sailor version (from the `start` event), the target directory,
which steps returned `ok`, `skip`, `warn` or `error`, the URLs `pnpm dev`
printed, and which capabilities `nebutra status` reports as `live`,
`local-fallback` or `missing-key`. A dry run is not a scaffold, and a scaffold
is not a passing build: say which checks you actually ran.
