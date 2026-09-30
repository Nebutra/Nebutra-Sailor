import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getCodeSampleForEntry, PACKAGE_CODE_SAMPLES } from "./feature-code-samples";
import { GROUP_CODE_SAMPLES } from "./feature-group-code-samples";
import { SUBPACKAGE_GLYPHS } from "./glyphs";
import { PACKAGE_FEATURE_ENTRIES } from "./package-feature-data";

/**
 * /features shows real things or nothing (src/nebutra/DESIGN.md, "No mocks").
 * These pages once generated one for every package: boilerplate sentences,
 * snippets calling APIs invented from the slug, and dashboards whose latencies
 * and eval scores were a hash of the package name. Each test closes one of
 * those doors.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../../..");
const packages = PACKAGE_FEATURE_ENTRIES.filter((e) => e.kind === "package");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out);
    else if (/\.(tsx?|mts)$/.test(name)) out.push(file);
  }
  return out;
}

/** "@nebutra/x" → packages/<category>/x, read from each package.json's name. */
function packageDirs(): Map<string, string> {
  const dirs = new Map<string, string>();
  const root = path.join(repoRoot, "packages");
  for (const category of readdirSync(root)) {
    const categoryDir = path.join(root, category);
    if (!statSync(categoryDir).isDirectory()) continue;
    for (const name of readdirSync(categoryDir)) {
      try {
        const pkg = JSON.parse(readFileSync(path.join(categoryDir, name, "package.json"), "utf8"));
        dirs.set(pkg.name, path.join(categoryDir, name));
      } catch {
        // not a package
      }
    }
  }
  return dirs;
}

/** Every name a package's sources export: declarations and `export { … }` lists. */
function exportedNames(dir: string): Set<string> {
  const names = new Set<string>();
  for (const file of walk(path.join(dir, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(
      /export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
    )) {
      names.add(m[1] as string);
    }
    for (const m of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of (m[1] as string).split(",")) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.replace(/^type\s+/, "");
        if (name) names.add(name);
      }
    }
  }
  return names;
}

describe("feature pages show real things or nothing", () => {
  it("gives every package authored copy, so no boilerplate sentence exists", () => {
    // Copy moved from an inline PACKAGE_DESCRIPTIONS map to the packageCatalog
    // i18n namespace (apps/landing/messages/en.json) — English is the
    // canonical set every package must appear in.
    const enMessagesPath = path.join(repoRoot, "apps/landing/messages/en.json");
    const en = JSON.parse(readFileSync(enMessagesPath, "utf8"));
    const descriptions: Record<string, unknown> = en.packageCatalog?.descriptions ?? {};

    const missing = packages.filter((e) => !descriptions[e.slug]).map((e) => e.slug);
    expect(missing).toEqual([]);

    const slugs = new Set(packages.map((e) => e.slug));
    const orphans = Object.keys(descriptions).filter((slug) => !slugs.has(slug));
    expect(orphans, "copy for a package the tree does not list").toEqual([]);
  });

  it("keys every glyph to a package the tree lists", () => {
    const slugs = new Set(packages.map((e) => e.slug));
    expect(Object.keys(SUBPACKAGE_GLYPHS).filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it("shows no code for a package without a curated snippet", () => {
    for (const entry of packages) {
      expect(getCodeSampleForEntry(entry)).toBe(PACKAGE_CODE_SAMPLES[entry.slug] ?? null);
    }
  });

  it("imports only names the packages really export", () => {
    const dirs = packageDirs();
    const cache = new Map<string, Set<string>>();
    const problems: string[] = [];
    const samples = { ...PACKAGE_CODE_SAMPLES, ...GROUP_CODE_SAMPLES };

    for (const [key, sample] of Object.entries(samples)) {
      for (const m of sample.code.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"(@nebutra\/[^/"]+)[^"]*"/g,
      )) {
        const pkg = m[2] as string;
        const dir = dirs.get(pkg);
        if (!dir) {
          problems.push(`${key}: ${pkg} is not a package`);
          continue;
        }
        if (!cache.has(dir)) cache.set(dir, exportedNames(dir));
        const exported = cache.get(dir) as Set<string>;
        for (const part of (m[1] as string).split(",")) {
          const name = part
            .trim()
            .split(/\s+as\s+/)[0]
            ?.replace(/^type\s+/, "");
          if (name && !exported.has(name)) problems.push(`${key}: ${pkg} exports no ${name}`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("seeds no figure from a slug", () => {
    const offenders = walk(here)
      .filter((file) => !file.endsWith(".test.ts"))
      .filter((file) => /\bseeded\(|synthesize\w*Sample/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(here, file));
    expect(offenders).toEqual([]);
  });
});
