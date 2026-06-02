# RFC B6/B7: Define CI Template Gates and Advisory Debt Escalation

Status: Proposed
Date: 2026-06-02
Dimensions: B6 test blind spots, B7 developer experience

## Delta Scope

This proposal covers CI/template changes observed after the 2026-06-01 governance run. Multiple commits repaired the public template mirror contract, generated API artifacts, Playwright smoke ports, CI workflow profile gates, and architecture checks.

No code, configuration, workflow, test, or assertion was changed by this review.

## Current State

- `.github/workflows/ci.yml` now detects a source-repo profile vs a `Sailor-Template` mirror profile by checking `.sailor-template.json`.
- The template profile runs a dedicated `template-contract` job instead of the full source-repo CI surface.
- `tests/architecture/ci-harness-closure.test.ts` asserts many workflow string contracts, including template guards, affected-build filters, bounded E2E health checks, real-provider auth smoke opt-in, and warning classification.
- `.templateignore` strips Nebutra-owned app content, source-only tests, internal docs, internal workflows, and business glue before template distribution.
- `e2e/playwright.config.ts` now runs smoke servers on dedicated ports, uses bounded `/api/e2e/health` readiness checks, and keeps auth UI smoke behind `E2E_AUTH_SMOKE`.
- Existing CI still contains multiple advisory surfaces: whole-repo Biome advisory, medium-severity Bandit report generation with a separate high-severity blocker, package coverage warnings, SBOM fallback upload, OpenAPI breaking-change warnings, and best-effort E2E report download.
- The architecture test protects some of those choices with source-string assertions, but it does not define a durable policy for when an advisory becomes blocking.
- Current test coverage focuses heavily on the source repository. The generated template profile is checked in CI, but there is no end-to-end scaffold-and-run packet proving a fresh consumer can install, start, and pass the retained template gates.

## Architectural Tradeoffs

Option A: keep the current mixed model and document each advisory gate.

- Pros: low friction, preserves current CI stability, and makes intentional advisory decisions reviewable.
- Cons: warning debt can accumulate unless every advisory has an owner, expiry, and promotion trigger.

Option B: make every current advisory gate blocking.

- Pros: simple mental model and stronger signal.
- Cons: likely breaks unrelated PRs on known workspace, package-manager, or external-tool noise before the root causes are isolated.

Option C: split CI into evidence tiers.

- Pros: allows fast source PR feedback, fail-loud release/template gates, and explicit non-blocking telemetry collection.
- Cons: adds workflow complexity and requires a clear escalation policy.

Recommended direction: Option C, with a small advisory ledger that keeps current warnings honest without turning governance work into "fix CI at all costs".

## Decision Information Needed

- Which CI outcomes are release blockers for `main`, and which are only PR advisory signals.
- Whether the public template mirror must run a fresh scaffold smoke, not only validate checked-in generated files.
- Whether coverage advisory failures have an owner, target package threshold, and date to become blocking.
- Which OpenAPI breaking changes are allowed with migration notes, and which must fail PRs automatically.
- Whether SBOM generation may upload an empty advisory artifact in release branches, or only in PRs.
- Whether whole-repo Biome advisory still provides useful signal once changed-file Biome is blocking.
- Expected developer local loop for the template: exact commands, maximum cold-start time, and required services.
- How to report advisory drift without encouraging `continue-on-error`, `|| true`, or assertion weakening in future fixes.

## Proposed Decision Path

1. Add an RFC-owned CI Gate Ledger with columns: job, current behavior, blocker tier, owner, known failure mode, promotion trigger, expiry.
2. Classify gates into PR-fast, source-release, template-release, and evidence-only.
3. Require every advisory gate to emit a structured artifact or warning summary that can be reviewed without rerunning CI.
4. Add a template consumer proof target before promoting template claims: scaffold, install, list Playwright tests, typecheck retained apps, and run the template contract.
5. Keep source-string architecture tests only for workflow wiring, and move behavioral proof into executable scripts where possible.
6. Refuse future fixes that make failures invisible; all suppressive mechanics must be replaced by explicit advisory policy or root-cause remediation.

## Non-Goals

- This RFC does not remove existing advisory CI steps.
- This RFC does not make CI greener by weakening tests, changing assertions, or adding error swallowing.
- This RFC does not change the template mirror, workflow permissions, or branch protections.
