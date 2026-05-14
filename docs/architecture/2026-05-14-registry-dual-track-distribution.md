# ADR — Registry Dual-Track Distribution for `@nebutra/ui` Primitives

**Status**: Accepted
**Date**: 2026-05-14
**Driver**: Principal UI Systems Architect engagement (motion-drift governance pass)
**Supersedes**: Implicit policy embedded in `@deprecated` JSDoc tags introduced 2026-05-09

---

## Context

`@nebutra/ui` ships 283 primitives consumed two ways:

1. **Internal monorepo apps** (`apps/web`, `apps/landing-page`, `apps/storybook`, etc.) — import directly via `import { X } from "@nebutra/ui/components"`. Single version, atomic upgrade via pnpm workspace.
2. **External customers** of the Nebutra SaaS template — clone or fork the template, then want to **own** the primitive code so they can iterate without waiting for an npm release. This is the shadcn/ui distribution model: `npx shadcn@latest add <url>` copies the component source into the customer's repo.

On 2026-05-09 a partial migration began: 10 primitives (`animate-in`, `bento-grid`, `chart`, `command-menu`, `feature-card`, `globe`, `kpi-card`, `magic-card`, `metric-card`, `pricing-card`) were marked **`@deprecated`** with a removal target of 2026-11-09, accompanied by a `npx shadcn@latest add https://ui.nebutra.com/r/<name>.json` migration instruction.

The `@deprecated` tag was the wrong primitive for this intent. It signals **"this API is going away — migrate"** to:

- IDEs (strikethrough on every import site)
- ESLint / Biome `no-deprecated` rules
- Build-time warnings

But the API is **not** going away for monorepo apps. It is only being **augmented** with a copy-paste distribution channel for external consumers. Internal consumers should see no change.

The contract violation: *using a tag whose semantics differ from the actual lifecycle decision*. Per the engagement contract anti-pattern #4 ("修一个坏 story 时只改 story 不追溯到组件本身的接口问题"), the symptom is IDE noise, but the root cause is **wrong JSDoc semantics**.

## Decision

Introduce two custom JSDoc tags, replacing `@deprecated` on dual-track primitives:

| Tag | Value | Semantics |
|-----|-------|-----------|
| `@registry` | A URL to the shadcn registry JSON (`https://ui.nebutra.com/r/<name>.json`) | "This component is **also** distributed via shadcn registry for external customers." |
| `@distribution` | Free-form string describing the lifecycle | Human-readable narrative of the npm + registry coexistence and any removal horizon. |

Internal IDE behavior:

- No strikethrough on imports
- No `no-deprecated` lint flags
- Tags surface only in JSDoc hover popovers and `@nebutra/design-docs` build pipeline

External documentation pipeline:

- Fumadocs `build-registry.mjs` reads `@registry` and emits "Install via registry" copy-paste blocks in component MDX pages
- `@distribution` is rendered as a banner on the docs page

## Eligibility Criteria

A primitive is a **registry candidate** when ALL of:

1. It is **self-contained** — no transitive `@nebutra/*` dependencies that are themselves not in the registry, OR all such deps are part of the same registry bundle
2. It is **opinionated enough to be a starting point** but not so opinionated that external customers will fight it (e.g., `Globe`, `KPICard`, `MagicCard` ✅; deep `AppShell` integration ❌)
3. It has **stable internal API** — no in-flight breaking changes scheduled in the next 2 quarters
4. It has **visual / behavioral identity** that customers will want to fork (animations, data viz, hero patterns)

Primitives that should **NOT** be registry-distributed:

- Auth flows (`SignInForm`, `Enable2FACard`) — security-sensitive, must follow internal upgrade cadence
- Form infrastructure (`Form`, `FormField`, `FormControl`) — too foundational; customer forking breaks downstream wiring
- Data shells (`AppShell`, `PageHeader`, `EmptyState`) — coupled to tenant context + permissions
- Anything with cross-package side effects (queue, audit, vault primitives)

## How To Add a New Registry-Distributed Primitive

1. Verify all 4 eligibility criteria above
2. Build the registry JSON entry — see `docs/registry/<name>.json` and `scripts/build-registry.mjs`
3. Add to `packages/design/ui/src/primitives/index.ts` with the JSDoc block:

   ```ts
   /**
    * @registry https://ui.nebutra.com/r/<name>.json
    * @distribution dual-track (npm + shadcn registry) until <removal-target-date>.
    *   npm remains canonical for monorepo apps; registry serves external customers
    *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
    */
   export * from "./<name>";
   ```

4. Create the docs page under `apps/design-docs/content/docs/{en,zh}/components/<name>.mdx`
5. Run `pnpm --filter @nebutra/design-docs build:registry` to regenerate `apps/design-docs/src/__registry__/index.tsx`

## Removal-Target Policy

A `@distribution` block with a removal target means **the npm export will be removed on that date**, leaving the shadcn registry as the only distribution channel. This happens only when:

- Six months of dual-track has elapsed
- External customer adoption of the registry version has been verified (telemetry from `ui.nebutra.com`)
- Internal monorepo apps have migrated to either the new internal path OR copied the primitive into their own app code

If any condition is unmet, **extend the removal target by 1 quarter** rather than removing prematurely. Better to carry the dual export longer than to break consumers.

The current 10 primitives have a removal target of **2026-11-09**. As of writing (2026-05-14), that decision is **provisional** — a status check happens at 2026-08-14 (3-month mark).

## Consequences

### Positive

- Clean separation between "going away" (`@deprecated`) and "also distributed elsewhere" (`@registry`)
- IDE noise eliminated for internal developers
- Documentation pipeline gets structured metadata to render correctly
- Future registry candidates have a clear ADR to reference instead of re-litigating

### Negative

- Two new custom JSDoc tags must be documented for new contributors
- Custom tag semantics require explicit ESLint/Biome config to avoid false-positive `no-deprecated` rules (resolved by removing `@deprecated`)
- Removal-target policy requires telemetry from `ui.nebutra.com` — needs to be wired

### Neutral

- The `@distribution` string is human-readable, not machine-parseable. If we need automation later, parse it then or upgrade to a structured custom tag (`@distributionUntil 2026-11-09`)

## References

- shadcn/ui registry distribution model — https://ui.shadcn.com/docs/registry
- Prior implicit policy — git blame on `@deprecated` comment block introduced 2026-05-09
- Motion governance (concurrent PR) — `docs/architecture/2026-05-14-four-rail-motion-tokens.md` *(referenced if/when split)*
