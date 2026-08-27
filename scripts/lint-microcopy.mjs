#!/usr/bin/env node

// CI guard: microcopy 七禁令 (seven prohibitions) — shrink-only ratchet.
//
// THIS IS A THIN WRAPPER. The detection logic lives in ONE place:
// scripts/governance/lint-microcopy.mjs — the generalized, config-driven
// engine that create-sailor also ships into scaffolded projects. The monorepo's
// own scan roots, banned patterns, exclude paths and the shrink-only allowlist
// are declared in governance.config.json (microcopyRules section) at the root.
//
// Mechanically-lintable subset only (禁七/禁四/禁一 partial + emoji/exclamation).
// 禁二/禁三/禁五/禁六 and IP red lines (§6.5) are human-review gates.
//
// To change WHAT is governed, edit governance.config.json — not this file.
//
// Run: node scripts/lint-microcopy.mjs
//   (equivalent to: node scripts/governance/lint-microcopy.mjs)

import "./governance/lint-microcopy.mjs";
