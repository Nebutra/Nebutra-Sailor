# Closure Phase — Converge, Do Not Expand

- **Date**: 2026-08-27
- **Status**: Accepted
- **Owner**: tseka_luk
- **Related**:
  - [docs/package-status.md](../package-status.md)
  - [docs/security/supply-chain-governance.md](../security/supply-chain-governance.md)
  - [ADR 2026-06-04 production runtime closure](./2026-06-04-production-runtime-closure.md)
  - PR [#439](https://github.com/Nebutra/Nebutra-Sailor/pull/439)

---

## Decision

Keep every existing module. Do not delete, archive, or gut Labs. Do not add
new product nouns, workspace packages, infrastructure categories, or
abstraction layers.

The job of this phase is to turn the current capability inventory into a
**reliable system** on one golden path:

> create project → sign in → create organization → invite members → connect AI →
> create subscription → receive webhook → deploy.

Work is allowed only when it does at least one of:

1. Make an existing feature install, run, or test
2. Fix security, concurrency, permission, or authorization
3. Connect a real business path between existing modules
4. Improve docs, deploy, or developer experience
5. Reduce maintenance cost or duplicated implementation
6. Add monitoring, recovery, or upgrade capability to something that already exists

Implementations may be upgraded. Surfaces may not be invented.

## Honesty layers

| Layer | Meaning |
| --- | --- |
| Verified | Named tests and a deploy or CI run exist |
| Implemented | It runs; production evidence is limited |
| Experimental | API and runtime may change; say so in the package README |
| Direction | Not a promise |

Do not describe Labs as production infrastructure. The existing
`nebutra.graph` / `nebutra.status` fields stay the machine contract.

## Commitment by graph

| Graph | Keep | External promise |
| --- | --- | --- |
| `core` | All | Install, types, tests, and build must pass. Compatibility is protected. |
| `runtime` | All | Real integration tests pass. Runtime and failure behavior are documented. |
| `labs` | All | Usable, API may change, README must say experimental. |

Publishable packages stay in the workspace. The default release pipeline
publishes the **stable set**. Other packages publish on demand. Code activity
and publish commitment are different things.

## Repair order — do not skip

### P0 — Restore repository trust

No official Release until these four are green:

1. Lockfile accepted by supply-chain policy
2. vivo Sans binaries removed from the current tree **and** Git history, replaced by a clearly licensed face
3. Fresh clone: one `pnpm install --frozen-lockfile` with no manual repair
4. No install warnings for CLI bins that point at a missing `dist`

History rewrite is its own PR. Do not mix it with webhook, RLS, or billing.

### P1 — Close security and money paths

1. Webhook atomic lease / CAS so concurrent deliveries cannot double-process
2. Merge the underlying logic of `withRls` and `withTenantContext`
3. If `APP_DB_ROLE` is set and role switch is missing, refuse to run
4. Real PostgreSQL tests for cross-tenant read / write / update / delete / rollback
5. One Stripe E2E: checkout → webhook → upgrade → cancel → refund

Do not refactor directories, rename packages, or change ORMs in the same PR.

### P2 — Close the monorepo engineering loop

Pick one rule: consume source **or** consume `dist`. If `dist`, Turbo must
declare `test → dependencies#build` (already `test.dependsOn: ["^build"]`;
prove it on a clean cache). Every publishable package must `pack` and install
into a temp project. Tests must not depend on leftover workspace build
artifacts. CI cache may speed a job; it may not be the only proof of
correctness.

### P3 — One homepage path

README leads with the golden path above. RAG, Saga, MCP, Agent Runtime, and
observability stay in the repo and appear in the stage that uses them.

## Definition of done

```text
clean clone
→ frozen install
→ lint
→ typecheck
→ unit test
→ integration test
→ production build
→ package pack
→ example deploy
→ smoke test
```

Unit tests alone are not done. Green on the author's machine is not done.
An agent saying it is fixed is not done.

Hard rules:

- A PR that changes a security invariant must add a failing case and a
  regression case.
- A PR that changes the package graph must install and test in a temporary
  directory.

## Surgical method

1. Write a test that reproduces the bug
2. Make the smallest fix
3. Check upstream and downstream
4. Delete duplicate implementations, not product capability
5. One risk per PR

## Success metrics

Stop using repository size as proof. Track:

- Time for a stranger to first successful deploy
- Time from zero to multi-tenant subscription SaaS
- Share of version upgrades that need no manual repair

Phase exit:

> A stranger, without contacting the author, can install in 30 minutes and
> complete organization, permissions, subscription, and webhook in 2 hours.
> Fresh-environment CI is green.

## What this does not authorize

- New workspace packages, product names, or infra categories
- Deleting or freezing Labs
- A “unify the architecture” rewrite
- An official Release before P0 is green
