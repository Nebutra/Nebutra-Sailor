import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AI_ROOT = join(ROOT, "packages", "ai");

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

function readPackageJson(packageDir: string): PackageJson {
  return JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as PackageJson;
}

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

function discoverAiPackages(): Array<{ dir: string; manifest: PackageJson }> {
  return readdirSync(AI_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(AI_ROOT, entry.name))
    .filter((dir) => existsSync(join(dir, "package.json")) && existsSync(join(dir, "src")))
    .map((dir) => ({ dir, manifest: readPackageJson(dir) }))
    .filter(({ manifest }) => manifest.name?.startsWith("@nebutra/"));
}

/**
 * Blank out template-literal bodies, preserving offsets and newlines.
 *
 * `packages/ai/startup-os/src/files.ts` writes the scaffolded founder workspace
 * — its route files, its package.json — as template literals. Those contain
 * `import { Button } from "@nebutra/ui/primitives"`, which is source code for
 * the generated app and a string here. Reading it as an import demanded that
 * startup-os depend on the component library at runtime, which it does not: it
 * only writes the name into a file, and the version comes from a table in
 * @nebutra/preset. That dependency cost the gateway's production bundle antd,
 * three.js and mermaid.
 *
 * A guard that cannot tell code from text about code will keep asking for
 * dependencies nobody imports.
 */
function blankTemplateLiterals(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch !== "`") {
      out += ch;
      i += 1;
      continue;
    }
    // Consume to the matching backtick, honouring escapes; keep newlines so
    // any line-based reporting elsewhere stays accurate.
    let j = i + 1;
    while (j < source.length) {
      if (source[j] === "\\") {
        j += 2;
        continue;
      }
      if (source[j] === "`") break;
      j += 1;
    }
    const body = source.slice(i, Math.min(j + 1, source.length));
    out += body.replace(/[^\n]/g, " ");
    i = j + 1;
  }
  return out;
}

function runtimeImports(rawSource: string): string[] {
  const source = blankTemplateLiterals(rawSource);
  const imports = new Set<string>();
  // The clause between `import` and `from` may span lines for a multi-line
  // named list, but it can never contain a quote — a quote means the match has
  // left the statement. Without that bound, `[\s\S]*?` ran 7040 characters
  // from a real import at the top of execution.ts into the words
  // "@nebutra/ui/primitives" inside a prompt string forty lines below, and
  // reported the package as an undeclared runtime dependency.
  const clause = String.raw`(?:[^"'\n]|\n(?!\s*\n))*?`;
  const patterns = [
    new RegExp(String.raw`\bimport(?:\s+type)?${clause}from\s+["'](@nebutra\/[^"']+)["']`, "g"),
    /\bimport\s*\(\s*["'](@nebutra\/[^"']+)["']\s*\)/g,
    new RegExp(String.raw`\bexport(?:\s+type)?${clause}from\s+["'](@nebutra\/[^"']+)["']`, "g"),
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (!specifier) continue;
      imports.add(specifier.split("/").slice(0, 2).join("/"));
    }
  }

  return [...imports];
}

function rootExportTargets(source: string): string[] {
  const targets = new Set<string>();
  for (const match of source.matchAll(
    /\bexport(?:\s+type)?(?:[\s\S]*?)from\s+["'](\.[^"']+)["']/g,
  )) {
    const target = match[1];
    if (target) targets.add(target);
  }
  return [...targets];
}

function resolveLocalTsFile(packageDir: string, target: string): string | null {
  const base = join(packageDir, "src", target);
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function hasRuntimeImport(source: string, specifier: string): boolean {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\bimport\\s+(?!type\\b)[\\s\\S]*?from\\s+["']${escaped}["']`),
    new RegExp(`\\bimport\\s*\\(\\s*["']${escaped}["']\\s*\\)`),
    new RegExp(`\\bexport\\s+(?!type\\b)[\\s\\S]*?from\\s+["']${escaped}["']`),
  ];
  return patterns.some((pattern) => pattern.test(source));
}

describe("AI package runtime dependency manifests", () => {
  it("declares every @nebutra runtime import as a dependency or peer dependency", () => {
    const violations: string[] = [];

    for (const { dir, manifest } of discoverAiPackages()) {
      const packageName = manifest.name;
      if (!packageName) continue;

      const allowed = new Set([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
      ]);

      for (const file of listSourceFiles(join(dir, "src"))) {
        const source = readFileSync(file, "utf8");
        for (const imported of runtimeImports(source)) {
          if (imported === packageName) continue;
          if (!allowed.has(imported)) {
            violations.push(
              `${packageName}: ${relative(ROOT, file)} imports ${imported} but package.json does not declare it as dependency or peerDependency`,
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not mark top-level runtime peers optional when the root export imports them", () => {
    const violations: string[] = [];

    for (const { dir, manifest } of discoverAiPackages()) {
      if (!manifest.name) continue;
      const rootIndex = join(dir, "src", "index.ts");
      if (!existsSync(rootIndex)) continue;

      const source = readFileSync(rootIndex, "utf8");
      for (const peer of Object.keys(manifest.peerDependencies ?? {})) {
        const optional = manifest.peerDependenciesMeta?.[peer]?.optional === true;
        if (!optional) continue;

        const rootOrExportedTargetImportsPeer =
          hasRuntimeImport(source, peer) ||
          rootExportTargets(source).some((target) => {
            const file = resolveLocalTsFile(dir, target);
            return file ? hasRuntimeImport(readFileSync(file, "utf8"), peer) : false;
          });

        if (rootOrExportedTargetImportsPeer) {
          violations.push(
            `${manifest.name}: root src/index.ts imports optional peer ${peer}; make it required or move the export behind a subpath`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
