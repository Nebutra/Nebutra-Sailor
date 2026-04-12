/**
 * Token Codemod Script
 *
 * Converts raw Tailwind color/border-radius utilities to semantic design tokens.
 * Handles bg-, text-, border- classes including dark:, hover:, dark:hover:,
 * hover:dark:, and group-hover: prefixed variants.
 *
 * Usage: npx tsx scripts/codemod-tokens.ts [--dry-run]
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function walkDir(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      // Skip node_modules, .next, dist, etc.
      if (entry === "node_modules" || entry === ".next" || entry === "dist" || entry === ".turbo") {
        continue;
      }
      results.push(...walkDir(fullPath, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function discoverFiles(): string[] {
  const dirs = [
    join(ROOT, "packages/ui/src"),
    join(ROOT, "apps/web/src"),
    join(ROOT, "apps/landing-page/src"),
  ];

  const allFiles: string[] = [];
  for (const dir of dirs) {
    allFiles.push(...walkDir(dir, [".ts", ".tsx"]));
  }

  // Filter out stories and globals.css (shouldn't match .ts/.tsx, but be safe)
  return allFiles.filter((f) => {
    const rel = relative(ROOT, f);
    if (rel.endsWith(".stories.tsx") || rel.endsWith(".stories.ts")) {
      return false;
    }
    if (rel.includes("globals.css")) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Replacement maps
// ---------------------------------------------------------------------------

// bg- replacements: raw class → semantic token class
// Note: bg-white is handled specially (only when paired with dark:bg-)
const BG_MAP: Record<string, string> = {
  "bg-gray-50": "bg-[var(--neutral-2)]",
  "bg-zinc-50": "bg-[var(--neutral-2)]",
  "bg-slate-50": "bg-[var(--neutral-2)]",
  "bg-gray-100": "bg-[var(--neutral-3)]",
  "bg-zinc-100": "bg-[var(--neutral-3)]",
  "bg-gray-200": "bg-[var(--neutral-4)]",
  "bg-gray-300": "bg-[var(--neutral-5)]",
  "bg-gray-400": "bg-[var(--neutral-8)]",
  "bg-zinc-500": "bg-[var(--neutral-8)]",
  "bg-gray-500": "bg-[var(--neutral-9)]",
  "bg-gray-600": "bg-[var(--neutral-10)]",
  "bg-gray-700": "bg-[var(--neutral-11)]",
  "bg-gray-800": "bg-[var(--neutral-3)]",
  "bg-zinc-800": "bg-[var(--neutral-3)]",
  "bg-gray-900": "bg-[var(--neutral-2)]",
  "bg-zinc-900": "bg-[var(--neutral-2)]",
  "bg-slate-900": "bg-[var(--neutral-2)]",
  "bg-zinc-950": "bg-[var(--neutral-1)]",
  "bg-slate-950": "bg-[var(--neutral-1)]",
  "bg-gray-950": "bg-[var(--neutral-1)]",
};

const TEXT_MAP: Record<string, string> = {
  "text-gray-100": "text-[var(--neutral-12)]",
  "text-zinc-100": "text-[var(--neutral-12)]",
  "text-zinc-50": "text-[var(--neutral-12)]",
  "text-gray-200": "text-[var(--neutral-11)]",
  "text-zinc-200": "text-[var(--neutral-11)]",
  "text-gray-300": "text-[var(--neutral-11)]",
  "text-zinc-300": "text-[var(--neutral-11)]",
  "text-gray-400": "text-[var(--neutral-9)]",
  "text-zinc-400": "text-[var(--neutral-9)]",
  "text-slate-400": "text-[var(--neutral-9)]",
  "text-gray-500": "text-[var(--neutral-9)]",
  "text-zinc-500": "text-[var(--neutral-9)]",
  "text-gray-600": "text-[var(--neutral-10)]",
  "text-zinc-600": "text-[var(--neutral-10)]",
  "text-gray-700": "text-[var(--neutral-11)]",
  "text-zinc-700": "text-[var(--neutral-11)]",
  "text-gray-800": "text-[var(--neutral-12)]",
  "text-zinc-800": "text-[var(--neutral-12)]",
  "text-gray-900": "text-[var(--neutral-12)]",
  "text-zinc-900": "text-[var(--neutral-12)]",
  "text-gray-950": "text-[var(--neutral-12)]",
  "text-zinc-950": "text-[var(--neutral-12)]",
};

const BORDER_MAP: Record<string, string> = {
  "border-gray-100": "border-[var(--neutral-6)]",
  "border-zinc-100": "border-[var(--neutral-6)]",
  "border-gray-200": "border-[var(--neutral-6)]",
  "border-zinc-200": "border-[var(--neutral-6)]",
  "border-slate-200": "border-[var(--neutral-6)]",
  "border-gray-300": "border-[var(--neutral-7)]",
  "border-zinc-300": "border-[var(--neutral-7)]",
  "border-gray-400": "border-[var(--neutral-8)]",
  "border-gray-600": "border-[var(--neutral-7)]",
  "border-zinc-700": "border-[var(--neutral-7)]",
  "border-gray-700": "border-[var(--neutral-7)]",
  "border-zinc-800": "border-[var(--neutral-7)]",
  "border-slate-800": "border-[var(--neutral-7)]",
  "border-gray-800": "border-[var(--neutral-7)]",
  "border-zinc-900": "border-[var(--neutral-7)]",
};

const RADIUS_MAP: Record<string, string> = {
  "rounded-sm": "rounded-[var(--radius-sm)]",
  "rounded-md": "rounded-[var(--radius-md)]",
  "rounded-lg": "rounded-[var(--radius-lg)]",
  "rounded-xl": "rounded-[var(--radius-xl)]",
  "rounded-2xl": "rounded-[var(--radius-2xl)]",
  "rounded-3xl": "rounded-[var(--radius-3xl)]",
};

// ---------------------------------------------------------------------------
// Core replacement logic
// ---------------------------------------------------------------------------

/**
 * Build a regex that matches a Tailwind class with an optional prefix chain
 * and optional opacity modifier (e.g. hover:bg-gray-100/50).
 *
 * The regex uses word boundaries appropriate for className strings.
 */
function buildClassRegex(rawClass: string): RegExp {
  // Escape hyphens for regex
  const escaped = rawClass.replace(/-/g, "\\-");
  // Match the class exactly, possibly with an opacity modifier like /50
  // Must be at a word boundary (preceded by space, quote, or start; followed by space, quote, or end)
  return new RegExp(`(?<=[\\s"'\`{])${escaped}(?:\\/\\d+)?(?=[\\s"'\`}])`, "g");
}

/**
 * Build a regex for prefixed variants (dark:, hover:, dark:hover:, hover:dark:, group-hover:)
 * of a given raw class.
 */
function buildDarkPrefixedRegex(rawClass: string): RegExp {
  const escaped = rawClass.replace(/-/g, "\\-");
  // Match dark:, dark:hover:, hover:dark:, group-hover:, dark:group-hover: prefixed versions
  // with optional opacity modifier
  return new RegExp(
    `(?<=[\\s"'\`{])(?:dark:|dark:hover:|hover:dark:|dark:group\\-hover:|group\\-hover:)${escaped}(?:\\/\\d+)?(?=[\\s"'\`}])`,
    "g",
  );
}

/**
 * Build a regex for hover: prefixed variants of a given raw class.
 * These get replaced with hover: + semantic token.
 */
function buildHoverPrefixedRegex(rawClass: string): RegExp {
  const escaped = rawClass.replace(/-/g, "\\-");
  return new RegExp(`(?<=[\\s"'\`{])hover:${escaped}(?:\\/\\d+)?(?=[\\s"'\`}])`, "g");
}

/**
 * Build a regex for group-hover: prefixed variants of a given raw class.
 * These get replaced with group-hover: + semantic token.
 */
function buildGroupHoverPrefixedRegex(rawClass: string): RegExp {
  const escaped = rawClass.replace(/-/g, "\\-");
  return new RegExp(`(?<=[\\s"'\`{])group\\-hover:${escaped}(?:\\/\\d+)?(?=[\\s"'\`}])`, "g");
}

interface ReplacementResult {
  content: string;
  count: number;
}

function applyReplacements(content: string): ReplacementResult {
  let result = content;
  let totalCount = 0;

  function countAndReplace(
    text: string,
    regex: RegExp,
    replacement: string,
  ): { text: string; count: number } {
    let count = 0;
    const newText = text.replace(regex, () => {
      count++;
      return replacement;
    });
    return { text: newText, count };
  }

  // -----------------------------------------------------------------------
  // Phase 1: Replace bg-white ONLY when paired with a dark:bg- variant
  // We detect this by looking for bg-white followed (within the same
  // string context) by dark:bg-{gray|zinc|slate}-
  // -----------------------------------------------------------------------
  // We handle bg-white → bg-[var(--neutral-1)] only when followed by dark:bg-
  // This requires a more nuanced approach: look for lines containing both
  // bg-white and dark:bg-{gray|zinc|slate}-
  const _bgWhitePairedRegex = /(?<=[\s"'`{])bg-white(?=[\s"'`}])/g;
  // Check each match location: is there a dark:bg- nearby in the same string?
  result = result.replace(
    /(["'`])([^"'`]*?)(?:bg-white)((?:[^"'`]*?)(?:dark:bg-(?:gray|zinc|slate)-\d+)(?:[^"'`]*))\1/g,
    (_match, quote, before, after) => {
      totalCount++;
      return `${quote}${before}bg-[var(--neutral-1)]${after}${quote}`;
    },
  );
  // Also handle: dark:bg-X comes before bg-white
  result = result.replace(
    /(["'`])([^"'`]*?(?:dark:bg-(?:gray|zinc|slate)-\d+)[^"'`]*?)(?:bg-white)([^"'`]*?)\1/g,
    (_match, quote, before, after) => {
      // Only replace if we haven't already (check for bg-[var)
      if (before.includes("bg-[var(--neutral-1)]")) return _match;
      totalCount++;
      return `${quote}${before}bg-[var(--neutral-1)]${after}${quote}`;
    },
  );

  // Also handle cn() / clsx() calls with template literals
  result = result.replace(
    /(`)([^`]*?)(?:bg-white)((?:[^`]*?)(?:dark:bg-(?:gray|zinc|slate)-\d+)(?:[^`]*))`/g,
    (_match, quote, before, after) => {
      totalCount++;
      return `${quote}${before}bg-[var(--neutral-1)]${after}\``;
    },
  );

  // -----------------------------------------------------------------------
  // Phase 2: Replace hover: prefixed color classes with hover: + token
  // Must run BEFORE base class replacement and BEFORE dark: cleanup
  // -----------------------------------------------------------------------
  const allColorMaps = [
    { map: BG_MAP, prefix: "bg" },
    { map: TEXT_MAP, prefix: "text" },
    { map: BORDER_MAP, prefix: "border" },
  ];

  for (const { map } of allColorMaps) {
    for (const [rawClass, tokenClass] of Object.entries(map)) {
      // hover: variants → hover: + semantic token
      {
        const regex = buildHoverPrefixedRegex(rawClass);
        const r = countAndReplace(result, regex, `hover:${tokenClass}`);
        result = r.text;
        totalCount += r.count;
      }

      // group-hover: variants → group-hover: + semantic token
      {
        const regex = buildGroupHoverPrefixedRegex(rawClass);
        const r = countAndReplace(result, regex, `group-hover:${tokenClass}`);
        result = r.text;
        totalCount += r.count;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Phase 3: Remove dark: prefixed color variants (they're now handled by
  // semantic tokens). Includes dark:, dark:hover:, hover:dark:
  // -----------------------------------------------------------------------
  for (const { map } of allColorMaps) {
    for (const [rawClass] of Object.entries(map)) {
      const regex = buildDarkPrefixedRegex(rawClass);
      const r = countAndReplace(result, regex, "");
      result = r.text;
      totalCount += r.count;
    }
  }

  // Also clean up dark:hover: and hover:dark: variants that reference
  // classes we've already converted
  for (const { map } of allColorMaps) {
    for (const [rawClass] of Object.entries(map)) {
      // dark:hover:bg-gray-100, dark:hover:text-gray-200, etc.
      const darkHoverRegex = new RegExp(
        `(?<=[\\s"'\`{])dark:hover:${rawClass.replace(/-/g, "\\-")}(?:\\/\\d+)?(?=[\\s"'\`}])`,
        "g",
      );
      const r1 = countAndReplace(result, darkHoverRegex, "");
      result = r1.text;
      totalCount += r1.count;

      // hover:dark:bg-gray-100, etc.
      const hoverDarkRegex = new RegExp(
        `(?<=[\\s"'\`{])hover:dark:${rawClass.replace(/-/g, "\\-")}(?:\\/\\d+)?(?=[\\s"'\`}])`,
        "g",
      );
      const r2 = countAndReplace(result, hoverDarkRegex, "");
      result = r2.text;
      totalCount += r2.count;
    }
  }

  // -----------------------------------------------------------------------
  // Phase 4: Replace base color classes (bg-, text-, border-)
  // -----------------------------------------------------------------------
  for (const { map } of allColorMaps) {
    for (const [rawClass, tokenClass] of Object.entries(map)) {
      const regex = buildClassRegex(rawClass);
      const r = countAndReplace(result, regex, tokenClass);
      result = r.text;
      totalCount += r.count;
    }
  }

  // -----------------------------------------------------------------------
  // Phase 5: Replace border-radius classes
  // Must match exactly and NOT match rounded-full / rounded-none / rounded-[
  // -----------------------------------------------------------------------
  for (const [rawClass, tokenClass] of Object.entries(RADIUS_MAP)) {
    // Build regex that matches the exact class, optionally prefixed by
    // Tailwind variants like sm:, md:, lg:, xl:, 2xl:, before:, after:, etc.
    const escaped = rawClass.replace(/-/g, "\\-");
    const regex = new RegExp(`(?<=[\\s"'\`{])((?:[a-z0-9]+:)*)${escaped}(?=[\\s"'\`}])`, "g");
    result = result.replace(regex, (_match, prefix) => {
      totalCount++;
      return `${prefix}${tokenClass}`;
    });
  }

  // -----------------------------------------------------------------------
  // Phase 6: Clean up artifacts (only within single-line string literals)
  // -----------------------------------------------------------------------

  // Collapse multiple spaces and trim trailing/leading spaces within
  // single/double quoted strings that look like className values.
  // We avoid backtick template literals because they can be multi-line
  // (CSS templates, etc.) and the regex would mangle them.
  result = result.replace(/(["'])([^"'\n]*?)\1/g, (match, quote, inner) => {
    // Only clean up strings that look like className values
    if (!/\b(?:bg-|text-|border-|rounded-|flex|grid|p-|m-|w-|h-|gap-|space-)/.test(inner)) {
      return match;
    }
    // Collapse double spaces and trim trailing whitespace only.
    // Leading spaces are intentional in string concatenation patterns.
    let cleaned = inner.replace(/ {2,}/g, " ");
    // Trim trailing space (from removed dark: classes at end of string)
    cleaned = cleaned.replace(/\s+$/, "");
    if (cleaned !== inner) {
      return `${quote}${cleaned}${quote}`;
    }
    return match;
  });

  return { content: result, count: totalCount };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const files = discoverFiles();
  let totalReplacements = 0;
  let filesChanged = 0;
  const changedFiles: Array<{ path: string; count: number }> = [];

  for (const filePath of files) {
    const original = readFileSync(filePath, "utf-8");
    const { content: transformed, count } = applyReplacements(original);

    if (transformed !== original) {
      filesChanged++;
      totalReplacements += count;
      changedFiles.push({ path: relative(ROOT, filePath), count });

      if (!DRY_RUN) {
        writeFileSync(filePath, transformed, "utf-8");
      }
    }
  }

  process.stdout.write("\n=== Token Codemod Results ===\n\n");
  if (DRY_RUN) {
    process.stdout.write("  (DRY RUN — no files were modified)\n\n");
  }
  process.stdout.write(`  Files scanned: ${files.length}\n`);
  process.stdout.write(`  Files changed: ${filesChanged}\n`);
  process.stdout.write(`  Total replacements: ${totalReplacements}\n\n`);

  if (changedFiles.length > 0) {
    process.stdout.write("  Changed files:\n");
    for (const { path, count } of changedFiles) {
      process.stdout.write(`    ${path} (${count} replacements)\n`);
    }
    process.stdout.write("\n");
  }
}

main();
