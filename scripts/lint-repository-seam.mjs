#!/usr/bin/env node

// CI guard: the Repository Seam — applied SELECTIVELY, not dogmatically.
//
// THIS IS A THIN WRAPPER. The detection logic lives in ONE place:
// scripts/governance/lint-repository-seam.mjs — the generalized, config-driven
// engine that create-sailor also ships into scaffolded projects. The monorepo's
// own core domains, seam paths, DB accessors and the shrink-only allowlist are
// declared in governance.config.json (repositorySeam section) at the repo root.
//
// Repository seam is a best practice for CORE, long-evolving business modules —
// NOT for every table. The engine only enforces the seam in the configured
// coreDomains; simple CRUD outside those is intentionally ungoverned.
//
// To change WHAT is governed, edit governance.config.json — not this file.
//
// Run: node scripts/lint-repository-seam.mjs
//   (equivalent to: node scripts/governance/lint-repository-seam.mjs)

import "./governance/lint-repository-seam.mjs";
