# Token Drift Audit — Nebutra Design System

**Date:** 2026-05-09
**Status:** Read-only audit
**Source files inspected:** `packages/brand/`, `packages/tokens/`, `packages/theme/`, `packages/ui/`, `scripts/verify-brand-token-sync.ts`

---

## 1. Inventory — All Definition Points Per Token Category

### Brand Blue Base (#0033FE)

| # | File | Line | Token Name | Raw Value |
|---|------|------|-----------|-----------|
| 1 | `packages/brand/src/guidelines/color.ts` | 18 | `nebutraBlue.hex` | `"#0033FE"` |
| 2 | `packages/brand/src/guidelines/color.ts` | 197–209 | `nebutraBlueScale[500]` | `"#0033FE"` |
| 3 | `packages/brand/src/metadata.ts` | 66 | `colors.primary[500]` | `"#0033FE"` |
| 4 | `packages/tokens/styles.css` | 18 | `--nebutra-brand-blue` | `#0033fe` |
| 5 | `packages/tokens/styles.css` | 379 | `--nebutra-brand-blue` (P3 override) | `color(display-p3 0.03 0.19 0.99)` |
| 6 | `packages/brand/src/metadata.ts` | 96 | `colors.gradient.primary` (stop) | `"#0033FE"` |
| 7 | `packages/brand/src/guidelines/color.ts` | 66 | `brandGradient.primary.stops[0].color` | `"#0033FE"` |

**Verdict: 7 raw-value definition points across 2 files.** The `packages/ui` chain (`primitive.ts` → `tailwind.preset.ts`) delegates to `colors.primary[500]` from `@nebutra/brand`, so it adds no additional raw literal — it references the brand source.

---

### Blue Color Scale — Drift Analysis

`packages/brand/src/guidelines/color.ts` (`nebutraBlueScale`) vs `packages/brand/src/metadata.ts` (`colors.primary`) — these are **two independent definitions of the same scale**:

| Step | `guidelines/color.ts` `nebutraBlueScale` | `metadata.ts` `colors.primary` | Match? |
|------|------------------------------------------|--------------------------------|--------|
| 50 | `#f0f4ff` | `#e6ebff` | **DRIFT** |
| 100 | `#dbe4ff` | `#ccd7ff` | **DRIFT** |
| 200 | `#bac8ff` | `#99afff` | **DRIFT** |
| 300 | `#91a7ff` | `#6687ff` | **DRIFT** |
| 400 | `#5c7cfa` | `#335ffe` | **DRIFT** |
| 500 | `#0033FE` | `#0033FE` | MATCH |
| 600 | `#002ad4` | `#0029cb` | **DRIFT** |
| 700 | `#0021ab` | `#001f98` | **DRIFT** |
| 800 | `#001882` | `#001466` | **DRIFT** |
| 900 | `#000f59` | `#000a33` | **DRIFT** |
| 950 | `#000830` | `#00051a` | **DRIFT** |

**All 10 non-base steps drift.** `packages/tokens/styles.css` inherits values from its own hardcoded scale (lines 27–38), which matches `guidelines/color.ts`, not `metadata.ts`. But `packages/ui/src/tokens/primitive.ts` imports from `@nebutra/brand` which re-exports `metadata.ts` `colors` — so the TS primitive layer uses the `metadata.ts` scale, while the CSS layer uses the `guidelines/color.ts` scale.

---

### Cyan Color Scale — Drift Analysis

| Step | `guidelines/color.ts` `nebutraCyanScale` | `metadata.ts` `colors.accent` | Match? |
|------|------------------------------------------|-------------------------------|--------|
| 50 | `#e6fff8` | `#e7fef8` | **DRIFT** |
| 100 | `#b3ffec` | `#cffdf1` | **DRIFT** |
| 200 | `#80ffe0` | `#9ffbe3` | **DRIFT** |
| 300 | `#4dfcd4` | `#6ff9d5` | **DRIFT** |
| 400 | `#1af7c8` | `#3df5c9` | **DRIFT** |
| 500 | `#0BF1C3` | `#0BF1C3` | MATCH |
| 600 | `#09c9a3` | `#09c19c` | **DRIFT** |
| 700 | `#07a183` | `#079175` | **DRIFT** |
| 800 | `#057963` | `#05614e` | **DRIFT** |
| 900 | `#035143` | `#023027` | **DRIFT** |
| 950 | `#012923` | `#011814` | **DRIFT** |

Same structural problem: all 10 non-base cyan steps differ between the two brand sub-packages.

---

### Neutral Scale — Triple Drift

Three independent neutral scale definitions exist:

| Step | `guidelines/color.ts` `nebutraNeutralScale` | `metadata.ts` `colors.neutral` | `tokens/styles.css` `--nebutra-neutral-*` |
|------|---------------------------------------------|-------------------------------|------------------------------------------|
| 50 | `#f8fafc` | `#fafafa` | `#f8fafc` (CSS matches guidelines) |
| 100 | `#f1f5f9` | `#f4f4f5` | `#f1f5f9` |
| 200 | `#e2e8f0` | `#e4e4e7` | `#e2e8f0` |
| 300 | `#cbd5e1` | `#d4d4d8` | `#cbd5e1` |
| 400 | `#94a3b8` | `#a1a1aa` | `#94a3b8` |
| 500 | `#64748b` | `#71717a` | `#64748b` |
| 600 | `#475569` | `#52525b` | `#475569` |
| 700 | `#334155` | `#3f3f46` | `#334155` |
| 800 | `#1e293b` | `#27272a` | `#1e293b` |
| 900 | `#0f172a` | `#18181b` | `#0f172a` |
| 950 | `#020617` | `#09090b` | `#020617` |

`guidelines/color.ts` uses Tailwind Slate. `metadata.ts` uses Tailwind Zinc. The CSS layer matches `guidelines.ts` (Slate). The TS layer (`primitive.ts`) imports from `metadata.ts` (Zinc). **The neutral scale used in Tailwind classes vs CSS variables are different color families.**

---

### Semantic Status Colors — Drift

| Token | `metadata.ts` | `tokens/styles.css` `--status-*` | `primitive.ts` |
|-------|--------------|-----------------------------------|----------------|
| success | `#22c55e` | `#10b981` (`--status-success`) | `#22c55e` (green500) |
| warning | `#f59e0b` | `#f59e0b` | `#f59e0b` |
| error/danger | `#ef4444` | `#ef4444` | `#ef4444` |
| info | `#0033FE` | `var(--brand-primary)` | `blue500` (#0033FE) |

**Critical drift:** `metadata.ts` success = `#22c55e` (Tailwind green-500), but `tokens/styles.css` `--status-success` = `#10b981` (Tailwind emerald-500). These resolve to visually different greens. `tokens/styles.css` semantic `--success` is HSL `142 71% 29%` (dark green for contrast), yet `--status-success` is `#10b981`. Three different "success" greens exist.

---

### `--primary` Token — Semantic Layer Collision

`tokens/styles.css` line 204: `--primary: 228 85% 56%` resolves to approximately `#254bfa` (a softer brand blue).
`themes.css` `@theme` block line 22: `--color-primary: oklch(0.452 0.313 264.1)` resolves to approximately `#2c2fbb` (a darker purple-blue).

These are not the same color. The `packages/theme/themes.css` **overrides** `--color-primary` with an incompatible oklch value in its `@theme` block — any app importing both files has `themes.css` win the cascade.

---

### Font Stack Conflict

| Layer | `--font-sans` |
|-------|--------------|
| `tokens/styles.css` line 858–861 | `"Poppins", "vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", ...` |
| `themes.css` `@theme` line 64 | `"Inter", ui-sans-serif, system-ui, sans-serif` |
| `metadata.ts` `typography.fontFamily.sans` | `"Geist", "Noto Sans SC", "vivo Sans", ...` |
| `primitive.ts` `primitiveFontFamily.sans` | `"Poppins", "vivo Sans", "PingFang SC", ...` |

Four different `--font-sans` values. The VI manual was updated (`metadata.ts`) to use **Geist** as the new primary font, but `tokens/styles.css` and `primitive.ts` still specify **Poppins**.

---

## 2. Drift Findings Summary

| Severity | Token | Locations | Issue |
|----------|-------|-----------|-------|
| CRITICAL | Blue scale (10 steps) | `guidelines/color.ts` vs `metadata.ts` | Different hex values for all non-base steps |
| CRITICAL | Cyan scale (10 steps) | `guidelines/color.ts` vs `metadata.ts` | Different hex values for all non-base steps |
| CRITICAL | Neutral scale (all steps) | `guidelines/color.ts` (Slate) vs `metadata.ts` (Zinc) | Different color families |
| CRITICAL | `--font-sans` | 4 locations | Poppins vs Inter vs Geist |
| HIGH | `--color-primary` / `--primary` | `tokens/styles.css` vs `themes.css` | Cascade override produces wrong brand blue |
| HIGH | success green | `metadata.ts` (#22c55e), `styles.css` `--status-success` (#10b981), `styles.css` `--success` (HSL 142 71% 29%) | 3 different greens |
| MEDIUM | `--brand-gradient` vs `--gradient-brand` | `tokens/styles.css` lines 68–72 and 866–870 | Two tokens with identical gradient values but different names; both defined in same file |

---

## 3. Alias Map — Cross-Namespace Equivalence

The system has 4 naming namespaces for the same concept:

```
Concept: "Brand Blue 500 = #0033FE"

  @nebutra/brand (TS)
    colors.primary[500]                      → "#0033FE"  [metadata.ts:66]
    nebutraBlueScale[500]                    → "#0033FE"  [guidelines/color.ts:204]

  @nebutra/tokens (CSS)
    --nebutra-brand-blue                     → #0033fe    [styles.css:18]
    --nebutra-blue-500                       → var(--nebutra-brand-blue)   [styles.css:32]
    --blue-9 (light mode)                    → var(--nebutra-blue-500)     [styles.css:152]
    --brand-primary                          → var(--blue-9)              [styles.css:314]
    --color-brand-primary (Tailwind @theme)  → var(--brand-primary)       [styles.css:722]

  @nebutra/ui (TS)
    primitiveColors.blue500                  → colors.primary[500]  [primitive.ts:22]
    nebutraColors.blue[500]                  → primitiveColors.blue500  [tailwind.preset.ts:37]
    nebutraColors.blue.DEFAULT               → primitiveColors.blue500  [tailwind.preset.ts:43]
    nebutraColors.info                       → primitiveColors.blue500  [tailwind.preset.ts:83]

Chain depth: 6 hops from Tailwind class → raw hex in CSS (longest path).
```

```
Concept: "Neutral background = light gray"

  metadata.ts:     colors.neutral[50]        = "#fafafa"  (Zinc-50)
  guidelines.ts:   nebutraNeutralScale[50]   = "#f8fafc"  (Slate-50)
  tokens/css:      --nebutra-neutral-50       = #f8fafc   (Slate-50)
  tokens/css:      --neutral-1 (light)        = #ffffff   (white, not neutral-50!)
  tokens/css:      --neutral-2 (light)        = var(--nebutra-neutral-50) = #f8fafc

  TS primitive.ts:  primitiveColors.neutral50 = colors.neutral[50] = "#fafafa" (Zinc)
  Tailwind preset:  nebutraColors.neutral[50] = primitiveColors.neutral50 = "#fafafa" (Zinc)

  Result: CSS bg-neutral-2 ≠ Tailwind bg-neutral/50 — they resolve to different grays.
```

```
Concept: "Brand Gradient"

  metadata.ts:          colors.gradient.primary   = "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)"
  guidelines/color.ts:  brandGradient.primary.css = "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)"
  tokens/styles.css:47: --brand-gradient           = linear-gradient(135deg, var(--nebutra-blue-500) 0%, var(--nebutra-cyan-500) 100%)
  tokens/styles.css:866:--gradient-brand           = linear-gradient(135deg, var(--nebutra-blue-500) 0%, var(--nebutra-cyan-500) 100%)

  Note: --brand-gradient and --gradient-brand coexist in the same file with identical computed values.
  CLAUDE.md docs reference --brand-gradient; @theme Tailwind block registers --gradient-brand.
  Application code using var(--brand-gradient) gets no Tailwind class; bg-gradient-brand uses the other.
```

---

## 4. Single-Source Recommendation — SSOT Format + Migration Path

### Recommended SSOT: `packages/design-tokens/tokens/*.json` (W3C DTCG)

A new `@nebutra/design-tokens` package was scaffolded as a parallel SSOT alongside this audit. It uses W3C Design Tokens Community Group (DTCG) format with `$value` / `$type` schema. Style Dictionary 4 generates CSS / TS / Tailwind preset from this single source. The intermediate `metadata.ts` / `guidelines/color.ts` / `styles.css` layers should eventually be **generated artifacts**, not hand-edited.

**Why DTCG over plain TS:**
- Tokens Studio for Figma reads/writes DTCG natively → designer tooling parity
- Cross-language consumption (Swift, Kotlin, etc.) future-proof
- Single editable source eliminates the 3-layer drift problem this audit documents

### Migration Steps (file:line specific)

**Step 1 — Unify the color scales (highest priority)**

`packages/brand/src/guidelines/color.ts:197–248` — Remove `nebutraBlueScale`, `nebutraCyanScale`, `nebutraNeutralScale`. Replace all consumers with imports from `metadata.ts`:
- `guidelines/color.ts:316` uses `nebutraBlueScale[500]` → change to `colors.primary[500]`
- `guidelines/color.ts:317` uses `nebutraCyanScale[500]` → change to `colors.accent[500]`

**Step 2 — Add neutral to `metadata.ts`**

`packages/brand/src/metadata.ts` currently has `colors.neutral` using Zinc. Decide which is correct (Zinc or Slate) and standardize. The VI manual uses blue-undertone grays → Slate is more defensible. Update `metadata.ts:109–122` to Slate values, then delete `guidelines/color.ts:236–248`.

**Step 3 — Fix `tokens/styles.css` to reference brand package values via a build step**

`packages/tokens/styles.css:27–65` contains hardcoded scale values. Long-term: generate this block from the DTCG `tokens.json` via Style Dictionary (already scaffolded in `packages/design-tokens/`). Short-term: manually reconcile so all steps match `metadata.ts`.

**Step 4 — Resolve `--brand-gradient` / `--gradient-brand` duplicate**

`packages/tokens/styles.css:68` defines `--brand-gradient`. `packages/tokens/styles.css:866` defines `--gradient-brand`. Pick one name. CLAUDE.md uses `--brand-gradient` in all examples → keep `--brand-gradient`, remove `--gradient-brand` from `@theme`, expose via Tailwind as `bg-[var(--brand-gradient)]` or add a dedicated alias.

**Step 5 — Fix `--primary` token collision**

`packages/theme/themes.css:22` defines `--color-primary: oklch(0.452 0.313 264.1)`. This overrides `packages/tokens/styles.css:204` `--primary: 228 85% 56%`. The `themes.css` values are multi-theme overrides (neon, gradient, etc.) and intentionally differ from brand tokens. Apps should import `tokens/styles.css` for brand use and `themes.css` only when activating the preset theme engine — they should not both be globally applied to `<html>` unless the cascade ordering is explicitly managed.

**Step 6 — Resolve font stack**

`packages/brand/src/metadata.ts:152` declares Geist as the new primary font. `packages/tokens/styles.css:858` still uses Poppins. `packages/ui/src/tokens/primitive.ts:185` uses Poppins. Update both to match `metadata.ts` typography.

---

## 5. Verifier Coverage Gap

`scripts/verify-brand-token-sync.ts` currently checks (lines 32–43):

1. `themes.css` contains `--color-primary` and `--color-secondary` (string presence only — no value check)
2. `themes.css` contains `@theme`
3. `colors.primary[500] === "#0033FE"` (metadata.ts only)
4. `colors.accent[500] === "#0BF1C3"` (metadata.ts only)

### Missing Checks

| Gap | Impact | Suggested assertion |
|-----|--------|-------------------|
| No cross-check between `guidelines/color.ts` scales and `metadata.ts` scales | The 20-step drift between the two files goes undetected | Compare `nebutraBlueScale[n]` to `colors.primary[n]` for all steps |
| No check of `tokens/styles.css` CSS variable values vs `metadata.ts` | CSS layer silently drifts from TS source | Parse `--nebutra-blue-500` value and compare to `colors.primary[500]` |
| No check on neutral scale family (Zinc vs Slate) | `bg-neutral` Tailwind class uses Zinc; CSS `--nebutra-neutral-*` uses Slate | Assert `nebutraNeutralScale[50] === colors.neutral[50]` |
| No check for duplicate token names (`--brand-gradient` vs `--gradient-brand`) | Docs and runtime diverge | Grep for both names, assert only one exists |
| No check on font stack consistency | Three different `--font-sans` values across 3 files | Compare `typography.fontFamily.sans` in `metadata.ts` to `--font-sans` in `tokens/styles.css` |
| No check of `--status-success` vs `metadata.ts colors.success` | Success color is `#10b981` in CSS, `#22c55e` in TS | Assert `--status-success` hex matches `colors.success` |
| `themes.css` presence check is string-only | Does not catch value mutations in `themes.css` theme blocks | No theme-level value validation exists at all |
| Only checks `metadata.ts`, not `guidelines/color.ts` | Fails to catch the guidelines↔metadata drift | Verify both brand sub-modules agree on scales |

### Existing parity verifier

The new `packages/design-tokens/scripts/verify-parity.ts` already addresses several of these gaps for the CSS layer (currently 86.9% match against `tokens/styles.css`). The remaining 13% drift is documented in the design-tokens package README and represents genuine modeling gaps (Display-P3 wide-gamut overrides, oklch fallbacks, compound shorthand tokens) — not silent bugs.

---

## Essential Files

- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/brand/src/metadata.ts` — designated SSOT by the verifier, contains competing neutral and color scales
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/brand/src/guidelines/color.ts` — diverged second definition of all scales (should be deleted after reconciliation)
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/tokens/styles.css` — CSS runtime layer (1564 lines); hardcodes scale values from `guidelines.ts` family; contains both `--brand-gradient` (line 68) and `--gradient-brand` (line 866) as duplicate gradient tokens
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/theme/themes.css` — multi-theme engine; its `@theme` block overrides `--color-primary`, `--font-sans`, and semantic tokens with values unrelated to the brand VI; creates cascade collision when both files are imported
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/ui/src/tokens/primitive.ts` — TS primitive bridge; correctly imports from `@nebutra/brand` (`metadata.ts`), so gets Zinc neutrals; diverges from CSS layer which uses Slate
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/ui/src/tailwind.preset.ts` — Tailwind preset consuming primitive.ts; exposes color palette with Zinc neutrals to legacy tailwind.config consumers
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/scripts/verify-brand-token-sync.ts` — CI verifier; checks only 4 narrow assertions, misses all inter-file drift
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design-tokens/` — new W3C DTCG SSOT package (parallel, non-replacing)
