# F2 Track D — SOTA sample pass (2026-07-31)

Parent: [2026-07-31-forge-f2-convergence.md](../2026-07-31-forge-f2-convergence.md)

Three blades only. No fourth.

## 1. `data/json-format`

| Dimension | Before | After |
|-----------|--------|-------|
| Engine | ECMA `JSON.parse` (correct SOTA) | unchanged |
| Journey | Format/minify on click | **Live validate** (debounced) + badge |
| Power options | indent only | **sortKeys**, **validate** mode on API |
| Keyboard | none | **⌘/Ctrl+Enter** formats |
| Stats | none | chars + lines; live-off for >200k |
| Agent | same path | `sortKeys` + `mode=validate` + `charsIn/Out` |

Honest residual: full competitor screenshot matrix still optional; engine choice is settled.

## 2. `doc/pdf-compress`

| Dimension | Before | After |
|-----------|--------|-------|
| **Download** | **Broken** `href` (`[PDF attachment removed…]`) | Fixed `data:application/pdf;base64,…` |
| Upload UX | plain file input | drag-drop zone |
| Honesty | engine in meta | privacy note + relative size bar |
| Engine | qpdf / gs / pdf-lib (already) | unchanged |

## 3. `image/compress`

| Dimension | Before | After |
|-----------|--------|-------|
| Engine | sharp (SOTA) | unchanged |
| Batch | Track A Batch tab | kept |
| Privacy | thin note | explicit **upload + no retain** copy |
| Single journey | drop + quality + before/after | kept; privacy above fold |

## Ship-gate note

Track D is **journey + defect closure** on existing engines, not a research rewrite of all three briefs. Full §6.7.10 competitor capture remains backlog for marketing SEO pages; product bar for these three is now met for F2 exit.
