#!/usr/bin/env node
/* eslint-env node */
/* global process */

/**
 * Auto-generates the component preview registry from preview files.
 *
 * Scans `src/components/previews/*.tsx`, extracts exported component names,
 * and generates `src/__registry__/index.tsx` with:
 *   - `next/dynamic` lazy imports (SSR enabled by default)
 *   - An `Index` lookup table keyed by kebab-case name
 *
 * Run:  node scripts/build-registry.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PREVIEWS_DIR = path.join(ROOT, "src", "components", "previews");
const OUTPUT_DIR = path.join(ROOT, "src", "__registry__");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "index.tsx");
const GENERATED_LINE_WIDTH = 100;

// Files to skip (will be deleted once migration is done)
const SKIP_FILES = new Set(["dynamic-demos.tsx"]);

// Components that use browser-only APIs and must skip SSR
const SSR_EXCLUDE = new Set([
  // Add demo names here if they break during SSR
]);

/**
 * Detect if a file uses JSX component tags that aren't imported.
 * Returns true if the file has unresolved references (needs ssr: false).
 */
// TypeScript built-in types that can appear with `<` (generics) but are not JSX
const TS_BUILTINS = new Set([
  "Array",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Promise",
  "Record",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "HTMLDivElement",
  "HTMLSpanElement",
  "HTMLButtonElement",
  "HTMLInputElement",
  "HTMLFormElement",
  "HTMLAnchorElement",
  "HTMLElement",
  "SVGSVGElement",
  "HTMLParagraphElement",
  "HTMLHeadingElement",
  "HTMLImageElement",
  "HTMLTextAreaElement",
  "HTMLSelectElement",
  "HTMLLabelElement",
  "HTMLTableElement",
  "HTMLUListElement",
  "HTMLLIElement",
]);

function hasUnresolvedRefs(source) {
  // Collect all imported identifiers
  const imported = new Set();
  for (const m of source.matchAll(/import\s+\{([^}]+)\}\s+from/g)) {
    for (const name of m[1].split(",")) {
      const clean = name
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (clean) imported.add(clean);
    }
  }
  // Also handle: import Foo from "..."
  for (const m of source.matchAll(/import\s+([A-Z]\w*)\s+from/g)) {
    imported.add(m[1]);
  }
  // Also handle: import Foo, { ... } from "..."
  for (const m of source.matchAll(/import\s+([A-Z]\w*)\s*,\s*\{/g)) {
    imported.add(m[1]);
  }
  // Also handle: import * as Foo from "..."
  for (const m of source.matchAll(/import\s+\*\s+as\s+(\w+)\s+from/g)) {
    imported.add(m[1]);
  }

  // Find JSX tags that look like component references (PascalCase)
  const jsxTags = new Set();
  for (const m of source.matchAll(/<([A-Z]\w*)/g)) {
    jsxTags.add(m[1]);
  }

  // Check if any JSX tag is not imported and not defined in the file
  for (const tag of jsxTags) {
    if (imported.has(tag)) continue;
    if (TS_BUILTINS.has(tag)) continue;
    // Check if defined locally (function/const) with word boundary
    const localDef = new RegExp(`(?:function|const|class)\\s+${tag}(?:\\s|\\(|<|=)`);
    if (localDef.test(source)) continue;
    return true;
  }
  return false;
}

/** Convert PascalCase to kebab-case: AccordionDemo → accordion-demo */
function toKebab(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase()
    .replace(/(^|-)i-18n(?=-|$)/g, "$1i18n");
}

/**
 * Resolve `@nebutra/docs-shared/...` re-exports to source files.
 * Most design-docs previews are thin barrels into the docs-shared SSOT.
 */
const DOCS_SHARED_ROOT = path.resolve(ROOT, "..", "..", "packages", "design", "docs-shared");

function resolveDocsSharedSpecifier(specifier) {
  if (!specifier.startsWith("@nebutra/docs-shared/")) return null;
  const subpath = specifier.slice("@nebutra/docs-shared/".length);
  const base = path.join(DOCS_SHARED_ROOT, "src", subpath);
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Extract exported component names from a file's source.
 * Follows docs-shared re-exports. Tracks default vs named so dynamic imports
 * use `m.default` vs `m.Foo` correctly (export * does NOT re-export default).
 *
 * @returns {{ name: string, isDefault: boolean }[]}
 */
function extractExports(source, filename, seen = new Set()) {
  /** @type {{ name: string, isDefault: boolean }[]} */
  const found = [];

  // Strip out template literals to avoid matching code examples
  const safeSource = source.replace(/`[\s\S]*?`/g, '""');

  // export function FooDemo(
  for (const m of safeSource.matchAll(/^export\s+function\s+([A-Z]\w*)\s*\(/gm)) {
    found.push({ name: m[1], isDefault: false });
  }

  // export default function FooDemo(
  for (const m of safeSource.matchAll(/^export\s+default\s+function\s+([A-Z]\w*)\s*\(/gm)) {
    found.push({ name: m[1], isDefault: true });
  }

  // export const FooDemo =
  for (const m of safeSource.matchAll(/^export\s+const\s+([A-Z]\w*)\s*[=:]/gm)) {
    // Skip type aliases, interfaces, non-component constants
    if (m[1].endsWith("Props") || m[1].endsWith("Context")) continue;
    found.push({ name: m[1], isDefault: false });
  }

  // export { FooDemo, default as Bar, default } from "..."
  for (const m of safeSource.matchAll(/^export\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/gm)) {
    const specifier = m[2];
    const resolved = resolveDocsSharedSpecifier(specifier);
    for (const part of m[1].split(",")) {
      const raw = part.trim();
      if (!raw) continue;
      // export { default } from "..."  or  export { default as Foo }
      if (/^default(\s+as\s+[A-Z]\w*)?$/.test(raw)) {
        const asName = raw.match(/^default\s+as\s+([A-Z]\w*)$/)?.[1];
        if (resolved) {
          const nested = fs.readFileSync(resolved, "utf-8");
          const nestedExports = extractExports(nested, path.basename(resolved), new Set(seen));
          const def = nestedExports.find((e) => e.isDefault);
          if (def) {
            found.push({ name: asName ?? def.name, isDefault: asName ? false : true });
          } else if (asName) {
            found.push({ name: asName, isDefault: false });
          }
        }
        continue;
      }
      const id = raw
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (id && /^[A-Z]/.test(id) && !id.endsWith("Props") && !id.endsWith("Context")) {
        found.push({ name: id, isDefault: false });
      }
    }
  }

  // export * from "@nebutra/docs-shared/..." — named only (not default; not export type *)
  for (const m of safeSource.matchAll(/^export\s+\*\s+from\s*["']([^"']+)["']/gm)) {
    const specifier = m[1];
    const resolved = resolveDocsSharedSpecifier(specifier);
    if (!resolved) {
      process.stderr.write(
        `[registry] WARN: cannot resolve re-export ${specifier} from ${filename}\n`,
      );
      continue;
    }
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const nested = fs.readFileSync(resolved, "utf-8");
    // export * never re-exports default — only take named
    for (const exp of extractExports(nested, path.basename(resolved), seen)) {
      if (!exp.isDefault) found.push(exp);
    }
  }

  // Deduplicate by name (prefer isDefault: true if both seen)
  const byName = new Map();
  for (const exp of found) {
    const prev = byName.get(exp.name);
    if (!prev || exp.isDefault) byName.set(exp.name, exp);
  }
  return [...byName.values()];
}

// ---------------------------------------------------------------------------

const files = fs
  .readdirSync(PREVIEWS_DIR)
  .filter((f) => f.endsWith(".tsx") && !SKIP_FILES.has(f))
  .sort();

/** @type {{ key: string; exportName: string; file: string; isDefault: boolean }[]} */
const entries = [];

for (const file of files) {
  const basename = file.replace(".tsx", "");
  const source = fs.readFileSync(path.join(PREVIEWS_DIR, file), "utf-8");
  const exports = extractExports(source, file);

  if (exports.length === 0) {
    process.stderr.write(`[registry] WARN: no exports found in ${file}\n`);
    continue;
  }

  // Prefer shared implementation for ssr detection when local file is a thin barrel.
  let ssrSource = source;
  const reExport = source.match(/^export\s+\*\s+from\s*["']([^"']+)["']/m);
  if (reExport) {
    const resolved = resolveDocsSharedSpecifier(reExport[1]);
    if (resolved) ssrSource = fs.readFileSync(resolved, "utf-8");
  }
  const needsClientOnly = hasUnresolvedRefs(ssrSource);

  for (const { name: exportName, isDefault } of exports) {
    const key = toKebab(exportName);
    entries.push({
      key,
      exportName,
      file: basename,
      isDefault,
      ssrOff: needsClientOnly,
    });
  }
}

// ---------------------------------------------------------------------------
// Generate the registry file
// ---------------------------------------------------------------------------

const lines = [
  `/* eslint-disable */`,
  `// AUTO-GENERATED — do not edit manually.`,
  `// Run:  node scripts/build-registry.mjs`,
  `"use client";`,
  ``,
  `import dynamic from "next/dynamic";`,
  ``,
];

// Named exports — so mdx-components.tsx can do:
//   import { AccordionDemo, ButtonDemo } from "@/components/__registry__"
for (const { exportName, file, key, isDefault, ssrOff: autoSsrOff } of entries) {
  const ssrOff = SSR_EXCLUDE.has(key) || autoSsrOff;
  const accessor = isDefault ? "m.default" : `m.${exportName}`;
  const compactImport = `import("@/components/previews/${file}").then((m) => ({ default: ${accessor} }))`;
  if (ssrOff) {
    lines.push(`export const ${exportName} = dynamic(`);
    if (`  () => ${compactImport},`.length <= GENERATED_LINE_WIDTH) {
      lines.push(`  () => ${compactImport},`);
    } else {
      lines.push(`  () =>`);
      lines.push(`    import("@/components/previews/${file}").then((m) => ({`);
      lines.push(`      default: ${accessor},`);
      lines.push(`    })),`);
    }
    lines.push(`  { ssr: false },`);
    lines.push(`);`);
  } else {
    lines.push(`export const ${exportName} = dynamic(() =>`);
    if (`  ${compactImport},`.length <= GENERATED_LINE_WIDTH) {
      lines.push(`  ${compactImport},`);
    } else {
      lines.push(`  import("@/components/previews/${file}").then((m) => ({`);
      lines.push(`    default: ${accessor},`);
      lines.push(`  })),`);
    }
    lines.push(`);`);
  }
}

lines.push(``);
lines.push(
  `export const Index: Record<string, { name: string; component: React.ComponentType }> = {`,
);

for (const { key, exportName } of entries) {
  const compactEntry = `  "${key}": { name: "${key}", component: ${exportName} },`;
  if (compactEntry.length <= GENERATED_LINE_WIDTH) {
    lines.push(compactEntry);
  } else {
    lines.push(`  "${key}": {`);
    lines.push(`    name: "${key}",`);
    lines.push(`    component: ${exportName},`);
    lines.push(`  },`);
  }
}

lines.push(`};`);
lines.push(``);

// Write output
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, lines.join("\n"));

// Write name → file mapping for remarkComponent (source code lookup)
const mapping = {};
for (const { key, file } of entries) {
  mapping[key] = file;
}
const MAPPING_FILE = path.join(OUTPUT_DIR, "file-map.json");
fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2) + "\n");

process.stdout.write(
  `[registry] Generated ${entries.length} entries from ${files.length} files → ${path.relative(ROOT, OUTPUT_FILE)}\n`,
);

// ---------------------------------------------------------------------------
// Generate shadcn-compatible public registry
// ---------------------------------------------------------------------------

/**
 * Packages that are universally available and don't need to be listed
 * as explicit dependencies in registry items.
 */
const SKIP_DEPS = new Set([
  "react",
  "react-dom",
  "next",
  "next/navigation",
  "next/dynamic",
  "next/image",
  "next/link",
  "next/font",
  "next/headers",
  "next/server",
]);

/**
 * Extract the top-level package name from an import specifier.
 *   "@nebutra/ui/primitives" → "@nebutra/ui"
 *   "framer-motion/client"   → "framer-motion"
 *   "lucide-react"           → "lucide-react"
 *   "node:fs"                → null (skip)
 *   "./relative"             → null (skip)
 */
function topLevelPackage(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("node:")) return null;
  if (specifier.startsWith("@")) {
    // Scoped package: take the first two segments
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  // Unscoped package: take the first segment
  return specifier.split("/")[0];
}

/**
 * Scan import statements in `source` and return:
 *   packages        – unique external package names (non-empty, non-skipped)
 *   registryDeps    – registry dependency names (currently maps @nebutra/ui → "@nebutra/ui")
 */
function extractDependencies(source) {
  const pkgSet = new Set();

  // Match all from-import patterns:
  //   import { X } from "pkg"
  //   import X from "pkg"
  //   import * as X from "pkg"
  //   import X, { Y } from "pkg"
  const importPattern = /\bfrom\s+["']([^"']+)["']/g;
  for (const m of source.matchAll(importPattern)) {
    const pkg = topLevelPackage(m[1]);
    if (pkg && !SKIP_DEPS.has(m[1]) && !SKIP_DEPS.has(pkg)) {
      pkgSet.add(pkg);
    }
  }

  const packages = [...pkgSet].sort();

  // registryDependencies: if @nebutra/ui appears, list it as a registry dep
  const registryDeps = packages.includes("@nebutra/ui") ? ["@nebutra/ui"] : [];

  return { packages, registryDeps };
}

const PUBLIC_R_DIR = path.join(ROOT, "public", "r");
fs.mkdirSync(PUBLIC_R_DIR, { recursive: true });

// Deduplicate entries by file basename — multiple exports from the same file
// should produce a single JSON file in the public registry.
const seenFiles = new Set();
const uniqueFileBasenames = [];
for (const { file } of entries) {
  if (!seenFiles.has(file)) {
    seenFiles.add(file);
    uniqueFileBasenames.push(file);
  }
}

const currentPreviewRegistryFiles = new Set(
  uniqueFileBasenames.map((basename) => `${basename}.json`),
);

for (const filename of fs.readdirSync(PUBLIC_R_DIR)) {
  if (currentPreviewRegistryFiles.has(filename) || !filename.endsWith(".json")) {
    continue;
  }

  const manifestPath = path.join(PUBLIC_R_DIR, filename);
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    if (manifest.type === "registry:example") {
      fs.unlinkSync(manifestPath);
      process.stdout.write(`[registry] Removed stale preview manifest public/r/${filename}\n`);
    }
  } catch {
    // Keep non-JSON or hand-authored files in public/r untouched.
  }
}

for (const basename of uniqueFileBasenames) {
  const sourceFile = path.join(PREVIEWS_DIR, `${basename}.tsx`);
  const content = fs.readFileSync(sourceFile, "utf-8");

  const deps = extractDependencies(content);

  const registryItem = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: basename,
    type: "registry:example",
    ...(deps.packages.length > 0 && { dependencies: deps.packages }),
    ...(deps.registryDeps.length > 0 && { registryDependencies: deps.registryDeps }),
    files: [
      {
        path: `registry/examples/${basename}.tsx`,
        content,
        type: "registry:example",
      },
    ],
  };

  fs.writeFileSync(
    path.join(PUBLIC_R_DIR, `${basename}.json`),
    JSON.stringify(registryItem, null, 2) + "\n",
  );
}

// ---------------------------------------------------------------------------
// Merge with the TIER B Phase 1 index produced by
// packages/design/ui/scripts/build-registry.ts (if it has already run).
// We never *overwrite* the canonical registry.json with only previews — the
// shadcn-distributable components are the source of truth for ui.nebutra.com.
// Demo previews are written to public/previews-index.json for internal use.
// ---------------------------------------------------------------------------

const previewsIndex = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "nebutra-ui-previews",
  homepage: "https://ui.nebutra.com",
  items: uniqueFileBasenames.map((basename) => ({
    name: basename,
    type: "registry:example",
  })),
};

fs.writeFileSync(
  path.join(ROOT, "public", "previews-index.json"),
  JSON.stringify(previewsIndex, null, 2) + "\n",
);

// If registry.json doesn't exist yet, seed it with an empty index so the
// /registry page can render. The TIER B builder will replace it on next run.
const REGISTRY_INDEX_PATH = path.join(ROOT, "public", "registry.json");
if (!fs.existsSync(REGISTRY_INDEX_PATH)) {
  fs.writeFileSync(
    REGISTRY_INDEX_PATH,
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        name: "nebutra-ui",
        homepage: "https://ui.nebutra.com",
        items: [],
      },
      null,
      2,
    ) + "\n",
  );
}

process.stdout.write(
  `[registry] Previews: ${uniqueFileBasenames.length} files → public/r/*.json + public/previews-index.json\n`,
);

// ci-trigger 20260724081902
// governance-green-recheck
