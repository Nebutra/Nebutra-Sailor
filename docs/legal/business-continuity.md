# Business Continuity

> **The question this page answers:** "What happens to us if Nebutra stops
> maintaining Sailor, or ceases to exist?"

This is the first question a serious procurement or architecture review asks
about any dependency, and it is a sharper question for Sailor than for a large
vendor, because Sailor is maintained by a small team. We would rather answer
it directly than have you infer an answer.

## The short answer

**You cannot lose the right to use what you already have, and you cannot lose
access to the code.** Both are structural properties of how Sailor is
licensed and distributed, not promises we make. They would survive our
disappearance entirely.

## Why that is true

### 1. The licence grants are irrevocable

- Every published npm package (`@nebutra/*`, `nebutra`, `create-sailor`) is
  **MIT**. An MIT grant, once made for a given version, cannot be withdrawn —
  not by us, not by an acquirer, not by a bankruptcy trustee.
- The repository is **FSL-1.1-ALv2**, which contains an *irrevocable* grant of
  Apache-2.0 effective two years after each version's release. That grant is
  made in advance and survives us. Nobody can claw it back.
- Versions released before 2026-07-26 remain available under AGPL-3.0-only,
  which is likewise irrevocable.

The practical consequence: **a change of ownership, a licence change, or a
company failure cannot reach backwards into the version you deployed.**

### 2. The code is already distributed, not escrowed

Traditional software escrow exists because the source is secret and must be
held by a third party against the vendor's failure. That mechanism is
unnecessary here:

- The complete source is public on GitHub.
- The complete build output for 79 packages is on the npm registry, which
  retains published versions and is operated independently of us.
- Anyone with a clone has a full working copy, including the build, test, and
  deployment tooling.

There is no privileged artefact that only we hold. Nothing to escrow, because
nothing is withheld.

### 3. The code is designed to be maintainable by someone else

This is the part that matters most in practice — the right to the code is
worthless if nobody but the original author can operate it. Sailor is built
so that another team can pick it up:

| Property | Status | Verify it yourself |
| --- | --- | --- |
| Directional layering (no package depends on an app; design layer stays leaf) | Enforced in CI | `tests/architecture/dependency-flow.test.ts` |
| Zero circular dependencies across the workspace package graph | Measured, not asserted | run a cycle check over `packages/*/*/package.json` |
| Architecture rules executable, not tribal knowledge | 37 test files | `tests/architecture/` |
| Test suite | 648 test files | `pnpm test` |
| Provider abstractions, so infrastructure is swappable | Enforced | `packages/platform/provider-factory` |
| Single-owner-per-concept enforced in CI | 24 assertions | `tests/architecture/ai-package-governance.test.ts` |
| Documented architecture kept in sync with code | Enforced | `tests/architecture/docs-coverage.test.ts` |

We publish these because they are the honest measure of "could a stranger
maintain this?", and because they are checkable without trusting us.

### 4. Fork rights are unconditional

If maintenance stalls, you may fork. You do not need our permission, a
notification period, or a triggering event. The only limits are the FSL
Competing Use clause — which restricts selling a Sailor substitute, not
maintaining your own deployment — and trademarks, which simply means your fork
uses your name.

## What is *not* guaranteed

We would rather be precise than reassuring.

- **Continued development is not guaranteed** at the Community tier. New
  features, new versions, and responses to your issues are best-effort.
- **Security patches are not guaranteed** at the Community tier. We have
  patched promptly to date (see [SECURITY.md](../../SECURITY.md)), but that is
  a track record, not a commitment. Enterprise agreements convert it into a
  contractual one.
- **Hosted services, if any, are not covered by this page.** Continuity of the
  self-hosted software is structural; continuity of a hosted service depends
  on the service agreement.

## Enterprise continuity undertaking

Enterprise agreements add contractual commitments on top of the structural
ones above:

1. **Notice period** — written notice before we discontinue maintenance of a
   major version you are pinned to.
2. **Long-term support branch** — security backports to your pinned version
   for the agreed window, beyond the community support policy.
3. **Transition assistance** — a defined number of engineering hours to help
   you move to a fork or successor if we discontinue the project.
4. **Key-person and assignment terms** — negotiated per agreement, including
   what happens to your rights on a change of control.

Contact [sales@nebutra.com](mailto:sales@nebutra.com).

## Current maintenance status

Stated plainly, because you will find it out anyway:

- Sailor is developed primarily by a small core team, currently concentrated
  in one maintainer. **Bus factor is a real risk and we do not dress it up.**
- Mitigation is structural rather than organisational: the licence grants
  above, public distribution, and the machine-enforced architecture that makes
  the codebase legible to a new maintainer.
- Contributions and additional maintainers are actively welcomed — see
  [CONTRIBUTING.md](../../CONTRIBUTING.md).

If concentration of maintenance is disqualifying for your risk model, an
Enterprise agreement with a transition-assistance clause is the intended
answer, and we would rather discuss it than have you discover the concern
after deployment.

---

*Last updated: 2026-07-26 · Questions: [legal@nebutra.com](mailto:legal@nebutra.com)*
