#!/usr/bin/env node
/**
 * CI guard: every message key the code asks for exists in the English source.
 *
 * next-intl does not fail a build on a missing key. It renders the key path
 * ("navigation.orgSwitcher.selectOrg") and logs a warning nobody reads — the
 * dashboard's organisation switcher shipped that way, reading a namespace no
 * catalog defined. This resolves every statically knowable lookup:
 *
 *   const t = useTranslations("ns")        →  t("a.b")  t.rich("a")  t.raw("a")  t.markup("a")
 *   const t = await getTranslations("ns")  /  getTranslations({ namespace: "ns", … })
 *
 * against the app's catalog. Template-literal keys and `t.has()` probes are
 * dynamic by intent and skipped; a lookup through a translator passed in as a
 * prop is invisible here (that is what the runtime fallback is for).
 *
 * Run: node scripts/lint-i18n-keys.mjs [--json]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { flatten, REPO_ROOT } from "./lib/i18n-catalog.mjs";
import { stripComments } from "./lib/strip-comments.mjs";

/** Which catalog each app's code reads. */
export const SURFACES = [
  { root: "apps/landing/src", catalog: "apps/landing/messages/en.json" },
  { root: "apps/forge/src", catalog: "apps/forge/messages/en.json" },
  { root: "apps/router/src", catalog: "apps/router/messages/en.json" },
  { root: "apps/web/src", catalog: "packages/platform/i18n/locales/en.json" },
  { root: "apps/auth/src", catalog: "packages/platform/i18n/locales/en.json" },
];

const BINDING =
  /\b(?:const|let)\s+(\w+)\s*=\s*\(?\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([\w.-]*)["'`]|\{[^}]*?namespace:\s*["'`]([\w.-]+)["'`][^}]*\})?\s*\)/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mts)$/.test(name) && !/\.(test|spec|stories)\.tsx?$/.test(name))
      out.push(path);
  }
  return out;
}

/** Leaf keys plus every intermediate path (t.raw / t.rich may read a subtree). */
function keySet(enPath) {
  const keys = new Set();
  for (const key of flatten(JSON.parse(readFileSync(enPath, "utf8"))).keys()) {
    const parts = key.split(".");
    for (let i = 1; i <= parts.length; i++) keys.add(parts.slice(0, i).join("."));
  }
  return keys;
}

/** Missing lookups in one source text. Exported for the guard's own tests. */
export function findMissing(source, keys) {
  const code = stripComments(source);
  const missing = [];
  const bindings = [...code.matchAll(BINDING)];
  bindings.forEach((m, i) => {
    const [, name, ns1, ns2] = m;
    const namespace = ns1 ?? ns2 ?? "";
    if (namespace && !keys.has(namespace)) {
      missing.push(namespace);
      return;
    }
    // A translator's scope runs until the same name is bound again — the
    // usual shape is `t` in generateMetadata, then a different `t` in the page.
    const next = bindings.slice(i + 1).find((b) => b[1] === name);
    const region = code.slice(m.index, next ? next.index : code.length);
    const call = new RegExp(`\\b${name}(?:\\.(?:rich|raw|markup))?\\(\\s*["']([\\w.-]+)["']`, "g");
    for (const c of region.matchAll(call)) {
      const full = namespace ? `${namespace}.${c[1]}` : c[1];
      if (!keys.has(full)) missing.push(full);
    }
  });
  return [...new Set(missing)];
}

function main() {
  const report = [];
  for (const surface of SURFACES) {
    const keys = keySet(join(REPO_ROOT, surface.catalog));
    for (const file of walk(join(REPO_ROOT, surface.root))) {
      const missing = findMissing(readFileSync(file, "utf8"), keys);
      if (missing.length) report.push({ file: relative(REPO_ROOT, file), missing });
    }
  }
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
  if (report.length === 0) {
    process.stdout.write("✅ i18n keys: every static lookup resolves in its catalog's en.json.\n");
    return 0;
  }
  process.stderr.write("❌ Message keys the code reads but en.json does not define:\n");
  for (const { file, missing } of report) {
    process.stderr.write(`  ${file}\n${missing.map((k) => `    - ${k}`).join("\n")}\n`);
  }
  process.stderr.write(
    "Add them to the catalog's en.json (other locales are filled by the workflow).\n",
  );
  return 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.exit(main());
}
