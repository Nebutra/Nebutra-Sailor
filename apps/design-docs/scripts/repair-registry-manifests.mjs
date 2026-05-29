#!/usr/bin/env node
/* eslint-env node */

/**
 * Repairs registry manifests after the shared @nebutra/ui registry builder runs.
 *
 * The package-level builder owns the component source list, but design-docs owns
 * the public JSON artifacts. This local pass keeps relative sibling imports
 * installable when a primitive is split across small source files.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..", "..");
const REGISTRY_DIR = path.join(ROOT, "public", "r");
const UI_SRC_DIR = path.join(REPO_ROOT, "packages", "design", "ui", "src");
const SOURCE_ROOTS = [
  path.join(UI_SRC_DIR, "primitives"),
  path.join(UI_SRC_DIR, "components"),
  path.join(UI_SRC_DIR, "layout"),
  path.join(UI_SRC_DIR, "tokens"),
  path.join(UI_SRC_DIR, "utils"),
];
const IMPORT_PATTERN = /\bfrom\s+["'](\.[^"']+)["']/g;
const EXTENSIONS = [".ts", ".tsx"];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function withoutExtension(filePath) {
  return filePath.replace(/\.(tsx?|jsx?)$/u, "");
}

function targetExists(files, targetPathWithoutExtension) {
  return files.some(
    (file) => withoutExtension(file.target ?? file.path) === targetPathWithoutExtension,
  );
}

function resolveSource(relativeTargetWithoutExtension) {
  for (const root of SOURCE_ROOTS) {
    for (const extension of EXTENSIONS) {
      const candidate = path.join(root, `${relativeTargetWithoutExtension}${extension}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function repairManifest(file) {
  const manifest = readJson(file);
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  let repaired = 0;
  let cursor = 0;

  while (cursor < files.length) {
    const entry = files[cursor];
    cursor += 1;
    if (typeof entry.content !== "string") continue;

    const entryTarget = entry.target ?? entry.path;
    const entryDir = path.posix.dirname(entryTarget);

    for (const match of entry.content.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (!specifier.startsWith("./")) continue;

      const siblingBasename = specifier.replace(/^\.\//u, "");
      if (siblingBasename.includes("/")) continue;

      const targetPathWithoutExtension = path.posix.join(entryDir, siblingBasename);
      if (targetExists(files, targetPathWithoutExtension)) continue;

      const source = resolveSource(siblingBasename);
      if (!source) continue;

      const extension = path.extname(source);
      const targetPath = `${targetPathWithoutExtension}${extension}`;
      files.push({
        path: targetPath,
        type: "registry:lib",
        target: targetPath,
        content: fs.readFileSync(source, "utf8"),
      });
      repaired += 1;
    }
  }

  if (repaired > 0) {
    manifest.files = files;
    writeJson(file, manifest);
  }

  return repaired;
}

let repairedCount = 0;
for (const entry of fs.readdirSync(REGISTRY_DIR).sort()) {
  if (!entry.endsWith(".json")) continue;
  repairedCount += repairManifest(path.join(REGISTRY_DIR, entry));
}

if (repairedCount > 0) {
  process.stdout.write(`[registry] repaired ${repairedCount} sibling files in public manifests\n`);
} else {
  process.stdout.write("[registry] sibling files already complete\n");
}
