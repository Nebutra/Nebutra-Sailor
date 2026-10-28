#!/usr/bin/env node

// CI guard: the design system's class names use LOGICAL direction, not physical.
//
// `ml-2` / `text-left` / `rounded-l` / `left-0` pin a side of the screen. Under
// dir="rtl" the side that should flex is the inline-start/end one, so a library
// component written with the physical class is wrong for Arabic, Hebrew and
// Persian readers and right only by accident for everyone else. The logical
// utilities (`ms-2`, `text-start`, `rounded-s`, `start-0`) render identically in
// LTR and flip for free in RTL, so there is nothing to trade for them.
//
// Counted, inside any string literal (className="…", cn("…"), cva variants,
// template literals), after stripping variants (`md:`, `data-[x]:`, `!`, `-`):
//   ml-/mr-/pl-/pr-          margin/padding             → ms-/me-/ps-/pe-
//   left-/right-             inset                      → start-/end-
//   text-left / text-right   alignment                  → text-start / text-end
//   rounded-l|r|tl|tr|bl|br  radius                     → rounded-s|e|ss|se|es|ee
//   border-l / border-r      border                     → border-s / border-e
//   float-left|right, clear-left|right                  → float-start|end, clear-start|end
//   scroll-ml|mr|pl|pr-      scroll margin/padding      → scroll-ms|me|ps|pe-
//
// Not counted, on purpose:
//   • `left-1/2` and friends in a literal that also centres with translate-x,
//     slide-in/out or inset-x: that pairing is symmetric, flipping it would
//     move the thing off-centre, not mirror it.
//   • a line carrying `// allow-physical: <reason>` (or `{/* allow-physical: … */}`),
//     on the same line or the line above. The reason is required: a bare marker
//     does not count. Use it for geometry that is physical by nature — a
//     toggle thumb, a progress bar that always fills left to right, a map.
//   • stories and tests, which demonstrate the classes on purpose.
//
// SHRINK-ONLY ratchet (governance.config.json → logicalDirection.allowlist),
// same contract as lint-no-title-tooltips: a file may only drop off the list or
// have its count go down, and a stale entry fails too. Scope:
// packages/design/ui/src and apps/design/src, .ts and .tsx.
//
// Run:   node scripts/lint-logical-direction.mjs
//        node scripts/lint-logical-direction.mjs --prune           shrink the allowlist to today's counts (never adds or grows)
//        node scripts/lint-logical-direction.mjs --list            print every counted class with file:line
//        node scripts/lint-logical-direction.mjs --report-inline   report-only: inline style physical properties in .tsx (not a gate)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { listSourceFiles, runCountRatchet } from "./lib/jsx-count-ratchet.mjs";
import { stripComments } from "./lib/strip-comments.mjs";

const ROOTS = ["packages/design/ui/src", "apps/design/src"];
const KEY = "logicalDirection";

// Spacing and inset utilities take a number, px, auto, full, an arbitrary [..]/(..) value or
// a template hole. Requiring one keeps prose ("right-to-left", "right-aligns") out of the count.
const VALUE = String.raw`(?:\d|px\b|auto\b|full\b|\[|\(|\$)`;
const PHYSICAL = [
  new RegExp(`^(?:scroll-)?(?:ml|mr|pl|pr)-${VALUE}`),
  new RegExp(`^(?:left|right)-${VALUE}`),
  /^text-(?:left|right)$/,
  /^rounded-(?:l|r|tl|tr|bl|br)(?:-|$)/,
  /^border-(?:l|r)(?:-|$)/,
  /^(?:float|clear)-(?:left|right)$/,
];
const INSET_RE = new RegExp(`^(?:left|right)-${VALUE}`);
// A literal that centres or slides symmetrically excuses its left-/right- inset.
const CENTRED_RE = /(?:^|[\s:"'`])-?(?:translate-x|slide-in|slide-out|inset-x)/;
const ALLOW_RE = /allow-physical:\s*\S/;

function files() {
  return listSourceFiles(ROOTS, { extensions: [".ts", ".tsx"] }).filter(
    (f) => !/\.stories\.tsx?$/.test(f) && !f.endsWith(".d.ts"),
  );
}

/** Strip variants (`md:`, `data-[x=y]:`), `!` and a negative sign; what is left is the utility. */
function baseUtility(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === ":" && depth === 0) cut = i;
  }
  return token
    .slice(cut + 1)
    .replace(/^!/, "")
    .replace(/!$/, "")
    .replace(/^-/, "");
}

// A string literal. Single quotes must not follow a word character, or the
// apostrophe in JSX text ("don't") opens a string that swallows a real className.
const LITERAL_RE = /"(?:[^"\\\n]|\\.)*"|(?<!\w)'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

/** Physical class tokens in one file: [{ token, line }], exemptions applied. */
export function physicalClasses(raw) {
  const src = stripComments(raw);
  const rawLines = raw.split("\n");
  const found = [];
  for (const match of src.matchAll(LITERAL_RE)) {
    const literal = match[0];
    const centred = CENTRED_RE.test(literal);
    for (const t of literal.matchAll(/[^\s"'`{}(),;?]+/g)) {
      const util = baseUtility(t[0]);
      if (!PHYSICAL.some((re) => re.test(util))) continue;
      if (centred && INSET_RE.test(util)) continue;
      const offset = match.index + t.index;
      const line = src.slice(0, offset).split("\n").length; // 1-based
      const here = rawLines[line - 1] ?? "";
      const above = rawLines[line - 2] ?? "";
      if (ALLOW_RE.test(here) || ALLOW_RE.test(above)) continue;
      found.push({ token: t[0], line });
    }
  }
  return found;
}

// ── --report-inline: inline style physical properties (report only) ──────────
const INLINE_KEY =
  /(?:^|[\s,{])(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft\w*|borderRight\w*|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius|left|right)\s*:/g;
const INLINE_ALIGN = /(?:^|[\s,{])(textAlign|float|clear)\s*:\s*["'](left|right)["']/g;

function balancedObject(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return "";
}

function inlineStyleHits(raw) {
  const src = stripComments(raw);
  const hits = [];
  const starts = [
    ...src.matchAll(/\bstyle=\{\{/g),
    ...src.matchAll(/:\s*(?:React\.)?CSSProperties\s*=\s*\{/g),
  ];
  for (const s of starts) {
    const open = src.indexOf("{", s.index + (s[0].startsWith("style") ? 6 : 0));
    const body = balancedObject(src, open);
    const line = src.slice(0, s.index).split("\n").length;
    for (const m of body.matchAll(INLINE_KEY)) hits.push({ prop: m[1], line });
    for (const m of body.matchAll(INLINE_ALIGN)) hits.push({ prop: `${m[1]}: ${m[2]}`, line });
  }
  return hits;
}

if (process.argv.includes("--report-inline")) {
  const byFile = new Map();
  for (const file of files().filter((f) => f.endsWith(".tsx"))) {
    const hits = inlineStyleHits(readFileSync(file, "utf-8"));
    if (hits.length) byFile.set(file, hits);
  }
  let total = 0;
  for (const [file, hits] of byFile) {
    total += hits.length;
    process.stdout.write(`${file}: ${hits.length}\n`);
    for (const h of hits) process.stdout.write(`    L${h.line} ${h.prop}\n`);
  }
  process.stdout.write(
    `\nInline style physical properties (report only, not gated): ${total} across ${byFile.size} file(s).\n`,
  );
  process.exit(0);
}

// ── ratchet ──────────────────────────────────────────────────────────────────
const counts = new Map();
for (const file of files()) {
  const hits = physicalClasses(readFileSync(file, "utf-8"));
  if (hits.length > 0) counts.set(file, hits.length);
  if (process.argv.includes("--list")) {
    for (const h of hits) process.stdout.write(`${file}:${h.line} ${h.token}\n`);
  }
}
if (process.argv.includes("--list")) process.exit(0);

if (process.argv.includes("--prune")) {
  const cfgPath = resolve(process.cwd(), "governance.config.json");
  const text = readFileSync(cfgPath, "utf-8");
  const before = JSON.parse(text)[KEY].allowlist;
  const after = [];
  for (const entry of before) {
    const n = Math.min(entry.count, counts.get(entry.file) ?? 0);
    if (n > 0) after.push({ file: entry.file, count: n });
  }
  // Only ever shrinks: a file or count that is not already listed is a violation to
  // fix, not a baseline to record.
  // Rewrite just this section as text so the rest of the file keeps its formatting.
  const start = text.indexOf(`"${KEY}"`);
  const tail = text.slice(start);
  const block = /"allowlist": (?:\[\]|\[\n[\s\S]*?\n {4}\])/.exec(tail);
  const body = after.length === 0 ? "[]" : JSON.stringify(after, null, 2).replace(/\n/g, "\n    ");
  const next =
    text.slice(0, start) +
    tail.slice(0, block.index) +
    `"allowlist": ${body}` +
    tail.slice(block.index + block[0].length);
  writeFileSync(cfgPath, next);
  const sum = (list) => list.reduce((a, e) => a + e.count, 0);
  process.stdout.write(
    `${KEY}: pruned ${before.length} → ${after.length} file(s), ${sum(before)} → ${sum(after)} allowed.\n`,
  );
}

runCountRatchet({
  key: KEY,
  what: "physical-direction classes",
  roots: ROOTS,
  files: [...counts.keys()],
  count: (file) => counts.get(file) ?? 0,
  fix: [
    "  • ml-/mr-/pl-/pr- → ms-/me-/ps-/pe-          • left-/right- → start-/end-",
    "  • text-left/right → text-start/end            • rounded-l/r → rounded-s/e (tl/tr/bl/br → ss/se/es/ee)",
    "  • border-l/r → border-s/e                     • float-left/right → float-start/end",
    "  • Physical by nature (toggle thumb, left-to-right fill, map)? Add `// allow-physical: <reason>`",
    "    on the line or the line above. A bare marker without a reason is ignored.",
    "  • After migrating a listed file: node scripts/lint-logical-direction.mjs --prune",
  ].join("\n"),
});
