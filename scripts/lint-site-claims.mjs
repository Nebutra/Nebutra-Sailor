#!/usr/bin/env node

// CI guard: what the public site claims about us must be something we can show.
//
// THIS IS A THIN WRAPPER around the copy engine (scripts/governance/lint-microcopy.mjs),
// run on the siteClaims rule set in governance.config.json: star ratings with no
// source, calling ourselves a unicorn, SaaS boilerplate. Shrink-only allowlist.
//
// Run: node scripts/lint-site-claims.mjs

process.argv.push("--rules", "siteClaims");
await import("./governance/lint-microcopy.mjs");
