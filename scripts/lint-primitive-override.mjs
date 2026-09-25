#!/usr/bin/env node
/**
 * Don't fight a shared primitive through className — use (or add) its variant.
 *
 * `<Textarea className="border-0 bg-transparent shadow-none">` strips the
 * frame but not the focus ring (PARA's box-in-a-box); seventeen landing cards
 * typed `border-border/60 shadow-none`; every auth input retyped
 * `h-12 … shadow-none`. Each is a variant the primitive either had
 * (Input/Textarea tone="bare", size="lg", Button variant="ghost") or should
 * grow. A className that erases the primitive's own surface is the signal.
 *
 * Checks JSX opening tags of @nebutra/ui primitives for surface-erasing
 * classes. SHRINK-ONLY via governance.config.json → primitiveOverride.allowlist.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.open-next|storybook-static|__tests__|coverage)(\/|$)/;
const SKIP_FILE = /(\.stories\.|\.test\.|\.spec\.)/;
const PRIMITIVES = ["Card", "Input", "Textarea", "Button", "Badge", "SelectTrigger"];
const ERASE =
  /(?:^|\s)(shadow-none|border-0|border-none|bg-transparent|ring-0|focus-visible:ring-0|focus:ring-0)(?=\s|$)/;
const FIX = {
  Input: 'tone="bare"',
  Textarea: 'tone="bare"',
  Button: 'variant="ghost" / variant="outline"',
  Card: "the House card is already flat — drop the override",
  Badge: 'variant="outline"',
  SelectTrigger: "a Select tone (add one to the primitive)",
};

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
      const rel = relative(ROOT, file);
      if (rel.startsWith("packages/design/ui/src/primitives/")) continue; // primitives compose themselves
      const src = readFileSync(file, "utf8");
      if (!/@nebutra\/ui/.test(src)) continue;
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        const cls = /className=(?:"([^"]*)"|\{cn\(\s*"([^"]*)")/.exec(line);
        const value = cls?.[1] ?? cls?.[2];
        if (!value || !ERASE.test(value)) return;
        // owning tag: nearest opening tag at or above this line
        let j = i;
        while (j >= 0 && j > i - 25 && !/<[A-Z][\w.]*/.test(lines[j])) j--;
        const tag = /<([A-Z][\w.]*)/.exec(lines[j] ?? "")?.[1];
        if (!tag || !PRIMITIVES.includes(tag)) return;
        if (/allow-primitive-override:/.test(lines[j - 1] ?? "")) return;
        hits.set(rel, [...(hits.get(rel) ?? []), `${i + 1} <${tag}> ${ERASE.exec(value)[1]}`]);
      });
    }
  }
  return hits;
}

if (process.argv[1] === import.meta.filename) {
  const hits = scan();
  if (process.argv.includes("--list")) {
    for (const [f, hs] of [...hits].sort()) for (const h of hs) console.log(`${f}:${h}`);
    process.exit(0);
  }
  const config = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8"));
  const allow = Object.fromEntries(
    (config.primitiveOverride?.allowlist ?? []).map((e) => [e.file, e.count]),
  );
  const fresh = [...hits].filter(([f, hs]) => hs.length > (allow[f] ?? 0));
  const stale = Object.entries(allow).filter(([f, n]) => (hits.get(f)?.length ?? 0) < n);
  if (fresh.length) {
    console.error("❌ className erases a shared primitive's own surface — use its variant:");
    for (const [f, hs] of fresh)
      for (const h of hs) console.error(`   ${f}:${h}  → ${FIX[/<(\w+)>/.exec(h)[1]]}`);
  }
  if (stale.length) {
    console.error("❌ primitiveOverride.allowlist is stale (shrink-only) — lower or remove:");
    for (const [f, n] of stale)
      console.error(`   ${f}: allowed ${n}, found ${hits.get(f)?.length ?? 0}`);
  }
  if (fresh.length || stale.length) process.exit(1);
  console.log(`✓ primitive-override: ${Object.keys(allow).length} allowlisted file(s), 0 new.`);
}
