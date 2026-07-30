#!/usr/bin/env tsx
/**
 * verify-parity.ts
 *
 * Two independent checks, both required to pass.
 *
 * DIRECTION 1 — generation parity (DTCG → CSS)
 *   Compares Style Dictionary output (styles.generated.css) against runtime
 *   packages/design/tokens/styles.css. Contract: 100% overall.
 *     1. Parse both files into Map<varName, value> per scope (:root | .dark).
 *     2. For each variable in the legacy SSOT, look up the generated counterpart.
 *     3. Normalize values (collapse whitespace, lowercase hex) before comparing.
 *     4. Report matched / missing / mismatched / extra.
 *   This proves every token reached the CSS. On its own it says NOTHING about
 *   CSS custom properties that never came from a token file.
 *
 * DIRECTION 2 — authorship (CSS → DTCG)
 *   Every custom property declared anywhere in styles.generated.css must be
 *   derivable from the DTCG token tree. A property that is not is a literal
 *   authored inside style-dictionary.config.mjs (or static/base.css), i.e. a
 *   token that lives in the generator instead of tokens/*.json — the exact
 *   place a "single source of truth" leaks. Those are FAILURES, not
 *   information, guarded by a shrink-only allowlist below.
 *
 *   The set of derivable names is not re-implemented here: it is read from
 *   build/tailwind/*.preset.cjs, which Style Dictionary emits from the token
 *   tree using the SAME `name/nebutra/css` transform as the CSS platform. So
 *   this check cannot drift away from the generator's naming rules.
 *
 * Exits 0 only when parity meets the floor AND no unlisted generator-authored
 * token exists AND no allowlist entry has gone stale.
 */

import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { relative, resolve } from "node:path";

type Scope = ":root" | ".dark";

interface TokenMap {
  [name: string]: string;
}

interface ScopedTokens {
  ":root": TokenMap;
  ".dark": TokenMap;
}

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(PROJECT_ROOT, "..", "..", "..");
const LEGACY_CSS = resolve(REPO_ROOT, "packages/design/tokens/styles.css");
const GENERATED_CSS = resolve(PROJECT_ROOT, "build/css/styles.generated.css");
const TAILWIND_PRESET_DIR = resolve(PROJECT_ROOT, "build/tailwind");

/** Strip CSS comments, collapse multi-line var declarations into one line each. */
const stripComments = (input: string): string =>
  input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\r/g, "");

/** Collapse repeated whitespace; lowercase hex; normalize for comparison. */
const normalizeValue = (raw: string): string =>
  raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/#([0-9a-fA-F]{3,8})/g, (_, hex) => `#${hex.toLowerCase()}`)
    .replace(/;$/, "")
    .trim();

/**
 * Parse a CSS file, returning maps of `--var: value` declarations
 * grouped by their owning selector.
 *
 * Supports:  :root { ... }, .dark { ... }
 * Ignores:   nested @theme, @utility, @media, @keyframes (out of scope for parity).
 */
function parseScopes(css: string): ScopedTokens {
  const cleaned = stripComments(css);
  const result: ScopedTokens = { ":root": {}, ".dark": {} };

  // Match top-level :root { ... } and .dark { ... } blocks (handle braces shallowly).
  const blockRegex = /(:root|\.dark)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    const selector = match[1] as Scope;
    const body = match[2] ?? "";
    // Skip blocks nested inside @supports / @media — those still match here, that's fine,
    // they represent valid overrides which we want to merge.
    const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let decl: RegExpExecArray | null;
    while ((decl = declRegex.exec(body)) !== null) {
      const name = decl[1];
      const rawValue = decl[2];
      if (!name || rawValue === undefined) continue;
      const value = normalizeValue(rawValue);
      // Last write wins (mirrors CSS cascade for same-selector @supports overrides).
      result[selector][name] = value;
    }
  }
  return result;
}

interface DiffReport {
  matched: string[];
  missing: string[]; // in legacy, not in generated
  mismatched: { name: string; legacy: string; generated: string }[];
  extra: string[]; // in generated, not in legacy
}

/**
 * Recursively resolve `var(--x)` references in a token map until it stabilizes
 * or reaches the iteration cap. This makes the legacy SSOT comparable to the
 * SD-generated CSS, which inlines all primitive values.
 */
function resolveVarRefs(map: TokenMap): TokenMap {
  const resolved: TokenMap = { ...map };
  const varRefRegex = /var\((--[a-zA-Z0-9_-]+)\)/g;
  for (let i = 0; i < 10; i++) {
    let changed = false;
    for (const [key, value] of Object.entries(resolved)) {
      const next = value.replace(varRefRegex, (full: string, ref: string): string => {
        const sub = resolved[ref];
        if (sub !== undefined && sub !== full) return sub;
        return full;
      });
      if (next !== value) {
        resolved[key] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return resolved;
}

function diff(legacy: TokenMap, generated: TokenMap): DiffReport {
  const report: DiffReport = { matched: [], missing: [], mismatched: [], extra: [] };
  // Apply var() resolution to BOTH sides for fair comparison.
  // Generated SD output already inlines primitives but post-processed extras
  // (--gradient-brand, --focus-ring) reference other vars; resolve those too.
  const legacyResolved = resolveVarRefs(legacy);
  const generatedResolved = resolveVarRefs(generated);
  for (const [name, legacyVal] of Object.entries(legacyResolved)) {
    if (!(name in generatedResolved)) {
      report.missing.push(name);
      continue;
    }
    const generatedVal = generatedResolved[name] ?? "";
    if (legacyVal === generatedVal) {
      report.matched.push(name);
    } else {
      report.mismatched.push({ name, legacy: legacyVal, generated: generatedVal });
    }
  }
  for (const name of Object.keys(generatedResolved)) {
    if (!(name in legacyResolved)) report.extra.push(name);
  }
  return report;
}

function printReport(scope: Scope, report: DiffReport): void {
  const total = report.matched.length + report.missing.length + report.mismatched.length;
  const pct = total === 0 ? 100 : ((report.matched.length / total) * 100).toFixed(1);
  process.stdout.write(
    `\n=== ${scope} — ${report.matched.length}/${total} matched (${pct}%) ===\n`,
  );

  if (report.missing.length > 0) {
    process.stdout.write(
      `\n  Missing (${report.missing.length}) — in legacy SSOT, absent in generated CSS:\n`,
    );
    for (const name of report.missing.slice(0, 50)) {
      process.stdout.write(`    - ${name}\n`);
    }
    if (report.missing.length > 50)
      process.stdout.write(`    ... ${report.missing.length - 50} more\n`);
  }

  if (report.mismatched.length > 0) {
    process.stdout.write(`\n  Mismatched (${report.mismatched.length}) — different value:\n`);
    for (const { name, legacy, generated } of report.mismatched.slice(0, 30)) {
      process.stdout.write(
        `    - ${name}\n      legacy:    ${legacy}\n      generated: ${generated}\n`,
      );
    }
    if (report.mismatched.length > 30)
      process.stdout.write(`    ... ${report.mismatched.length - 30} more\n`);
  }

  if (report.extra.length > 0) {
    process.stdout.write(
      `\n  Extra (${report.extra.length}) — in generated, absent from the runtime copy\n` +
        "  (the sync axis: run `pnpm --filter @nebutra/tokens build`). Whether these came\n" +
        "  from a token file at all is decided by the AUTHORSHIP section below:\n",
    );
    for (const name of report.extra.slice(0, 20)) {
      process.stdout.write(`    + ${name}\n`);
    }
    if (report.extra.length > 20)
      process.stdout.write(`    ... ${report.extra.length - 20} more\n`);
  }
}

/* ------------------------------------------------------------------------- *
 * DIRECTION 2 — authorship check (CSS → DTCG)
 * ------------------------------------------------------------------------- */

interface AllowlistGroup {
  /** Why these exist in the generator instead of tokens/*.json. */
  reason: string;
  /** How a future reader migrates the whole batch in one go. */
  migration: string;
  /** Sorted, unique custom-property names. SHRINK-ONLY. */
  tokens: readonly string[];
}

/**
 * Generator-authored custom properties — the SHRINK-ONLY allowlist.
 *
 * Every name here is a `--x: value` literal inside style-dictionary.config.mjs
 * (or static/base.css), NOT a leaf in tokens/*.json. They are grandfathered so
 * this check can land red-free, and they migrate ON TOUCH: the list may only
 * get shorter. A NEW generator-authored token fails CI immediately.
 *
 * Adding an entry here is not the normal fix — moving the declaration into
 * tokens/*.json is. Grouped by cause so the batches can be migrated together.
 */
const ALLOWLIST_GROUPS: readonly AllowlistGroup[] = [
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — shadcn semantic roles. Each is a " +
      "`--color-x: hsl(var(--x))` alias over a real semantic token so that " +
      "`bg-primary` / `text-muted-foreground` resolve; the value is not authored here.",
    migration:
      "Generate the whole @theme block from the token tree (one bridge line per " +
      "semantic token) instead of hand-listing it in buildTailwindThemeInline().",
    tokens: [
      "--color-accent",
      "--color-accent-foreground",
      "--color-background",
      "--color-border",
      "--color-card",
      "--color-card-foreground",
      "--color-chart-1",
      "--color-chart-2",
      "--color-chart-3",
      "--color-chart-4",
      "--color-chart-5",
      "--color-destructive",
      "--color-destructive-foreground",
      "--color-foreground",
      "--color-info",
      "--color-info-foreground",
      "--color-input",
      "--color-muted",
      "--color-muted-foreground",
      "--color-popover",
      "--color-popover-foreground",
      "--color-primary",
      "--color-primary-foreground",
      "--color-ring",
      "--color-secondary",
      "--color-secondary-foreground",
      "--color-sidebar",
      "--color-sidebar-accent",
      "--color-sidebar-accent-foreground",
      "--color-sidebar-border",
      "--color-sidebar-foreground",
      "--color-sidebar-primary",
      "--color-sidebar-primary-foreground",
      "--color-sidebar-ring",
      "--color-success",
      "--color-success-foreground",
      "--color-warning",
      "--color-warning-foreground",
    ],
  },
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — 12-step semantic scales " +
      "(`--color-neutral-3: var(--neutral-3)`), which is what registers " +
      "`bg-neutral-3` as a utility.",
    migration: "Same batch as the semantic-role bridge above: emit from the token tree.",
    tokens: [
      "--color-blue-1",
      "--color-blue-10",
      "--color-blue-11",
      "--color-blue-12",
      "--color-blue-2",
      "--color-blue-3",
      "--color-blue-4",
      "--color-blue-5",
      "--color-blue-6",
      "--color-blue-7",
      "--color-blue-8",
      "--color-blue-9",
      "--color-cyan-1",
      "--color-cyan-10",
      "--color-cyan-11",
      "--color-cyan-12",
      "--color-cyan-2",
      "--color-cyan-3",
      "--color-cyan-4",
      "--color-cyan-5",
      "--color-cyan-6",
      "--color-cyan-7",
      "--color-cyan-8",
      "--color-cyan-9",
      "--color-neutral-1",
      "--color-neutral-10",
      "--color-neutral-11",
      "--color-neutral-12",
      "--color-neutral-2",
      "--color-neutral-3",
      "--color-neutral-4",
      "--color-neutral-5",
      "--color-neutral-6",
      "--color-neutral-7",
      "--color-neutral-8",
      "--color-neutral-9",
    ],
  },
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — `--nebutra-*` primitive palette " +
      "(the rebrand input layer) exposed as `bg-nebutra-blue-500` utilities.",
    migration: "Same batch: emit one bridge line per primitive token.",
    tokens: [
      "--color-nebutra-blue-100",
      "--color-nebutra-blue-200",
      "--color-nebutra-blue-300",
      "--color-nebutra-blue-400",
      "--color-nebutra-blue-50",
      "--color-nebutra-blue-500",
      "--color-nebutra-blue-600",
      "--color-nebutra-blue-700",
      "--color-nebutra-blue-800",
      "--color-nebutra-blue-900",
      "--color-nebutra-blue-950",
      "--color-nebutra-cyan-100",
      "--color-nebutra-cyan-200",
      "--color-nebutra-cyan-300",
      "--color-nebutra-cyan-400",
      "--color-nebutra-cyan-50",
      "--color-nebutra-cyan-500",
      "--color-nebutra-cyan-600",
      "--color-nebutra-cyan-700",
      "--color-nebutra-cyan-800",
      "--color-nebutra-cyan-900",
      "--color-nebutra-cyan-950",
      "--color-nebutra-neutral-100",
      "--color-nebutra-neutral-200",
      "--color-nebutra-neutral-300",
      "--color-nebutra-neutral-400",
      "--color-nebutra-neutral-50",
      "--color-nebutra-neutral-500",
      "--color-nebutra-neutral-600",
      "--color-nebutra-neutral-700",
      "--color-nebutra-neutral-800",
      "--color-nebutra-neutral-900",
      "--color-nebutra-neutral-950",
    ],
  },
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — Geist compat layer. Aliases over " +
      "`--ds-gray-*` / `--ds-background-*`, the names the scraped Geist icon SVGs " +
      "hardcode. Two spellings are published (`gray-*` and `geist-gray-*`).",
    migration:
      "Migrate together with the `ds.*` token subtree; one bridge line per ds token, " +
      "both spellings derived from the same leaf.",
    tokens: [
      "--color-geist-background-100",
      "--color-geist-gray-100",
      "--color-geist-gray-1000",
      "--color-geist-gray-200",
      "--color-geist-gray-500",
      "--color-geist-gray-600",
      "--color-geist-gray-700",
      "--color-gray-100",
      "--color-gray-1000",
      "--color-gray-200",
      "--color-gray-700",
    ],
  },
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — accent palette stops used by docs / " +
      "marketing surfaces (`--color-amber-200: var(--ds-amber-200)`), plus the " +
      "`--ds-*-start|end` gradient stop pairs.",
    migration:
      "Same batch as the Geist compat layer — these all alias `--ds-*` tokens; " +
      "only the bridge line is generator-authored.",
    tokens: [
      "--color-amber-200",
      "--color-amber-700",
      "--color-amber-900",
      "--color-blue-700",
      "--color-blue-900",
      "--color-green-200",
      "--color-green-700",
      "--color-green-900",
      "--color-pink-300",
      "--color-pink-700",
      "--color-pink-900",
      "--color-purple-200",
      "--color-purple-700",
      "--color-purple-900",
      "--color-red-200",
      "--color-red-700",
      "--color-red-900",
      "--color-teal-300",
      "--color-teal-700",
      "--color-teal-900",
      "--color-trial-end",
      "--color-trial-start",
      "--color-turbo-end",
      "--color-turbo-start",
    ],
  },
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — brand aliases (`--color-brand-primary` " +
      "→ `--brand-primary`), so `text-brand-accent` exists as a utility.",
    migration: "Same batch: emit from the `brand.*` token subtree.",
    tokens: ["--color-brand-accent", "--color-brand-primary", "--color-brand-tertiary"],
  },
  {
    reason:
      "Tailwind v4 `@theme inline` bridge — shadow scale. `--shadow-md: var(--elevation-md)` " +
      "and the glass / ambient / brand / sheen composites; the values live in the " +
      "`elevation.*` and `shadow.*` token subtrees, only the utility name is authored here.",
    migration:
      "Emit `--shadow-<name>` per `elevation.*` / `shadow.*` leaf; delete the hand-written list.",
    tokens: [
      "--shadow-2xl",
      "--shadow-ambient-lg",
      "--shadow-ambient-md",
      "--shadow-ambient-sm",
      "--shadow-brand",
      "--shadow-brand-lg",
      "--shadow-glass-lg",
      "--shadow-glass-md",
      "--shadow-glass-sm",
      "--shadow-lg",
      "--shadow-md",
      "--shadow-sheen",
      "--shadow-sm",
      "--shadow-xl",
      "--shadow-xs",
    ],
  },
  {
    reason:
      "Post-processed gradient alias layer (buildExtras step 2). `--gradient-brand-*` / " +
      "`--gradient-section` / `--gradient-glow` are legacy spellings pointing at the " +
      "canonical `--brand-gradient-*` tokens; several collapse two names onto one token.",
    migration:
      "Model the aliases in semantic.json (e.g. `gradient.brand.glow` → " +
      "`{brand.gradient.radial}`) and drop the literal lines from buildExtras().",
    tokens: [
      "--gradient-brand",
      "--gradient-brand-glow",
      "--gradient-brand-hover",
      "--gradient-brand-logo",
      "--gradient-brand-logo-reverse",
      "--gradient-brand-radial",
      "--gradient-brand-reverse",
      "--gradient-brand-vertical",
      "--gradient-glow",
      "--gradient-section",
    ],
  },
  {
    reason:
      "Primitive brand bridge (buildExtras step 1) — `--nebutra-brand-blue: var(--nebutra-blue-500)`, " +
      "emitted in :root only, with a Display-P3 counterpart inside the @supports block.",
    migration:
      "Add `brand.blue` / `brand.cyan` aliases to core.json referencing the 500 stops; " +
      "the P3 override still needs generator support.",
    tokens: ["--nebutra-brand-blue", "--nebutra-brand-cyan"],
  },
  {
    reason:
      "Composite shorthand (buildExtras step 3). `--transition` is a single-declaration " +
      "shorthand assembled from duration + easing; the `transition.default` DTCG leaf is " +
      "deliberately skipped by the namer because a composite cannot round-trip through it.",
    migration:
      "Teach the CSS formatter to expand a DTCG composite `transition` token into the " +
      "shorthand, then un-skip `transition.default`.",
    tokens: ["--transition"],
  },
  {
    reason:
      "static/base.css — pre-computed alpha edge / halo tokens (2026-05 perf governance, " +
      "replaced ~70 runtime color-mix() calls). Authored in static CSS, concatenated after " +
      "the @theme block, mode-aware via the cascade.",
    migration:
      "Model as `edge.*` / `halo.*` DTCG leaves in themes/light.json + themes/dark.json " +
      "(as a pair) once an rgb-with-alpha token type is settled on.",
    tokens: ["--edge-faint", "--edge-medium", "--edge-soft", "--halo-faint"],
  },
] as const;

interface DeclSite {
  name: string;
  /** Enclosing selector / at-rule, e.g. `:root`, `.dark`, `@theme inline`. */
  scope: string;
  /** 1-based line in the generated CSS. */
  line: number;
}

/** Blank out comments while preserving line count, so line numbers stay usable. */
const blankComments = (input: string): string =>
  input.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));

/**
 * Enumerate EVERY custom-property declaration in the stylesheet, whatever block
 * it sits in — `:root`, `.dark`, `@supports`, `@theme inline`, `@layer`,
 * keyframes. The parity direction only looks at `:root` / `.dark`; the
 * authorship direction must not have that blind spot, because the Tailwind
 * `@theme` block is where most generator-authored tokens live.
 *
 * First declaration of a name wins for reporting purposes.
 */
function enumerateDeclarations(css: string): Map<string, DeclSite> {
  const found = new Map<string, DeclSite>();
  const stack: string[] = [];
  const lines = blankComments(css).split("\n");

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (line === "") return;

    const decl = /^(--[a-zA-Z0-9_-]+)\s*:/.exec(line);
    if (decl?.[1] && !found.has(decl[1])) {
      found.set(decl[1], {
        name: decl[1],
        scope: stack[stack.length - 1] ?? "(top level)",
        line: index + 1,
      });
    }

    // Maintain the block stack. Biome formats the generated CSS one declaration
    // per line, so a line-granular scan is sufficient; the brace tally keeps the
    // stack balanced even on lines that do not follow that shape.
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    for (let i = 0; i < opens; i++) {
      const selector = line.slice(0, line.indexOf("{")).trim();
      stack.push(selector === "" ? "(anonymous block)" : selector);
    }
    for (let i = 0; i < closes; i++) stack.pop();
  });

  return found;
}

/**
 * The set of custom-property names derivable from the DTCG token tree.
 *
 * Read from build/tailwind/*.preset.cjs rather than re-implemented: Style
 * Dictionary emits those files from tokens/*.json through the very same
 * `name/nebutra/css` name transform (and the same `__skip__` filter) that the
 * CSS platform uses. So the two sides cannot disagree about naming rules, and
 * a token added to a JSON file needs no change here.
 */
async function readDerivableNames(): Promise<Set<string>> {
  const require = createRequire(import.meta.url);
  const entries = (await readdir(TAILWIND_PRESET_DIR)).filter((file) =>
    file.endsWith(".preset.cjs"),
  );
  const names = new Set<string>();
  for (const entry of entries) {
    const preset = require(resolve(TAILWIND_PRESET_DIR, entry)) as Record<string, unknown>;
    for (const key of Object.keys(preset)) names.add(`--${key}`);
  }
  return names;
}

/** Guard the allowlist itself: sorted, unique within a group, unique across groups. */
function validateAllowlistShape(): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  ALLOWLIST_GROUPS.forEach((group, groupIndex) => {
    const sorted = [...group.tokens].sort();
    if (sorted.join("\n") !== group.tokens.join("\n")) {
      problems.push(`group #${groupIndex + 1} (${group.reason.slice(0, 48)}…) is not sorted`);
    }
    for (const token of group.tokens) {
      const previous = seen.get(token);
      if (previous !== undefined) {
        problems.push(`${token} listed twice (groups #${previous + 1} and #${groupIndex + 1})`);
      }
      seen.set(token, groupIndex);
    }
  });
  return problems;
}

interface AuthorshipReport {
  /** Not derivable from DTCG and not allowlisted → hard failure. */
  violations: DeclSite[];
  /** Allowlisted but no longer emitted → the ratchet says delete the entry. */
  stale: string[];
  /** Declared properties that DO come from a token file. */
  fromTokens: number;
  /** Size of the whole derivable name set offered by the token tree. */
  derivable: number;
  declared: number;
}

function checkAuthorship(generatedCss: string, derivable: Set<string>): AuthorshipReport {
  const declared = enumerateDeclarations(generatedCss);
  const allowlist = new Set(ALLOWLIST_GROUPS.flatMap((group) => group.tokens));

  const violations = [...declared.values()]
    .filter((site) => !derivable.has(site.name) && !allowlist.has(site.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const stale = [...allowlist].filter((name) => !declared.has(name) || derivable.has(name)).sort();

  const fromTokens = [...declared.keys()].filter((name) => derivable.has(name)).length;

  return { violations, stale, fromTokens, derivable: derivable.size, declared: declared.size };
}

function reportAuthorship(report: AuthorshipReport, generatedPath: string): boolean {
  const allowlisted = ALLOWLIST_GROUPS.reduce((sum, group) => sum + group.tokens.length, 0);
  process.stdout.write(
    `\n=== AUTHORSHIP: ${report.declared} custom properties in the generated CSS — ` +
      `${report.fromTokens} from tokens/*.json, ` +
      `${report.declared - report.fromTokens - report.violations.length} allowlisted ` +
      `generator-authored (${allowlisted} listed), ${report.violations.length} unlisted ` +
      `— token tree offers ${report.derivable} derivable names ===\n`,
  );

  let failed = false;

  if (report.violations.length > 0) {
    failed = true;
    const shortPath = relative(REPO_ROOT, generatedPath);
    process.stderr.write(
      "\n❌ Generator-authored token(s): declared in the generated CSS but NOT derivable\n" +
        "   from the DTCG token tree. A token that lives in the generator is a token\n" +
        "   outside the single source of truth — move it into a token file:\n" +
        report.violations
          .map((site) => `   - ${site.name}   (${site.scope}, ${shortPath}:${site.line})`)
          .join("\n") +
        "\n\n" +
        "   Fix: add the leaf to packages/design/design-tokens/tokens/core.json,\n" +
        "   semantic.json, or themes/light.json + themes/dark.json (ALWAYS as a pair),\n" +
        "   delete the literal from style-dictionary.config.mjs, then re-run:\n" +
        "     pnpm --filter @nebutra/design-tokens build && pnpm --filter @nebutra/tokens build\n\n" +
        "   Only if it genuinely cannot be expressed as a token, add it to a group in\n" +
        "   ALLOWLIST_GROUPS in scripts/verify-parity.ts with a reason and a migration\n" +
        "   note. That list is SHRINK-ONLY — a new entry needs review, it is not the\n" +
        "   default fix.\n",
    );
  }

  if (report.stale.length > 0) {
    failed = true;
    process.stderr.write(
      "\n❌ These allowlist entries are no longer generator-authored (migrated 🎉) —\n" +
        "   delete them from ALLOWLIST_GROUPS in scripts/verify-parity.ts. The list is\n" +
        "   shrink-only, so a stale entry is a failure:\n" +
        report.stale.map((name) => `   - ${name}`).join("\n") +
        "\n",
    );
  }

  if (!failed) {
    process.stdout.write(
      `Authorship OK — ${allowlisted} known generator-authored token(s), 0 new. ` +
        "Every other custom property comes from tokens/*.json.\n",
    );
  }

  return failed;
}

async function main(): Promise<void> {
  let legacyCss: string;
  let generatedCss: string;

  try {
    legacyCss = await readFile(LEGACY_CSS, "utf8");
  } catch (err) {
    console.error(`Failed to read legacy SSOT at ${LEGACY_CSS}:`, err);
    process.exit(1);
  }

  try {
    generatedCss = await readFile(GENERATED_CSS, "utf8");
  } catch (err) {
    console.error(
      `Failed to read generated CSS at ${GENERATED_CSS}.\n` +
        `Did you run \`pnpm --filter @nebutra/design-tokens build\`?\n`,
      err,
    );
    process.exit(1);
  }

  const legacy = parseScopes(legacyCss);
  const generated = parseScopes(generatedCss);

  // The legacy .dark block does NOT redeclare nebutra-* primitives —
  // they cascade from :root. To compare against generated CSS (which
  // re-emits primitives in every scope), merge :root primitives into
  // the .dark map for var() resolution only. Apply same merge to generated.
  const darkLegacy: TokenMap = { ...legacy[":root"], ...legacy[".dark"] };
  const darkGenerated: TokenMap = { ...generated[":root"], ...generated[".dark"] };

  const rootReport = diff(legacy[":root"], generated[":root"]);
  const darkReport = diff(darkLegacy, darkGenerated);

  printReport(":root", rootReport);
  printReport(".dark", darkReport);

  const totalMatched = rootReport.matched.length + darkReport.matched.length;
  const totalCompared =
    rootReport.matched.length +
    rootReport.missing.length +
    rootReport.mismatched.length +
    darkReport.matched.length +
    darkReport.missing.length +
    darkReport.mismatched.length;
  const overallPct = totalCompared === 0 ? 0 : (totalMatched / totalCompared) * 100;

  process.stdout.write(
    `\n=== OVERALL: ${totalMatched}/${totalCompared} (${overallPct.toFixed(1)}%) tokens at parity ===\n\n`,
  );

  // Full parity required — styles.css is generated from DTCG via tokens sync-styles.
  // Any drift fails CI; fix tokens JSON or regenerate styles.
  const PARITY_FLOOR = 1;
  let failed = false;
  if (overallPct / 100 < PARITY_FLOOR - 1e-9) {
    failed = true;
    process.stderr.write(
      `Parity below ${PARITY_FLOOR * 100}% floor (got ${overallPct.toFixed(1)}%).\n` +
        `Runtime SSOT is packages/design/tokens/styles.css (copied from styles.generated.css).\n` +
        `Fix design-tokens JSON and re-run: pnpm --filter @nebutra/design-tokens build && pnpm --filter @nebutra/tokens sync\n`,
    );
  } else {
    process.stdout.write("Parity floor 100% — styles.css generation contract OK.\n");
  }

  // ---- Direction 2: authorship. Parity alone proves only that tokens reached
  // the CSS; this proves nothing else got in.
  const shapeProblems = validateAllowlistShape();
  if (shapeProblems.length > 0) {
    failed = true;
    process.stderr.write(
      "\n❌ ALLOWLIST_GROUPS in scripts/verify-parity.ts is malformed — each group must be\n" +
        "   sorted and every name listed once:\n" +
        shapeProblems.map((problem) => `   - ${problem}`).join("\n") +
        "\n",
    );
  }

  let derivable: Set<string>;
  try {
    derivable = await readDerivableNames();
  } catch (err) {
    console.error(
      `Failed to read Style Dictionary name output in ${TAILWIND_PRESET_DIR}.\n` +
        "The authorship check derives the DTCG name set from build/tailwind/*.preset.cjs.\n" +
        "Did you run `pnpm --filter @nebutra/design-tokens build`?\n",
      err,
    );
    process.exit(1);
  }
  if (derivable.size === 0) {
    console.error(
      `No token names found in ${TAILWIND_PRESET_DIR}/*.preset.cjs — refusing to run the\n` +
        "authorship check against an empty token set (it would flag the entire stylesheet).\n" +
        "Rebuild with `pnpm --filter @nebutra/design-tokens build`.\n",
    );
    process.exit(1);
  }

  if (reportAuthorship(checkAuthorship(generatedCss, derivable), GENERATED_CSS)) failed = true;

  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error("verify-parity failed:", err);
  process.exit(1);
});
