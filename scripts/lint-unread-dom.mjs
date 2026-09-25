#!/usr/bin/env node
/**
 * State written onto <html> must have a reader.
 *
 * apps/web's Appearance panel shipped three settings that wrote to the root
 * element — data-accent, --user-contrast, .motion-allow — which no stylesheet
 * or script read. The user picked a value and nothing changed; nothing in the
 * build said so. lint-inert-dimensions covers Brand Package dimensions, not
 * the state an app writes itself, so this guards that half.
 *
 * In every file that touches document.documentElement, each literal write
 *   <x>.dataset.name = …   <x>.setAttribute("data-name", …)
 *   <x>.classList.add|toggle("name", …)   <x>.style.setProperty("--name", …)
 * must be read somewhere else in apps/ or packages/:
 *   data-name / [data-name / data-[name / dataset.name (read)
 *   .name / classList.contains("name")   var(--name / getPropertyValue("--name")
 * Dynamic names (template literals, variables) are not judged.
 * Exempt a write with `// allow-unread-dom: <reason>` on the line above.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.open-next|\.turbo|storybook-static|coverage|__tests__)(\/|$)/;
const SKIP_FILE = /(\.test\.|\.spec\.|\.d\.ts$)/;

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(ROOT, p);
    if (SKIP_DIR.test(rel)) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|mjs|css)$/.test(name) && !SKIP_FILE.test(name)) files.push(rel);
  }
}
walk(join(ROOT, "apps"));
walk(join(ROOT, "packages"));

/**
 * Comments are not readers: a doc comment naming "data-accent" is exactly how
 * the dead accent switch looked read. Strip block and line comments (keeping
 * line count, so write positions stay right) before anything is matched.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

const raw = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const text = new Map([...raw].map(([f, src]) => [f, stripComments(src)]));

const WRITES = [
  { kind: "data", re: /\.dataset\.([A-Za-z]\w*)\s*=(?!=)/g, name: (m) => m[1] },
  { kind: "data", re: /\.setAttribute\(\s*["']data-([\w-]+)["']/g, name: (m) => m[1] },
  { kind: "class", re: /\.classList\.(?:add|toggle)\(\s*["']([\w-]+)["']/g, name: (m) => m[1] },
  { kind: "var", re: /\.style\.setProperty\(\s*["'](--[\w-]+)["']/g, name: (m) => m[1] },
];

const kebab = (camel) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function readers(kind, name) {
  if (kind === "data") {
    const k = kebab(name);
    return [
      new RegExp(`data-${esc(k)}(?![\\w-])`),
      new RegExp(`data-\\[${esc(k)}`),
      new RegExp(`dataset\\.${esc(camel(k))}\\b(?!\\s*=(?!=))`),
    ];
  }
  if (kind === "class") {
    return [
      new RegExp(`\\.${esc(name)}(?![\\w-])`),
      new RegExp(`classList\\.contains\\(\\s*["']${esc(name)}["']`),
    ];
  }
  return [
    new RegExp(`var\\(\\s*${esc(name)}(?![\\w-])`),
    new RegExp(`["']${esc(name)}["']\\s*\\)`),
  ];
}

const problems = [];
for (const [file, src] of text) {
  if (!src.includes("document.documentElement")) continue;
  const lines = src.split("\n");
  const rawLines = raw.get(file).split("\n");
  for (const { kind, re, name } of WRITES) {
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split("\n").length;
      if (/allow-unread-dom:/.test(rawLines[line - 2] ?? "")) continue;
      const n = name(m);
      const pats = readers(kind, n);
      const read = [...text].some(([other, body]) => {
        const scan =
          other === file
            ? body
                .split("\n")
                .filter((_, i) => !WRITES.some((w) => new RegExp(w.re.source).test(lines[i] ?? "")))
                .join("\n")
            : body;
        return pats.some((p) => p.test(scan));
      });
      if (!read)
        problems.push(`${file}:${line}  ${kind} "${n}" is written to <html> and read nowhere`);
    }
  }
}

if (problems.length) {
  console.error("❌ unread DOM state — a setting that writes to <html> must have a reader:");
  for (const p of problems) console.error(`   ${p}`);
  console.error(
    "   Wire a reader (CSS / script), delete the write, or `// allow-unread-dom: <reason>`.",
  );
  process.exit(1);
}
console.log("✓ unread-dom: every literal write to <html> has a reader.");
