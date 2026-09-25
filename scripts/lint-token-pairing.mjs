#!/usr/bin/env node
/**
 * A token-driven fill carries its own foreground token; pair them.
 *
 * `bg-primary text-white` reads correctly only while --primary happens to be a
 * dark colour. When the House primary became ink (near-white in dark mode) and
 * whenever a Brand Package retunes a role, every literal foreground on a token
 * fill goes invisible — the sign-in button and PARA's Generate chip both did.
 * Use the fill's `-foreground` token instead (bg-primary → text-primary-foreground).
 *
 * Scans className strings in apps/** and packages/** for a token fill and a
 * literal foreground in the same string. SHRINK-ONLY: governance.config.json →
 * tokenPairing.allowlist lists existing offenders, migrated on touch.
 * Exempt a line with `// allow-literal-foreground: <reason>` above it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SCAN = ["apps", "packages"];
const SKIP_DIR = /(^|\/)(node_modules|dist|build|\.next|storybook-static|__tests__|coverage)(\/|$)/;
const SKIP_FILE = /(\.stories\.|\.test\.|\.spec\.|global-error\.tsx$)/;

const FILL =
  /(?:^|[\s"'`])(?:[a-z-]+:)*bg-(?:primary|foreground|accent|secondary|destructive|success|warning|info|brand-[a-z-]+|card|popover|muted|\[hsl\(var\(--[a-z-]+\)\)\]|\[var\(--[a-z0-9-]+\)\])(?:\/\d+)?(?=[\s"'`]|$)/;
const LITERAL_FG =
  /(?:^|[\s"'`])(?:[a-z-]+:)*(?:text-white|text-black|fill-white|stroke-white|text-\[#[0-9a-fA-F]{3,8}\])(?=[\s"'`/]|$)/;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(ROOT, p);
    if (SKIP_DIR.test(rel)) continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* files(p);
    else if (/\.(tsx|jsx)$/.test(name) && !SKIP_FILE.test(name)) yield p;
  }
}

export function scan() {
  const hits = new Map();
  for (const base of SCAN) {
    for (const file of files(join(ROOT, base))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!FILL.test(line) || !LITERAL_FG.test(line)) return;
        if (/allow-literal-foreground:/.test(lines[i - 1] ?? "")) return;
        const rel = relative(ROOT, file);
        hits.set(rel, (hits.get(rel) ?? 0) + 1);
      });
    }
  }
  return hits;
}

/**
 * The inverse fault: a status FILL used as ink. --destructive, --warning and
 * --success are tuned to sit under their -foreground; as text or an icon
 * stroke amber reads 2.0:1 in light and red 2.5:1 in dark. The ink variants
 * are text-/fill-/stroke-{destructive,warning,success}-strong (~5:1 both
 * themes). 221 call sites had it the wrong way round on 2026-09-25.
 * Exempt a line with `// allow-status-fill-ink: <reason>` above it.
 */
const STATUS_INK =
  /(?<![\w-])(?:[\w[\]=&:.-]+:)*(?:text|fill|stroke)-(?:destructive|warning|success)(?![\w-])/;

export function scanStatusInk() {
  const hits = [];
  for (const base of SCAN) {
    for (const file of files(join(ROOT, base))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!STATUS_INK.test(line)) return;
        if (/allow-status-fill-ink:/.test(lines[i - 1] ?? "")) return;
        hits.push(`${relative(ROOT, file)}:${i + 1}`);
      });
    }
  }
  return hits;
}

if (process.argv[1] === import.meta.filename) {
  const ink = scanStatusInk();
  if (ink.length) {
    console.error(
      "❌ Status fill used as ink — use text-/fill-/stroke-{destructive,warning,success}-strong:",
    );
    for (const h of ink) console.error(`   ${h}`);
  }
  const config = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8"));
  const allow = Object.fromEntries(
    (config.tokenPairing?.allowlist ?? []).map((e) => [e.file, e.count]),
  );
  const hits = scan();
  const fresh = [...hits].filter(([f, n]) => n > (allow[f] ?? 0));
  const stale = Object.entries(allow).filter(([f, n]) => (hits.get(f) ?? 0) < n);
  if (process.argv.includes("--list")) {
    for (const [f, n] of [...hits].sort()) console.log(`${n}\t${f}`);
    process.exit(0);
  }
  if (fresh.length) {
    console.error("❌ Literal foreground on a token fill — use the fill's -foreground token:");
    for (const [f, n] of fresh) console.error(`   ${f}: ${n} (allowed ${allow[f] ?? 0})`);
  }
  if (stale.length) {
    console.error("❌ tokenPairing.allowlist is stale (shrink-only) — lower or remove:");
    for (const [f, n] of stale) console.error(`   ${f}: allowed ${n}, found ${hits.get(f) ?? 0}`);
  }
  if (fresh.length || stale.length || ink.length) process.exit(1);
  console.log(`✓ token-pairing: ${hits.size} allowlisted file(s), 0 new.`);
}
