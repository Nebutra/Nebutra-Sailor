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
    .toLowerCase();
}

/** Extract exported component names from a file's source */
function extractExports(source, _filename) {
  const names = [];

  // Strip out template literals to avoid matching code examples
  const safeSource = source.replace(/`[\s\S]*?`/g, '""');

  // export function FooDemo(
  for (const m of safeSource.matchAll(/^export\s+function\s+([A-Z]\w*)\s*\(/gm)) {
    names.push(m[1]);
  }

  // export default function FooDemo(
  for (const m of safeSource.matchAll(/^export\s+default\s+function\s+([A-Z]\w*)\s*\(/gm)) {
    names.push(m[1]);
  }

  // export const FooDemo =
  for (const m of safeSource.matchAll(/^export\s+const\s+([A-Z]\w*)\s*[=:]/gm)) {
    // Skip type aliases, interfaces, non-component constants
    if (m[1].endsWith("Props") || m[1].endsWith("Context")) continue;
    names.push(m[1]);
  }

  // Deduplicate
  return [...new Set(names)];
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

  // Detect which exports are default
  const defaultExportPattern = /^export\s+default\s+function\s+([A-Z]\w*)/gm;
  const defaultNames = new Set();
  for (const m of source.matchAll(defaultExportPattern)) {
    defaultNames.add(m[1]);
  }

  // Auto-detect files with unresolved JSX refs → ssr: false
  const needsClientOnly = hasUnresolvedRefs(source);

  for (const exportName of exports) {
    const key = toKebab(exportName);
    entries.push({
      key,
      exportName,
      file: basename,
      isDefault: defaultNames.has(exportName),
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
  const ssrOff = SSR_EXCLUDE.has(key) || autoSsrOff ? `, { ssr: false }` : "";
  const accessor = isDefault ? "m.default" : `m.${exportName}`;
  lines.push(
    `export const ${exportName} = dynamic(() => import("@/components/previews/${file}").then(m => ({ default: ${accessor} }))${ssrOff});`,
  );
}

lines.push(``);
lines.push(
  `export const Index: Record<string, { name: string; component: React.ComponentType }> = {`,
);

for (const { key, exportName } of entries) {
  lines.push(`  "${key}": { name: "${key}", component: ${exportName} },`);
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

// Generate the top-level index file
const registryIndex = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "nebutra-ui",
  homepage: "https://design.nebutra.com",
  items: uniqueFileBasenames.map((basename) => ({
    name: basename,
    type: "registry:example",
  })),
};

fs.writeFileSync(
  path.join(ROOT, "public", "registry.json"),
  JSON.stringify(registryIndex, null, 2) + "\n",
);

process.stdout.write(
  `[registry] Public registry: ${uniqueFileBasenames.length} files → public/r/*.json + public/registry.json\n`,
);
