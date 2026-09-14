/**
 * File scanning for architecture guards, without shelling out to ripgrep.
 *
 * Two guards used to run `rg ... || true` and read whatever came back. CI has
 * never installed ripgrep, so `rg` was "command not found", `|| true` swallowed
 * it, and both guards read zero files:
 *
 *   - container-contract asserts its result list is EMPTY, so zero files read
 *     like a clean tree. It reported green for the container-width contract
 *     while verifying nothing.
 *   - para-async-surfaces asserts its result list is NON-empty, so zero files
 *     failed the assertion — which is the only reason anyone noticed, and it
 *     had main red for three days.
 *
 * This is the same bug lint-guards-actually-guard.test.ts was written for on
 * 2026-08-18, when four scripts/lint-*.mjs guards were found reading zero files
 * in CI for want of ripgrep. Those guards were given a grep fallback; these two
 * tests never got one. A guard that cannot fail is worse than no guard: it also
 * supplies confidence.
 *
 * So the dependency is removed rather than fixed. Node walks the tree itself:
 * nothing to install, nothing to fall back to, and no exit code to swallow. A
 * root that does not exist throws instead of contributing zero files, because
 * a renamed directory must not read as a clean result.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".open-next",
  ".turbo",
  "dist",
  "build",
  "coverage",
]);

export interface ScanOptions {
  /** Extensions to include, with the dot (e.g. [".tsx"]). Omit for all files. */
  extensions?: string[];
}

/**
 * Every file under `roots`, as repo-relative POSIX paths.
 * Throws when a root is missing — a typo or a rename is a bug in the guard,
 * not an empty result.
 */
export function walkFiles(root: string, roots: string[], options: ScanOptions = {}): string[] {
  const out: string[] = [];

  const visit = (absolute: string): void => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        visit(join(absolute, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (options.extensions && !options.extensions.some((ext) => entry.name.endsWith(ext))) {
        continue;
      }
      out.push(relative(root, join(absolute, entry.name)).split(sep).join("/"));
    }
  };

  for (const dir of roots) {
    const absolute = join(root, dir);
    // statSync throws ENOENT — deliberately unguarded.
    if (!statSync(absolute).isDirectory()) {
      throw new Error(`scan root is not a directory: ${dir}`);
    }
    visit(absolute);
  }

  return out.sort();
}

export interface Match {
  /** Repo-relative POSIX path. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** The matching line, trimmed. */
  text: string;
}

/** Every line under `roots` matching `pattern`. */
export function grepLines(
  root: string,
  roots: string[],
  pattern: RegExp,
  options: ScanOptions = {},
): Match[] {
  const matches: Match[] = [];

  for (const file of walkFiles(root, roots, options)) {
    let source: string;
    try {
      source = readFileSync(join(root, file), "utf-8");
    } catch {
      continue; // Unreadable or binary — not something a guard should assert on.
    }
    source.split("\n").forEach((text, index) => {
      // Reset a /g regex between lines; callers should not have to care.
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        matches.push({ file, line: index + 1, text: text.trim() });
      }
    });
  }

  return matches;
}

/** Files under `roots` containing `pattern`. */
export function grepFiles(
  root: string,
  roots: string[],
  pattern: RegExp,
  options: ScanOptions = {},
): string[] {
  return [...new Set(grepLines(root, roots, pattern, options).map((m) => m.file))];
}
