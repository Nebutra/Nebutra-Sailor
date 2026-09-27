// Which source modules of a Next.js app are reachable from its entry points.
//
// Used two ways, so the two cannot disagree:
//   - apps/landing/src/__tests__/no-dead-modules.test.ts fails on a module
//     nothing imports (dead code in the monorepo);
//   - scripts/template-build.ts deletes the modules that become unreachable
//     once Nebutra's own pages are stripped, so the template does not carry
//     Nebutra-only helpers and data nobody uses.
//
// Resolution is deliberately small: `@/` (the app's src/) and relative
// specifiers, static and dynamic imports, vi.mock paths. Package imports are
// not followed. Entries are the files Next.js loads by convention.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

const IMPORT_RE =
  /(?:from\s+|import\s*\(\s*|import\s+|require\(\s*|vi\.mock\(\s*)["']([^"']+)["']/g;
const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json"];
// A route file, or its `.for-template` variant: the variant is the template's
// entry point, so what it imports is reachable even though this build never runs it.
const ROUTE_FILES =
  /(^|\/)(page|layout|route|not-found|error|global-error|loading|template|default|sitemap|robots|manifest|opengraph-image|twitter-image|icon|apple-icon)(\.for-template)?\.tsx?$/;
const ROOT_ENTRIES =
  /^(proxy|middleware|instrumentation|instrumentation-client)\.ts$|^i18n\/request\.ts$/;

/** Tests, stories and type declarations are never "dead": nothing imports them by design. */
export const isAuxiliary = (rel) =>
  /(^|\/)__tests__\//.test(rel) ||
  /(^|\/)src\/test\//.test(rel) || // test support wired through vitest config, not imports
  /\.(test|spec)\.tsx?$/.test(rel) ||
  /\.stories\.tsx?$/.test(rel) ||
  /\.d\.ts$/.test(rel) ||
  /\.for-template\.[a-z]+$/.test(rel);

function listSources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) listSources(abs, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(abs);
  }
  return out;
}

/** Resolve an import specifier from `fromFile`, or null when it is a package or missing. */
export function resolveSpecifier(src, fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(src, spec.slice(2));
  else if (spec.startsWith(".")) base = normalize(join(dirname(fromFile), spec));
  else return null;
  const candidates = [
    base,
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => join(base, `index${e}`)),
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

/** The local specifiers a file imports (`@/…` and relative). */
export function localImports(file) {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(IMPORT_RE)]
    .map((m) => m[1])
    .filter((spec) => spec.startsWith("@/") || spec.startsWith("."));
}

/**
 * @param {string} appDir  e.g. apps/landing
 * @returns {{ sources: string[], reachable: Set<string>, unreachable: string[] }}
 *   paths relative to appDir; `unreachable` excludes auxiliary files.
 */
export function moduleReach(appDir) {
  const src = join(appDir, "src");
  const files = listSources(src);
  const rel = (abs) => relative(appDir, abs).split("\\").join("/");
  const entries = files.filter((abs) => {
    const r = relative(src, abs).split("\\").join("/");
    // Every `*.for-template.*` file is an entry of the template build: what it
    // imports is reachable there even though this build never loads it.
    return (
      (r.startsWith("app/") && ROUTE_FILES.test(r)) ||
      ROOT_ENTRIES.test(r) ||
      /\.for-template\.[a-z]+$/.test(r)
    );
  });
  const seen = new Set();
  const stack = [...entries];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(ts|tsx|js|mjs)$/.test(file)) continue;
    for (const spec of localImports(file)) {
      const target = resolveSpecifier(src, file, spec);
      if (target && !seen.has(target)) stack.push(target);
    }
  }
  const reachable = new Set([...seen].map(rel));
  const sources = files.map(rel);
  return {
    sources,
    reachable,
    unreachable: sources.filter((r) => !reachable.has(r) && !isAuxiliary(r)),
  };
}
