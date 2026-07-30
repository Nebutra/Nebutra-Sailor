#!/usr/bin/env node

// CI guard: fail when a Tailwind utility uses an arbitrary pixel breakpoint
// (`min-[NNNpx]:` or `max-[NNNpx]:`) instead of going through a named token
// declared in `packages/design/tokens/styles.css` @theme block.
//
// Why this matters (2026-05 breakpoint governance):
//   We compared Vercel's stylesheets (61 unique breakpoints — engineering
//   humus over years of per-device tuning) vs Flowith (20 — deliberate
//   system). Nebutra-Sailor currently sits at ~7 named + 4 arbitrary; the
//   ratchet is: every new `min-[Npx]:` either (a) maps to one of the named
//   tokens, or (b) deserves a NEW named token in the SSOT (justify in PR).
//
// Named tokens (in @theme inline):
//   xs        420px   narrow phone grid flip
//   sm        640px   Tailwind default
//   md        768px   Tailwind default
//   lg       1024px   Tailwind default
//   tight    1080px   dense dashboard header horizontal
//   shell    1180px   full three-pane shell
//   xl       1280px   Tailwind default
//   2xl      1536px   Tailwind default
//   3xl      1800px   4K / Studio Display
//
// Scope note: this guard scanned `apps` only until 2026-07-30. The component
// library is what every app renders, so a breakpoint hardcoded there reaches
// further than one hardcoded in a single app — packages/design is now scanned
// too. It was clean at the time of widening (0 arbitrary breakpoints), so this
// is a guard placed ahead of the debt rather than around it, and needs no
// allowlist. Mirrors the 2026-07-28 widening of scripts/lint-no-focus-rings.mjs.
//
// Run: node scripts/lint-no-arbitrary-breakpoints.mjs
// Exit 1 on any violation. Wired into root `pnpm lint`.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SCAN_ROOTS = ["apps", "packages/design"];

const WHITELIST = [/\.test\.tsx?$/, /\/__tests__\//, /\.stories\.tsx?$/];

const isWhitelisted = (path) => WHITELIST.some((re) => re.test(path));

// Pattern: `min-[NNNpx]:` or `max-[NNNpx]:` Tailwind responsive prefix.
const BAD_RE = /\b(min|max)-\[(\d+)px\]:/g;

// rg exits 1 when zero matches — that's a clean state, not an error.
let filesRaw;
try {
  filesRaw = execSync(
    "rg -l --glob '*.{tsx,ts,jsx,js}' --glob '!**/node_modules/**' " +
      "--glob '!**/.next/**' --glob '!**/.open-next/**' --glob '!**/.turbo/**' " +
      "--glob '!**/dist/**' --glob '!**/build/**' --glob '!**/storybook-static/**' " +
      `--glob '!**/.deploy/**' '(min|max)-\\[[0-9]+px\\]:' ${SCAN_ROOTS.join(" ")}`,
    { encoding: "utf-8" },
  ).trim();
} catch {
  filesRaw = "";
}

const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isWhitelisted(f));

const violations = [];

for (const file of files) {
  const src = readFileSync(file, "utf-8");
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].matchAll(BAD_RE);
    for (const m of matches) {
      violations.push({ file, line: i + 1, snippet: m[0], px: m[2] });
    }
  }
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ lint-no-arbitrary-breakpoints: no arbitrary Tailwind breakpoints in ` +
      `${SCAN_ROOTS.map((r) => `${r}/**`).join(" + ")} — all responsive utilities go through named tokens.\n`,
  );
  process.exit(0);
}

process.stderr.write(
  `\n❌ lint-no-arbitrary-breakpoints: ${violations.length} arbitrary breakpoint violation(s) — ` +
    `use a named breakpoint token from @theme inline:\n\n`,
);
for (const v of violations) {
  process.stderr.write(
    `  ${v.file}:${v.line}  [arbitrary-breakpoint]  \`${v.snippet}\`  (${v.px}px)\n`,
  );
}
process.stderr.write(`\nNamed tokens currently available (packages/design/tokens/styles.css):\n`);
process.stderr.write(
  `  xs (420)  sm (640)  md (768)  lg (1024)  tight (1080)  shell (1180)  xl (1280)  2xl (1536)  3xl (1800)\n`,
);
process.stderr.write(`\nIf none of these fit, ADD a new --breakpoint-* token to @theme inline\n`);
process.stderr.write(
  `with a justification comment, then use it. Do NOT inline px breakpoints.\n\n`,
);
process.exit(1);
