# Container widths become real utilities

- **Status**: Accepted
- **Date**: 2026-09-11
- **Scope**: `packages/design/design-tokens` (generator), every app under `apps/`
- **Required by**: [Frontend Constitution](2026-09-10-frontend-constitution.md) §31 — a change to
  the token architecture gets its own record rather than being decided inside a feature.

## Context

`CLAUDE.md` has documented a three-step page-width contract for months: `text` (896px, reading),
`content` (1152px, pricing and blog), `wide` (1400px, feature bento and navbar). The tokens existed.
`--container-text/content/wide` were emitted to `:root` from `tokens/semantic.json`, and
`lint-no-forbidden-containers.mjs` banned the two values that drift in as defaults, `max-w-5xl` and
`max-w-7xl`.

What did not exist was any way to *use* them from Tailwind. Tailwind v4 reads `@theme` blocks, not
arbitrary `:root` declarations, so `max-w-wide` was not a class. The contract told people which
width to pick and gave them nothing to type, so they typed the number:

| form | occurrences |
|---|---|
| `max-w-[1400px]` | 98 |
| `max-w-[var(--container-content)]` | 17 |
| `max-w-[var(--container-wide)]` | 13 |
| `max-w-[var(--container-text)]` | 3 |

CLAUDE.md's own table sanctioned `max-w-[1400px]` as the recommended form, which is how a documented
convention becomes 98 hardcoded copies of a decided number. Changing `--container-wide` would have
moved three call sites and left ninety-eight where they were.

The cost is not only maintenance. `max-w-[1400px]` says nothing about intent; `max-w-wide` says what
the container is for. PARA's launcher had a project grid inside `max-w-4xl` — the right value for
prose, used for a grid — and nothing in the class name made that look wrong.

## Decision

Register the three steps on the Tailwind theme in the generated token output, and migrate every
call site to `max-w-text` / `max-w-content` / `max-w-wide`.

### Literals, not variable references

The theme entry carries the number rather than `var(--container-wide)`.

Tailwind emits an `@theme` entry into its own layer. A same-named reference —
`--container-wide: var(--container-wide)` — is therefore self-referential, and in practice survives
only because the semantic `:root` emission happens to come later in the cascade. Measured on a build
before this change: the self-reference sat at byte 10698 and the real value at 388734. It worked,
and it worked for a reason no one should have to rediscover.

The DTCG source and the `@theme` block now hold the number twice. A parity test pins them together
(`tests/architecture/container-contract.test.ts`), which is what makes the duplication safe.

### Why this cannot repeat the 2026-08-03 incident

Registering `--spacing-{key}` in `@theme` once rescaled `max-w-sm` to 0.75rem in production, because
Tailwind puts every `--spacing-*` key on the shared size rail. `--container-*` is the max-width
namespace specifically, and `text` / `content` / `wide` are names, not steps on the numeric scale —
they cannot collide with `sm` … `7xl`. The test asserts that separation rather than trusting it, and
the default scale was checked in built CSS: `max-w-sm`, `max-w-2xl`, `max-w-4xl` and `max-w-6xl` all
still resolve to `var(--container-<step>)`.

## Enforcement

`tests/architecture/container-contract.test.ts`, five assertions:

1. every step is registered on the theme, so the utility is generated
2. the theme literals equal the DTCG source
3. the variables are still emitted, so `var(--container-wide)` keeps working
4. no call site types a container width by hand
5. the container names cannot collide with the numeric scale

Both failure modes were confirmed to fail rather than pass vacuously: a hand-typed `max-w-[1400px]`
trips (4), and editing the theme literal to `1399px` trips (2).

## Consequences

`max-w-[1400px]` and the `max-w-[var(--container-*)]` long form are now lint failures, and
`CLAUDE.md`'s container table needs its recommended-form column updated to the utilities.

Rejected alternative: leaving the contract as documentation and fixing call sites as they are
touched. That is what produced the 98, and it has no end state.
