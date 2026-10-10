#!/usr/bin/env node

// CI guard: the hover-motion contract (docs/design-system/hover-motion.md).
//
// The owner looked at the marketing site and said the hover motion was ugly in
// places. Two of those places were one family each: the ink Button turned the
// grey of a disabled control (its hover was the secondary-TEXT step), and the
// `npx create-sailor` box — not even a control — rose 4px into a heavy glass
// shadow over 500ms. Neither was a one-off; the audit behind this guard found
// the same moves in a hundred-odd class strings across the apps and the
// component library. So the moves that are mechanically recognisable are
// counted here, and the count may only go down.
//
// SHRINK-ONLY ratchet, same shape as lint-motion-tokens.mjs: today's remaining
// violations are enumerated per file in governance.config.json →
// hoverMotion.allowlist as {file, count}. A file over its count fails; a file
// under its count (or clean and still listed) fails as stale, so the list has
// to be shrunk in the same change that fixes the code.
//
// Rules — each is a move the contract forbids, written so a compliant class
// cannot match:
//
//   transition-all     `transition-all` / `transition: all`. Animates layout,
//                      shadows and colour together on any change; name the
//                      properties that are meant to move.
//   lift               a hover/focus-within lift of more than 2px
//                      (`hover:-translate-y-1`, `group-hover/x:-translate-y-2`…).
//                      Cards may rise `-translate-y-px` / `-translate-y-0.5`.
//   self-scale         `hover:scale-*` on the element itself. Controls do not
//                      grow under the pointer; press feedback is active:scale.
//   media-zoom         `group-hover:scale-*` above 1.03 — the image inside a
//                      card may drift 1.5–3%, not jump 10%.
//   dim                `hover:opacity-<100`. Dimming a control is how a
//                      disabled one looks; use the fill's hover step.
//   shadow-step        a hover shadow that is arbitrary, changes ramp family,
//                      or climbs more than one step from the resting shadow
//                      (product xs…2xl, ambient-*, glass-*). With no resting
//                      shadow in the same class list, only shadow-lg/xl/2xl count.
//                      A `0_0_0_Npx` hairline is a border, not a shadow.
//   raw-easing         `ease-[cubic-bezier(…)]`: use ease-out / ease-brand.
//   raw-duration       `duration-300` / `duration-[400ms]` in apps (the
//                      component library is governed by lint-motion-tokens).
//   framer-transform   `whileHover` that scales, rotates, or moves more than 2px.
//   css-touch-hover    a CSS `:hover` rule outside `@media (hover: hover)`:
//                      it sticks on touch screens after a tap. Tailwind's
//                      `hover:` is already guarded by recipe.css.
//
// What is NOT counted, on purpose: arrow nudges (`group-hover:translate-x-0.5`),
// reveals that return to rest (`group-hover:translate-y-0`), `hover:opacity-100`
// (revealing an affordance), active:scale press feedback, prose in comments.
//
// Run: node scripts/lint-hover-motion.mjs [--report]

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripComments } from "./lib/strip-comments.mjs";

const SCAN_ROOTS = ["apps", "packages/design/ui/src"];
const REPORT = process.argv.includes("--report");

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

// ── Rules ────────────────────────────────────────────────────────────────────

const HOVERISH = String.raw`(?:hover|group-hover(?:\/[\w-]+)?|peer-hover(?:\/[\w-]+)?|focus-within|group-focus-within(?:\/[\w-]+)?)`;
const B = String.raw`(?<![\w/-])`; // start of a class token (after a variant prefix colon is fine)

const CODE_RULES = {
  "transition-all": [/\btransition-all\b/g, /\btransition["']?\s*:\s*["'`]all\b/g],
  lift: [
    new RegExp(
      String.raw`(?:^|[\s"'\x60:])${HOVERISH}:-translate-y-(?!px\b|0\.5\b|0\b)[\w.[\]/()-]+`,
      "g",
    ),
  ],
  "self-scale": [new RegExp(String.raw`${B}hover:scale-(?!100\b)[\w.[\]]+`, "g")],
  "media-zoom": [],
  dim: [new RegExp(String.raw`${B}hover:opacity-(?:\d{1,2}|\[0?\.\d+\])(?![\w.])`, "g")],
  "raw-easing": [/\bease-\[(?:cubic-bezier|\d)/g],
  "raw-duration": [/\bduration-\d{2,4}\b/g, /\bduration-\[\d+m?s\]/g, /\[transition-duration:\d/g],
  "framer-transform": [
    /\bwhileHover\s*[=:]\s*\{\{?[^}]*\b(?:scale|rotate)\s*:/g,
    /\bwhileHover\s*[=:]\s*\{\{?[^}]*\b[xy]\s*:\s*-?(?:[3-9]|\d{2,})/g,
  ],
};

const MEDIA_ZOOM_RE = /group-hover(?:\/[\w-]+)?:scale-(\d+|\[(\d*\.?\d+)\])/g;

const RAMPS = {
  product: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
  ambient: ["none", "ambient-sm", "ambient-md", "ambient-lg"],
  glass: ["none", "glass-sm", "glass-md", "glass-lg"],
};
const SPECIAL_OK = /^(?:none|sheen|ambient-glow|glow-accent(?:-sm|-lg)?|glow-primary)$/;

function rampOf(step) {
  if (step === "none") return null;
  for (const [name, steps] of Object.entries(RAMPS)) {
    const i = steps.indexOf(step);
    if (i > 0) return { name, i };
  }
  return undefined; // arbitrary / colour / unknown
}

/** Count shadow-step violations across the string literals of one file. */
function shadowStepViolations(src) {
  const literals = [];
  for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const line = src.slice(0, m.index).split("\n").length;
    literals.push({ text: m[2], line });
  }
  let n = 0;
  const HOVER_SHADOW = /(?:^|\s)(?:hover|group-hover(?:\/[\w-]+)?):shadow-([^\s"'`]+)/g;
  const BASE_SHADOW = /(?:^|\s)shadow-([\w-]+|\[[^\]\s]+\])(?=\s|$)/g;
  for (const lit of literals) {
    for (const h of lit.text.matchAll(HOVER_SHADOW)) {
      const step = h[1];
      if (SPECIAL_OK.test(step)) continue;
      if (/^\[0_0_0_/.test(step)) continue; // hairline ring drawn with box-shadow
      if (/^[a-z]+(?:-\d+)?\/\d+$|^(?:primary|foreground|border|black|white)/.test(step)) {
        continue; // a colour modifier (hover:shadow-primary/20), not a size step
      }
      const to = rampOf(step);
      if (!to) {
        n++;
        continue;
      }
      // Resting shadow: same literal first, then literals within 4 lines
      // (cn("…shadow-sm…", "hover:shadow-md") is one class list split in two).
      let base = null;
      const near = [lit, ...literals.filter((l) => l !== lit && Math.abs(l.line - lit.line) <= 4)];
      for (const l of near) {
        for (const b of l.text.matchAll(BASE_SHADOW)) {
          const r = rampOf(b[1]);
          if (r) {
            base = r;
            break;
          }
        }
        if (base) break;
      }
      if (!base) {
        // No resting shadow in sight — it may come from a variant, a prop or a
        // recipe the scan cannot follow. Only the heavy generic steps (lg, xl,
        // 2xl) are certain: the ambient/glass lg is designed as a hover step.
        if (to.name === "product" && to.i >= 4) n++;
        continue;
      }
      if (base.name !== to.name || to.i - base.i > 1) n++;
    }
  }
  return n;
}

function codeViolations(file, src) {
  const out = {};
  const add = (k, c) => {
    if (c) out[k] = (out[k] ?? 0) + c;
  };
  const isUi = file.startsWith("packages/design/ui/");
  for (const [rule, res] of Object.entries(CODE_RULES)) {
    if (rule === "raw-duration" && isUi) continue;
    for (const re of res) {
      re.lastIndex = 0;
      add(rule, (src.match(re) ?? []).length);
    }
  }
  for (const m of src.matchAll(MEDIA_ZOOM_RE)) {
    const v = m[2] !== undefined ? Number(m[2]) : Number(m[1]) / 100;
    if (v > 1.03) add("media-zoom", 1);
  }
  add("shadow-step", shadowStepViolations(src));
  return out;
}

function cssViolations(src) {
  const out = {};
  const transitionAll = (src.match(/\btransition(?:-property)?\s*:\s*all\b/g) ?? []).length;
  // :hover selectors outside an @media block that tests (hover: hover).
  let unguarded = 0;
  const stack = [];
  let selector = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      const head = selector.trim();
      const guarded = /@media[^{]*\(\s*hover\s*:\s*hover\s*\)/.test(head);
      if (/:hover\b/.test(head) && !head.startsWith("@") && !stack.includes(true)) unguarded++;
      stack.push(guarded);
      selector = "";
    } else if (c === "}") {
      stack.pop();
      selector = "";
    } else if (c === ";") {
      selector = "";
    } else {
      selector += c;
    }
  }
  if (transitionAll) out["transition-all"] = transitionAll;
  if (unguarded) out["css-touch-hover"] = unguarded;
  return out;
}

// ── Collect ──────────────────────────────────────────────────────────────────

const files = sh(
  `find ${SCAN_ROOTS.join(" ")} -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \\) ` +
    `-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.next/*' -not -path '*/.turbo/*' ` +
    `-not -path '*/out/*' -not -path '*/.open-next/*' -not -path '*/public/*' -not -path 'apps/storybook/*' ` +
    `-not -name '*.stories.tsx' -not -name '*.test.ts' -not -name '*.test.tsx' -not -path '*/__tests__/*' ` +
    `-not -name '*.d.ts'`,
)
  .split("\n")
  .filter(Boolean)
  // apps/<name>/src only — config files and scripts carry no hover.
  .filter((f) => f.startsWith("packages/") || /^apps\/[^/]+\/src\//.test(f));

const actual = new Map();
const byRule = {};
for (const file of files) {
  const src = stripComments(readFileSync(file, "utf-8"));
  const v = file.endsWith(".css") ? cssViolations(src) : codeViolations(file, src);
  const count = Object.values(v).reduce((a, b) => a + b, 0);
  if (count > 0) actual.set(file, { count, v });
  for (const [k, c] of Object.entries(v)) byRule[k] = (byRule[k] ?? 0) + c;
}

if (REPORT) {
  const total = [...actual.values()].reduce((a, b) => a + b.count, 0);
  process.stdout.write(`${total} violation(s) in ${actual.size} file(s)\n`);
  for (const [k, c] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`  ${k.padEnd(18)} ${c}\n`);
  }
  if (process.argv.includes("--files")) {
    for (const [f, { v }] of [...actual].sort())
      process.stdout.write(`${f} ${JSON.stringify(v)}\n`);
  }
  if (process.argv.includes("--json")) {
    const list = [...actual]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, { count }]) => ({ file, count }));
    process.stdout.write(`${JSON.stringify(list, null, 2)}\n`);
  }
  process.exit(0);
}

// ── Compare with the shrink-only allowlist ───────────────────────────────────

const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "governance.config.json"), "utf-8"));
if (!Array.isArray(cfg.hoverMotion?.allowlist)) {
  process.stderr.write("❌ governance.config.json is missing a hoverMotion.allowlist array.\n");
  process.exit(1);
}
const allowed = new Map(cfg.hoverMotion.allowlist.map((e) => [e.file, e.count]));

const over = [];
const stale = [];
for (const [file, { count, v }] of actual) {
  const a = allowed.get(file) ?? 0;
  if (count > a) over.push({ file, count, a, v });
  else if (count < a) stale.push({ file, count, a });
}
for (const [file, a] of allowed) if (!actual.has(file)) stale.push({ file, count: 0, a });

if (over.length === 0 && stale.length === 0) {
  const total = [...actual.values()].reduce((a, b) => a + b.count, 0);
  process.stdout.write(
    `✅ Hover-motion ratchet holds: ${total} pre-existing violation(s) across ${actual.size} file(s), exactly matching the allowlist.\n`,
  );
  process.exit(0);
}

if (over.length) {
  process.stderr.write(
    `\n❌ ${over.length} file(s) break the hover-motion contract (docs/design-system/hover-motion.md):\n` +
      "   buttons and inline controls change colour, not position or size; a clickable card may rise\n" +
      "   ≤2px and take ONE shadow step; never transition-all, hover:opacity dimming, raw cubic-bezier\n" +
      "   or raw ms; CSS :hover lives inside @media (hover: hover).\n\n",
  );
  for (const o of over) {
    process.stderr.write(`  ${o.file}: ${o.count} found, ${o.a} allowed  ${JSON.stringify(o.v)}\n`);
  }
}
if (stale.length) {
  process.stderr.write(
    `\n❌ ${stale.length} hoverMotion.allowlist entr${stale.length === 1 ? "y is" : "ies are"} stale — shrink governance.config.json to match:\n\n`,
  );
  for (const s of stale)
    process.stderr.write(`  ${s.file}: allowlist says ${s.a}, actual is ${s.count}\n`);
}
process.stderr.write("\n");
process.exit(1);
