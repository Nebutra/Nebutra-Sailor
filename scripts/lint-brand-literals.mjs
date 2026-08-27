#!/usr/bin/env node

// CI guard: brand identity literals.
//
// THIS IS A THIN WRAPPER. The detection logic lives in ONE place:
// scripts/governance/lint-brand-literals.mjs — the generalized, config-driven
// engine that create-sailor also ships into scaffolded projects. The monorepo's
// own governed paths, brand literal patterns, permanent exemptions, and the
// shrink-only allowlist are declared in governance.config.json (brandLiterals
// section) at the repo root.
//
// Brand identity must flow from @nebutra/brand/metadata (brand.name,
// brand.domains.*) + CSS vars (var(--brand-primary), var(--brand-accent)) —
// never hardcoded as raw strings. A single `pnpm brand:apply` run should
// propagate a rebrand end-to-end.
//
// To change WHAT is governed, edit governance.config.json — not this file.
//
// Run: node scripts/lint-brand-literals.mjs
//   (equivalent to: node scripts/governance/lint-brand-literals.mjs)

import "./governance/lint-brand-literals.mjs";
