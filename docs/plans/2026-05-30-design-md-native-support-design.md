# Native `DESIGN.md` Ecosystem Support — Design

**Date:** 2026-05-30
**Status:** Approved (brainstorming) → implementation
**Owner:** Design System

---

## 1. Goal

Make the Nebutra design system **natively support the `DESIGN.md` ecosystem** (Google Stitch
`google-labs-code/design.md`, VoltAgent `awesome-design-md`, getdesign.md), **backward-compatible**
with it, while **staying professional** — i.e. governed, DX/UX-leading, and never corrupting our
source of truth.

Strategic frame (user-set):
- `DESIGN.md` is popular because the **AI-Native ecosystem is good and simple** (one markdown file,
  zero tooling). We adopt that simplicity on the surface.
- We must be compatible with **both Figma and `DESIGN.md`**.
- "Professional" = **governance + leading DX/UX**, delivered *through* simplicity, not around it.

North star: **simple on the outside (ecosystem-native, one `.md`, zero tooling), rigorous on the
inside (DTCG SSOT, validation, idempotent round-trip).**

---

## 2. What `DESIGN.md` is (researched)

- A plain `DESIGN.md` = **YAML front matter** (machine tokens) + **markdown prose** (rationale).
  Tokens are *hard constraints*; prose is the *re-anchor* the agent re-reads every generation.
- Front matter schema: `version`, `name`, `description`, `colors` (`#hex` sRGB), `typography`
  (`fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, fontFeature, fontVariation`),
  `rounded` (`<scale>: <dim>`), `spacing` (`<scale>: <dim|number>`), `components`
  (`backgroundColor, textColor, typography, rounded, padding, size, height, width`; variants as
  separate keys e.g. `button-primary-hover`). Token refs: `{path.to.token}`.
- **Elevation/shadows have NO structured token format** in the spec — prose-only (`## Elevation & Depth`).
- Markdown section order: Overview · Colors · Typography · Layout · Elevation & Depth · Shapes ·
  Components · Do's and Don'ts.
- **Official tooling: `@google/design.md` v0.2.0** (npm). CLI `lint / diff / export / spec`;
  programmatic `import { lint } from '@google/design.md/linter'`; `export --format dtcg|css-tailwind|json-tailwind`.
  7 lint rules incl. `broken-ref` and `contrast-ratio` (WCAG AA 4.5:1).
- **Spec is `alpha`** — actively changing. DTCG is *the* interop bridge.

---

## 3. Architecture — DTCG hub, `DESIGN.md` as the 4th sync provider

```
  @nebutra/design-tokens (DTCG SSOT)        ← single source of truth · governance hub (UNCHANGED)
    core.json / semantic.json / themes/*
        │ Style Dictionary → css / tailwind / ts (runtime, unchanged)
        │
  @nebutra/design-sync (provider-agnostic: pull / push / healthcheck)
    figma · penpot · git-only · ★ design-md (NEW)
        Figma (rich, needs tool/account)   DESIGN.md (simple, one .md, zero tooling)  ← peers
```

`DESIGN.md` and Figma become **peer providers** under one `pull/push` abstraction, both kept in
lock-step by the DTCG hub. A designer in Figma and an AI agent reading `DESIGN.md` see the same
governed system.

### Build ON `@google/design.md`, don't hand-roll

- **Import** (`DESIGN.md → DTCG theme`): wrap the official parser / `export --format dtcg`. No
  hand-rolled markdown parser.
- **Export** (`DTCG → DESIGN.md`): the official CLI only goes *from* `DESIGN.md`, so the
  **serializer is the one piece we own** — but its output is gated through the official `lint`
  (`broken-ref` + `contrast-ratio`), guaranteeing spec conformance.
- This honors 手搓禁止 (use the canonical engine) and maximizes ecosystem compatibility.

---

## 4. Governance invariants (the rigor under the simple surface)

1. **SSOT one-way.** `push` emits `DESIGN.md` from DTCG; `import` lands a new `themes/<brand>.json`
   (data-theme). **`core.json` / `semantic.json` are never written.**
2. **VI lock.** 云毓蓝 `#0033FE` / 云毓青 `#0BF1C3` are locked `core` primitives; an imported
   `DESIGN.md` can only land in a *theme override*, never in SSOT.
3. **Official lint = the gate.** Generated `DESIGN.md` must pass `@google/design.md` lint
   (`broken-ref`, `contrast-ratio` WCAG AA). Fail-closed. We use the ecosystem's own standard, not
   bespoke rules. (Aligns with our existing a11y governance.)
4. **Alpha pinned + isolated.** Pin `@google/design.md` exact version; isolate all spec coupling
   inside the provider so spec churn can't reach the SSOT.
5. **Elevation gap is honest.** Elevation/shadow tokens serialize into the prose `## Elevation & Depth`
   section, flagged prose-only; the round-trip reports this as a known lossy point (no silent loss).
6. **Round-trip parity.** A test asserts `DTCG → DESIGN.md → DTCG` is idempotent on the representable
   subset, and that Figma and `DESIGN.md` resolve identical semantic values.
7. **No silent loss, no overgineering.** Anything an import can't represent as a theme token is
   *reported in the pull summary* — but we do NOT build overlay/sidecar/promote machinery. Honest + simple.

---

## 5. Token mapping (DTCG ⇄ `DESIGN.md`)

Export resolves to **bare hex** (max compatibility for dumb agents) while keeping semantic role names
and rich prose.

| `DESIGN.md` front matter | Source in our DTCG |
|---|---|
| `colors.primary` | `semantic.brand.primary` (`#0033FE`, 云毓蓝) |
| `colors.accent` | `semantic.brand.accent` (`#0BF1C3`, 云毓青) |
| `colors.neutral` / `background` / `foreground` | neutral scale + theme `color.background/foreground` |
| `colors.danger/warning/success/info` | `semantic.status.*` |
| `typography.{h1,body-md,...}` | `fontFamily.*` + type scale |
| `rounded.{sm,md,lg}` | `size.radius.*` / `semantic.radius` |
| `spacing.{...}` | `size.*` scale |
| `components.{button,card,input}` | component-level tokens (shadcn/ds) where present |
| prose `## Elevation & Depth` | `elevation.*` / shadow tokens (prose-only) |
| prose `## Do's and Don'ts` | distilled from `CLAUDE.md` token governance — **the differentiator** |
| prose `## Colors` bullets | each token's `$description` (e.g. "云毓蓝") |

**Import** parses front matter → maps named roles → `themes/<brand>.json` satisfying the registry's
`governance.requiredTokens`; runs `validateDtcgTree`; reports unmapped fields.

---

## 6. Implementation plan (additive-only; existing providers untouched)

```
packages/design/design-sync/
  package.json                     + dep: @google/design.md (pinned)   + export "./design-md"
  src/types.ts                     + "design-md" union member + DesignMdProviderConfig
  src/detect.ts                    + design-md recognition (DESIGN_SYNC_PROVIDER / DESIGN_MD_PATH)
  src/factory.ts                   + switch case "design-md"
  src/index.ts                     + export DesignMdProvider
  src/serialize/to-design-md.ts    ★ DTCG sets → DESIGN.md string (front matter + prose)   [own]
  src/serialize/from-design-md.ts  ★ DESIGN.md → DTCG theme set (wraps @google/design.md)   [wrap]
  src/providers/design-md.ts       ★ DesignMdProvider (pull/push/healthcheck + lint gate)
  src/__tests__/to-design-md.test.ts        ★ serializer unit tests (TDD)
  src/__tests__/from-design-md.test.ts      ★ parser/import tests (TDD)
  src/__tests__/design-md.test.ts           ★ provider tests (mirror penpot.test.ts)
  src/__tests__/roundtrip.parity.test.ts    ★ idempotency + Figma-parity
```

**Phases:**
- **P0 foundation** — types + detect + dep install; serializer (`to-design-md`) + lint gate; provider
  `push` emits a root `DESIGN.md` that passes official lint.
- **P1 round-trip** — `from-design-md` (wrap `export --format dtcg`) → theme; `validateDtcgTree`;
  round-trip parity test.
- **P2 lockstep + CI** — `design-tokens build` emits `DESIGN.md`; extend `.github/workflows/design-sync.yml`
  to run lint + parity; pin alpha version + spec-compat self-check.
- **P3 optional (out of scope now)** — `designtoken.md` second emitter; `preview.html` generation;
  apps/web import UI; publish to getdesign.md.

---

## 7. Testing strategy (TDD, executed by subagents)

Strict RED → GREEN → REFACTOR per slice, ≥80% coverage, vitest (mirrors existing
`__tests__/*.test.ts` tmpdir-fixture style).

- `to-design-md`: given DTCG fixtures → asserts front-matter token values, section order, prose from
  `$description`, and that output **passes `@google/design.md` lint**.
- `from-design-md`: given a real ecosystem `DESIGN.md` → asserts a valid `themes/<brand>.json`,
  SSOT untouched, unmapped fields reported.
- provider: `pull/push/healthcheck` (dry-run defaults, fail-closed validation).
- parity: `DTCG → md → DTCG` idempotent on representable subset.

---

## 8. Risks

- **Alpha spec churn** → pinned version + provider isolation + spec self-check (invariant 4).
- **Elevation lossiness** → documented prose-only + reported (invariant 5).
- **Concurrent-session working tree** → commit only design-md files (`git commit -- <file>`), never `git add -A`.
