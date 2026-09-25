#!/usr/bin/env node
/**
 * A state change may recolour an element; it may not resize it.
 *
 * `isActive ? "font-semibold" : "font-medium"` makes the label wider when it
 * becomes active, so everything after it moves: PARA's selected segment and
 * the onboarding stepper both jumped this way. State branches may change
 * colour, background, opacity and shadow — never font weight/size, padding,
 * letter-spacing or border width. Keep those in the base class.
 *
 * Checks single-line `<state> ? "a" : "b"` and `<state> && "a"` where <state>
 * reads as UI state (active, selected, current, pressed, checked, open, …).
 * SHRINK-ONLY via governance.config.json → stateShift.allowlist.
 * Exempt a line with `// allow-state-shift: <reason>` above it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SKIP_DIR = /(^|\/)(node_modules|dist|build|\.next|storybook-static|__tests__|coverage)(\/|$)/;
const SKIP_FILE = /(\.stories\.|\.test\.|\.spec\.)/;
const STATE = String.raw`(?:!?\s*(?:is|has)?(?:Active|Selected|Current|Pressed|Checked|Open|Expanded|On)\b|!?\s*(?:active|selected|current|pressed|checked|expanded)\b|\w+\s*===\s*(?:current\w*|active\w*|selected\w*|value)\b)`;
const TERNARY = new RegExp(`${STATE}\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"`, "g");
const AND = new RegExp(`${STATE}\\s*&&\\s*"([^"]*)"`, "g");
const LAYOUT =
  /(?:^|\s)(?:[a-z-]+:)*(font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|text-(?:2xs|xs|ui|sm|base|lg|[2-9]?xl|body|label|meta|display|\[\d)|tracking-[\w[\].-]+|p[xytrbl]?-[\w[\].-]+|border(?:-[xytrbl])?-(?:\d|\[\d))/g;

const layoutOf = (s) => new Set([...s.matchAll(LAYOUT)].map((m) => m[1]));

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP_DIR.test(relative(ROOT, p))) continue;
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|jsx)$/.test(name) && !SKIP_FILE.test(name)) yield p;
  }
}

export function scan() {
  const hits = new Map();
  for (const base of ["apps", "packages"]) {
    for (const file of files(join(ROOT, base))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/allow-state-shift:/.test(lines[i - 1] ?? "")) return;
        let bad = false;
        for (const [, a, b] of line.matchAll(TERNARY)) {
          const la = layoutOf(a);
          const lb = layoutOf(b);
          if ([...la].some((c) => !lb.has(c)) || [...lb].some((c) => !la.has(c))) bad = true;
        }
        for (const [, a] of line.matchAll(AND)) if (layoutOf(a).size) bad = true;
        if (!bad) return;
        const rel = relative(ROOT, file);
        hits.set(rel, [...(hits.get(rel) ?? []), i + 1]);
      });
    }
  }
  return hits;
}

if (process.argv[1] === import.meta.filename) {
  const hits = scan();
  if (process.argv.includes("--list")) {
    for (const [f, ls] of [...hits].sort()) console.log(`${ls.length}\t${f}:${ls.join(",")}`);
    process.exit(0);
  }
  const config = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8"));
  const allow = Object.fromEntries(
    (config.stateShift?.allowlist ?? []).map((e) => [e.file, e.count]),
  );
  const fresh = [...hits].filter(([f, ls]) => ls.length > (allow[f] ?? 0));
  const stale = Object.entries(allow).filter(([f, n]) => (hits.get(f)?.length ?? 0) < n);
  if (fresh.length) {
    console.error("❌ A state branch changes layout (weight/size/padding/tracking/border width):");
    for (const [f, ls] of fresh)
      console.error(`   ${f}:${ls.join(",")} (allowed ${allow[f] ?? 0})`);
    console.error("   Move the layout class to the base and vary only colour/background/opacity.");
  }
  if (stale.length) {
    console.error("❌ stateShift.allowlist is stale (shrink-only) — lower or remove:");
    for (const [f, n] of stale)
      console.error(`   ${f}: allowed ${n}, found ${hits.get(f)?.length ?? 0}`);
  }
  if (fresh.length || stale.length) process.exit(1);
  console.log(`✓ state-shift: ${Object.keys(allow).length} allowlisted file(s), 0 new.`);
}
