# Forge — hard-correct decisions (no degraded positioning)

**Date:** 2026-08-03 (updated)  
**Principle:** Function-complete with a lab disclaimer is **not** shippable.  
Either a SOTA (or industry-standard) engine is product-ready, or the blade is **out of the product registry**.

---

## Gate (CI + review)

1. **No silent degradation** — product path fails closed; no auto-fallback that claims success with a toy engine.
2. **No lab/shell catalog** — tools whose marketing copy needs “lab / coarse / lightweight dictionary / not full X / shell only” do **not** register in `F0_BATCH1_TOOLS` or `apps/forge` host.
3. **Every registered slug has an explicit workspace case** — no `workspaceMissing` via accidental orphan runners.
4. **Production wallet** — default `ledger` (`createCreditLedgerWallet` + `@nebutra/billing/credits`). Memory only in non-production, or emergency `FORGE_ALLOW_MEMORY_WALLET=1`.
5. **Core SKILL coverage** — every `tier: core` tool has a skill dir (generate pipeline).

CI: `node scripts/lint-forge-hard-correct.mjs` (wired into monorepo `pnpm lint`).

---

## Product path fail-closed

| Surface | Decision |
|---------|----------|
| `doc/md-to-pdf` | Default `engine=playwright`. No `auto` silent simple fallback. `simple` only when **explicitly** requested (tests/CI). Product host **requires** Chromium: `pnpm forge:playwright:install` + `pnpm forge:md-to-pdf:verify`. |
| Wallet | `FORGE_WALLET_MODE` — default `ledger` in production, `memory` in dev. Ledger top-up is billing checkout, not mock API. |
| Translator root | Stays **empty** until W6 gate — no shell tools to fake density. |

---

## SOTA re-entry (2026-08-03)

| Slug | Engine | Status |
|------|--------|--------|
| `css-minify` | **CSSO** 5.x | Re-entered |
| `css-format` | **Prettier** CSS parser | Re-entered |
| `html-minify` | **html-minifier-terser** 7.x | Re-entered |
| `html-format` | **Prettier** HTML parser | Re-entered |
| `svg-optimize` | **SVGO** 4.x multipass | Re-entered |
| `user-agent-parse` | **ua-parser-js** 2.x | Re-entered |

---

## Still delisted

| Slug | Why | Re-entry bar |
|------|-----|--------------|
| `kinship` | Dictionary map only | Full kinship engine + fixture set |
| `phone-lookup` | Coarse prefix carrier | Maintainable geo/carrier dataset + update path |
| `router-translate` | Router deep-link shell | Real Router invoke + model meter + result body (W6) |

Source may still exist in tree for the deferred set; **not** exported in product arrays.

---

## Wired (orphan runners — fixed)

- `business-day-shift` · `csv-columns` · `loan-amortization` · `retry-backoff-schedule` · `exif-strip` · `image-rotate-flip`

---

## Enforcement

- `node scripts/lint-forge-hard-correct.mjs`
- Unit tests assert deferred slugs are **absent** and SOTA engines return expected `engine` labels
- Host README + this file are the narrative source of truth
