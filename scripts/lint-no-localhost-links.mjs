#!/usr/bin/env node

// CI guard: no dev-server URLs (`http://localhost:3105`, `http://127.0.0.1:…`)
// written into app source.
//
// On 2026-10-10 a production site shipped four links to http://localhost:3105
// (the "Client" channel, the footer, every App-market category, the Forge
// card) and a sign-in returnTo that started at http://localhost:3106 until
// hydration. Each was a "temporary" literal or an `?? "http://localhost…"`
// fallback for a missing env var. A missing env var must resolve to the
// production host (`https://${brand.domains.<app>}`), never to a dev port.
//
// Counted: a string literal that starts with http(s)://localhost:<port> or
// http(s)://127.0.0.1:<port>, in .ts/.tsx under apps/** (tests, specs, stories
// and e2e excluded by the shared walker). Comments are stripped first.
//
// SHRINK-ONLY ratchet (governance.config.json → localhostLinks.allowlist).
// Server-only dev defaults that never reach a browser may stay listed; migrate
// them to the brand domain on touch.
//
// Run: node scripts/lint-no-localhost-links.mjs

import { listSourceFiles, runCountRatchet, sourceFor } from "./lib/jsx-count-ratchet.mjs";

const LOCALHOST_LITERAL = /["'`]https?:\/\/(?:localhost|127\.0\.0\.1):\d+/g;

runCountRatchet({
  key: "localhostLinks",
  what: "localhost URL literals",
  files: listSourceFiles(["apps"], { extensions: [".ts", ".tsx"] }),
  count(file) {
    return (sourceFor(file).match(LOCALHOST_LITERAL) ?? []).length;
  },
  fix: [
    "  • Links to another Nebutra app → `https://${brand.domains.<app>}` from @nebutra/brand/metadata",
    "  • Env fallback → `process.env.X?.trim() || `https://${brand.domains.<app>}``",
  ].join("\n"),
});
