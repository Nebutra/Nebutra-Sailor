import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Docs make factual claims about the repository: a path, a package name, a
 * command to run, a file to edit. Nothing type-checks a sentence, so those
 * claims rot, and a rotten instruction is worse than a missing one — somebody
 * follows it.
 *
 * This file exists because four such claims were found actively causing
 * defects on 2026-07-29:
 *
 *  1. CLAUDE.md called `packages/design/tokens/styles.css` the SOURCE OF TRUTH
 *     in three places and told readers to edit it. It is a build artifact —
 *     `packages/design/tokens/scripts/sync-styles.mjs` copies over it — so the
 *     edits vanished on the next build, silently.
 *  2. CLAUDE.md described `@nebutra/theme` as a "CSS-only multi-theme engine"
 *     with six oklch presets (neon/gradient/dark-dense/minimal/vibrant/ocean).
 *     Those were deleted in 2026-07; the package now ships Brand Packages on
 *     `html[data-brand]`.
 *  3. CLAUDE.md's Rebranding step pointed at `packages/design/theme/themes.css`,
 *     which is now five generated lines aliasing `keyframes.css`.
 *  4. apps/design-docs how-to-use.mdx showed `bg-[var(--background)]` under a
 *     "Good" heading. `--background` holds bare HSL channels, so that form makes
 *     the whole declaration invalid and the browser discards it. The docs were
 *     teaching the bug.
 *
 * Sibling precedent: tests/architecture/landing-structure-drift.test.ts, which
 * asserts that every path a hand-maintained landing data file names exists.
 * Same shape, wider surface.
 *
 * Every assertion below must name the doc and quote the claim when it fails.
 * "expected true to be false" is useless for this class of bug.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");
const CLAUDE_MD = "CLAUDE.md";

const BUILD_ARTIFACT_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  ".git",
  "dist",
  "build",
  "storybook-static",
  "coverage",
  "out",
]);

function read(repoRelative: string): string {
  return readFileSync(join(REPO_ROOT, repoRelative), "utf8");
}

function walk(dir: string, visit: (absolutePath: string) => void): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (BUILD_ARTIFACT_DIRS.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, visit);
    else if (entry.isFile()) visit(abs);
  }
}

/* ------------------------------------------------------------------ *
 * The governed doc set
 * ------------------------------------------------------------------ */

/**
 * Docs a contributor or an agent is expected to follow as instructions.
 * Anything outside this set is prose we do not mechanically police.
 */
function governedDocs(): string[] {
  const docs = new Set<string>([CLAUDE_MD, "README.md"]);

  for (const contentRoot of ["apps/sailor-docs/content"]) {
    walk(join(REPO_ROOT, contentRoot), (abs) => {
      if (abs.endsWith(".mdx") || abs.endsWith(".md")) docs.add(relative(REPO_ROOT, abs));
    });
  }

  // Per-package instruction files only — not CHANGELOG, not story fixtures.
  walk(join(REPO_ROOT, "packages"), (abs) => {
    const name = abs.split("/").pop() as string;
    if (name === "AGENTS.md" || name === "DESIGN.md" || name === "README.md") {
      docs.add(relative(REPO_ROOT, abs));
    }
  });

  return [...docs].sort();
}

/* ------------------------------------------------------------------ *
 * Package graph
 * ------------------------------------------------------------------ */

type PackageRecord = { name: string; dir: string; manifest: string };

function workspacePackages(): Map<string, PackageRecord> {
  const found = new Map<string, PackageRecord>();
  for (const root of ["apps", "packages", "backends", "infra", "workflows", "e2e", "tests"]) {
    walk(join(REPO_ROOT, root), (abs) => {
      if (!abs.endsWith("/package.json")) return;
      try {
        const manifest = JSON.parse(readFileSync(abs, "utf8")) as { name?: string };
        if (manifest.name) {
          found.set(manifest.name, {
            name: manifest.name,
            dir: relative(REPO_ROOT, abs.replace(/\/package\.json$/, "")),
            manifest: relative(REPO_ROOT, abs),
          });
        }
      } catch {
        /* an unparseable manifest is another test's problem */
      }
    });
  }
  return found;
}

const PACKAGES = workspacePackages();

/**
 * Packages a doc may name even though they no longer exist, because the
 * sentence is explicitly about their removal. Each entry must be a name the
 * doc mentions only in that historical sense.
 */
const INTENTIONALLY_HISTORICAL_PACKAGES = new Set([
  // CLAUDE.md: "@nebutra/design-system has been merged into @nebutra/ui".
  "@nebutra/design-system",
]);

/* ------------------------------------------------------------------ *
 * Markdown helpers
 * ------------------------------------------------------------------ */

/** Inline `code` spans, excluding anything inside a fenced block. */
function inlineCodeSpans(source: string): string[] {
  const spans: string[] = [];
  let inFence = false;
  for (const line of source.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const match of line.matchAll(/`([^`\n]+)`/g)) spans.push(match[1] as string);
  }
  return spans;
}

/**
 * Docs mark examples with ✅/❌ (or "Correct"/"Wrong") on a comment line, and the
 * marker governs every line under it until the next marker. A per-line check
 * would read the banned snippet under a `// ❌` comment as an endorsement.
 */
type PolarisedLine = { text: string; lineNumber: number; polarity: "good" | "bad" | null };

const GOOD_MARKER = /✅|\bCorrect\b|\bGood\b|\bDo\b:/;
const BAD_MARKER =
  /❌|🚫|\bWrong\b|\bBad\b|\bNever\b|\bBanned\b|\bDeprecated\b|\bDo NOT\b|\bDon't\b|禁止|不要|已弃用/;

function polarisedLines(source: string): PolarisedLine[] {
  let polarity: "good" | "bad" | null = null;
  return source.split("\n").map((text, index) => {
    // A bad marker wins on a line carrying both (e.g. "✅ … not ❌ …" is rare;
    // "❌ Never …" is the common form).
    if (BAD_MARKER.test(text)) polarity = "bad";
    else if (GOOD_MARKER.test(text)) polarity = "good";
    return { text, lineNumber: index + 1, polarity };
  });
}

/** Contents of the fenced block that follows a given heading. */
function fencedBlockAfter(source: string, heading: string): string[] {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return [];
  let i = start;
  while (i < lines.length && !/^\s*```/.test(lines[i] as string)) i += 1;
  const body: string[] = [];
  for (i += 1; i < lines.length && !/^\s*```/.test(lines[i] as string); i += 1) {
    body.push(lines[i] as string);
  }
  return body;
}

/* ------------------------------------------------------------------ *
 * 1. Paths CLAUDE.md names
 * ------------------------------------------------------------------ */

const TRACKED_ROOTS = [
  "apps",
  "packages",
  "backends",
  "infra",
  "scripts",
  "docs",
  "tests",
  "e2e",
  "workflows",
];

const PATH_PATTERN = new RegExp(`^(?:${TRACKED_ROOTS.join("|")})/[A-Za-z0-9_./-]+$`);

/** Repo-relative paths named in CLAUDE.md prose (inline code spans). */
function pathsInProse(source: string): string[] {
  return [
    ...new Set(
      inlineCodeSpans(source)
        .map((span) => span.trim().replace(/[.,;:]$/, ""))
        // Globs describe a family, not a file — existence is not the question.
        .filter((span) => !span.includes("*") && !span.includes(" "))
        .filter((span) => PATH_PATTERN.test(span)),
    ),
  ];
}

/**
 * The "## Project Structure" tree is an indented directory listing. Rebuild the
 * full paths from the indentation so a stale entry is caught rather than read
 * as plausible.
 */
function pathsInStructureTree(source: string): string[] {
  const paths: string[] = [];
  const stack: Array<{ indent: number; name: string }> = [];

  for (const raw of fencedBlockAfter(source, "## Project Structure")) {
    const withoutComment = raw.split("#")[0] as string;
    if (!/^\s*[A-Za-z_]/.test(withoutComment)) continue;

    const indent = withoutComment.length - withoutComment.trimStart().length;
    // Directory names sit at the head of the line; the first token that is not
    // a `name/` ends the name run and starts the description.
    const names: string[] = [];
    for (const token of withoutComment.trim().split(/\s+/)) {
      if (/^[A-Za-z0-9_.-]+\/$/.test(token)) names.push(token.slice(0, -1));
      else break;
    }
    if (names.length === 0) continue;

    while (stack.length > 0 && (stack[stack.length - 1] as { indent: number }).indent >= indent) {
      stack.pop();
    }
    const prefix = stack.map((frame) => frame.name).join("/");
    for (const name of names) paths.push(prefix ? `${prefix}/${name}` : name);
    // Only an unambiguous single-name line can be a parent of the next line.
    if (names.length === 1) stack.push({ indent, name: names[0] as string });
  }

  return [...new Set(paths)].filter((p) => PATH_PATTERN.test(p));
}

describe("CLAUDE.md — paths", () => {
  const source = read(CLAUDE_MD);

  it("names only directories and files that exist (prose)", () => {
    const claimed = pathsInProse(source);
    expect(
      claimed.length,
      "extractor found no paths in CLAUDE.md prose — regex is broken",
    ).toBeGreaterThan(10);

    const missing = claimed.filter((p) => !existsSync(join(REPO_ROOT, p)));
    expect(
      missing,
      `CLAUDE.md names paths that are not in the repo:\n${missing
        .map((p) => `  - \`${p}\` (claim) — nothing at ${p}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("draws a Project Structure tree of directories that exist", () => {
    const claimed = pathsInStructureTree(source);
    expect(
      claimed.length,
      "structure-tree parser found nothing — heading or fence moved",
    ).toBeGreaterThan(20);

    const missing = claimed.filter((p) => {
      const abs = join(REPO_ROOT, p);
      return !existsSync(abs) || !statSync(abs).isDirectory();
    });
    expect(
      missing,
      `CLAUDE.md's Project Structure tree advertises directories that do not exist:\n${missing
        .map((p) => `  - "${p}/" in the tree — no such directory`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("counts the playwright configs in e2e/ correctly", () => {
    // "e2e/  # smoke/ + golden/ + sleptons/ + 3 playwright configs" — a
    // hand-typed number next to a hand-typed list is two chances to be wrong.
    const line = source
      .split("\n")
      .find((l) => /^e2e\//.test(l.trim()) && l.includes("playwright config"));
    expect(line, "CLAUDE.md no longer describes e2e/ playwright configs").toBeTruthy();

    const claimed = Number((line as string).match(/(\d+)\s+playwright config/)?.[1]);
    const actual = readdirSync(join(REPO_ROOT, "e2e")).filter((f) =>
      /^playwright\..*config\.ts$|^playwright\.config\.ts$/.test(f),
    );
    expect(
      claimed,
      `CLAUDE.md claims "${claimed} playwright configs" in e2e/; there are ${actual.length}: ${actual.join(", ")}`,
    ).toBe(actual.length);
  });

  it("counts the packages it does not enumerate correctly", () => {
    // "(+ ~30 more under platform/, ai/, ops/)" sits at the end of a partial
    // list. If the real remainder has drifted, the tree reads as complete when
    // it is not.
    const treeLines = fencedBlockAfter(source, "## Project Structure");
    const line = treeLines.find((l) => /\+\s*~?\d+\s+more under/.test(l));
    expect(line, 'CLAUDE.md no longer carries a "+ N more under ..." remainder note').toBeTruthy();

    const claimed = Number((line as string).match(/~?(\d+)\s+more under/)?.[1]);
    const categories = ((line as string).match(/under\s+(.+?)\)/)?.[1] ?? "")
      .split(",")
      .map((c) => c.trim().replace(/\/$/, ""))
      .filter(Boolean);

    const enumerated = new Set(pathsInStructureTree(source));
    let remainder = 0;
    const unlisted: string[] = [];
    for (const category of categories) {
      const dir = join(REPO_ROOT, "packages", category);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || BUILD_ARTIFACT_DIRS.has(entry.name)) continue;
        const rel = `packages/${category}/${entry.name}`;
        if (!enumerated.has(rel)) {
          remainder += 1;
          unlisted.push(rel);
        }
      }
    }

    // "~" is an approximation, so allow a modest band rather than an exact hit.
    expect(
      Math.abs(remainder - claimed) <= 5,
      `CLAUDE.md says "~${claimed} more under ${categories.join(", ")}"; the real number of unlisted packages there is ${remainder}:\n${unlisted
        .map((p) => `  - ${p}`)
        .join("\n")}`,
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * 2. Package names and subpath exports
 * ------------------------------------------------------------------ */

function nebutraPackageNames(source: string): string[] {
  return [
    ...new Set(
      [...source.matchAll(/@nebutra\/([a-z0-9][a-z0-9-]*)/g)].map((m) => `@nebutra/${m[1]}`),
    ),
  ];
}

function nebutraSubpaths(source: string): string[] {
  return [
    ...new Set(
      [...source.matchAll(/@nebutra\/([a-z0-9][a-z0-9-]*)((?:\/[A-Za-z0-9_.-]+)+)/g)].map(
        (m) => `@nebutra/${m[1]}${m[2]}`,
      ),
    ),
  ];
}

function exportedSubpaths(pkg: PackageRecord): Set<string> | null {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, pkg.manifest), "utf8")) as {
    exports?: Record<string, unknown> | string;
  };
  if (!manifest.exports || typeof manifest.exports === "string") return null;
  return new Set(Object.keys(manifest.exports));
}

/** `@nebutra/ui/layout` → `./layout`, honouring wildcard export keys. */
function subpathIsExported(pkg: PackageRecord, subpath: string): boolean {
  const exports = exportedSubpaths(pkg);
  // No exports map: Node resolves any file, so we cannot call it wrong here.
  if (exports === null) return true;
  const key = `./${subpath}`;
  if (exports.has(key)) return true;
  for (const declared of exports) {
    if (!declared.includes("*")) continue;
    const pattern = new RegExp(`^${declared.split("*").map(escapeRegExp).join(".*")}$`);
    if (pattern.test(key)) return true;
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("CLAUDE.md — package references", () => {
  const source = read(CLAUDE_MD);

  it("only references @nebutra packages that exist", () => {
    const unknown = nebutraPackageNames(source).filter(
      (name) => !PACKAGES.has(name) && !INTENTIONALLY_HISTORICAL_PACKAGES.has(name),
    );
    expect(
      unknown,
      `CLAUDE.md references packages with no package.json declaring that name:\n${unknown
        .map((n) => `  - \`${n}\``)
        .join(
          "\n",
        )}\nIf the mention is historical, add it to INTENTIONALLY_HISTORICAL_PACKAGES with the sentence that justifies it.`,
    ).toEqual([]);
  });

  it("only imports subpaths those packages actually export", () => {
    const broken: string[] = [];
    for (const specifier of nebutraSubpaths(source)) {
      const [, scope, name, ...rest] = specifier.split("/");
      const pkgName = `@${scope?.replace("@", "")}/${name}`;
      const pkg = PACKAGES.get(pkgName);
      if (!pkg) continue; // reported by the previous case
      if (!subpathIsExported(pkg, rest.join("/"))) {
        broken.push(`\`${specifier}\` — ${pkg.manifest} does not export ./${rest.join("/")}`);
      }
    }
    expect(
      broken,
      `CLAUDE.md documents import specifiers that do not resolve:\n${broken.map((b) => `  - ${b}`).join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 3. Commands CLAUDE.md tells the reader to run
 * ------------------------------------------------------------------ */

type FilterCommand = { raw: string; pkg: string; script: string };

function pnpmFilterCommands(source: string): FilterCommand[] {
  const commands: FilterCommand[] = [];
  for (const match of source.matchAll(
    /pnpm\s+--filter\s+(@nebutra\/[a-z0-9-]+)\s+(?!exec\b|run\b)([a-z][a-z0-9:-]*)/g,
  )) {
    commands.push({ raw: match[0] as string, pkg: match[1] as string, script: match[2] as string });
  }
  return commands;
}

describe("CLAUDE.md — commands", () => {
  const source = read(CLAUDE_MD);

  it("only tells the reader to run scripts that exist", () => {
    const commands = pnpmFilterCommands(source);
    expect(
      commands.length,
      "no `pnpm --filter` commands found — extractor is broken",
    ).toBeGreaterThan(5);

    const broken: string[] = [];
    for (const command of commands) {
      const pkg = PACKAGES.get(command.pkg);
      if (!pkg) {
        broken.push(`\`${command.raw}\` — no package named ${command.pkg}`);
        continue;
      }
      const manifest = JSON.parse(readFileSync(join(REPO_ROOT, pkg.manifest), "utf8")) as {
        scripts?: Record<string, string>;
      };
      if (!manifest.scripts?.[command.script]) {
        broken.push(
          `\`${command.raw}\` — ${pkg.manifest} has no "${command.script}" script (has: ${Object.keys(manifest.scripts ?? {}).join(", ")})`,
        );
      }
    }
    expect(
      broken,
      `CLAUDE.md documents commands that cannot run:\n${broken.map((b) => `  - ${b}`).join("\n")}`,
    ).toEqual([]);
  });

  it("only names root scripts that exist", () => {
    const root = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    const named = [
      ...new Set([...source.matchAll(/`pnpm ([a-z][a-z0-9:-]*)`/g)].map((m) => m[1] as string)),
    ]
      // `pnpm --filter …` and package-manager verbs are not repo scripts.
      .filter((s) => !["install", "add", "remove", "dlx", "exec", "run", "why"].includes(s));
    const missing = named.filter((s) => !root.scripts?.[s]);
    expect(
      missing,
      `CLAUDE.md tells the reader to run root scripts that package.json does not define:\n${missing
        .map((s) => `  - \`pnpm ${s}\``)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("only names scripts/*.mjs guards that exist", () => {
    const named = [
      ...new Set(inlineCodeSpans(source).filter((s) => /^scripts\/[\w.-]+\.(mjs|ts|js)$/.test(s))),
    ];
    const missing = named.filter((s) => !existsSync(join(REPO_ROOT, s)));
    expect(
      missing,
      `CLAUDE.md cites guard scripts that do not exist:\n${missing.map((s) => `  - \`${s}\``).join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 4. No doc may tell the reader to edit a generated file
 * ------------------------------------------------------------------ */

/**
 * Files a build step writes. Derived on 2026-07-30 by reading the write targets
 * of every generator in the design pipeline plus the files whose own header says
 * AUTO-GENERATED:
 *
 *   packages/design/tokens/scripts/sync-styles.mjs      copyFileSync(... , styles.css)
 *   packages/design/tokens/scripts/emit-skins-run.ts    writeFileSync(skins/<id>.css)
 *   packages/design/theme/scripts/sync-themes.mjs       copyFileSync(keyframes.css)
 *                                                       writeFileSync(themes.css alias)
 *   packages/design/theme/scripts/sync-skins.mjs        writeFileSync(skins.css)
 *   packages/design/theme/scripts/sync-languages.mjs    writeFileSync(src/languages.json,
 *                                                         src/built-in-packages.generated.ts)
 *   scripts/brand-apply.ts                              packages/design/brand/src/metadata.ts
 *   packages/design/icons/scripts/generate.ts           packages/design/icons/src/index.ts
 *   scripts/i18n-seed-product-locales.mjs               product-locales.generated.ts
 *   apps/landing/scripts/gen-ai-showcase.ts             ai-showcase.generated.ts
 *
 * Re-derive with:
 *   rg -l "AUTO-GENERATED|do not edit manually" --glob '!node_modules' --glob '!dist'
 */
const GENERATED_FILES = [
  "packages/design/tokens/styles.css",
  "packages/design/tokens/skins/",
  "packages/design/theme/keyframes.css",
  "packages/design/theme/themes.css",
  "packages/design/theme/skins.css",
  "packages/design/theme/src/languages.json",
  "packages/design/theme/src/built-in-packages.generated.ts",
  "packages/design/brand/src/metadata.ts",
  "packages/design/icons/src/index.ts",
  "packages/platform/i18n/src/product-locales.generated.ts",
  "apps/landing/src/components/landing/features/glyphs/ai-showcase.generated.ts",
  "apps/landing/src/lib/seo/route-lastmod.generated.ts",
];

/** Verbs that turn a mention of a file into an instruction to hand-edit it. */
const EDIT_INSTRUCTION = [
  /\bedit\b/i,
  /\bmodify\b/i,
  /\bhand-?write\b/i,
  /\bsource of truth\b/i,
  /\bownership stays in\b/i,
  /\badd (?:a |the )?(?:new )?token(?:s)? (?:to|in)\b/i,
  /编辑/,
  /修改/,
  /所有权/,
];

/** Phrases that make the sentence a warning rather than an instruction. */
const NEGATED = [
  /\bdo not edit\b/i,
  /\bdon't edit\b/i,
  /\bnever edit\b/i,
  /\bnot a place\b/i,
  /\bnot edit\b/i,
  /\bgenerated\b/i,
  /\bbuild artifact\b/i,
  /\bdeprecated\b/i,
  /\bauto-generated\b/i,
  /\b请勿/,
  /\b不要/,
];

describe("generated files are never presented as editable", () => {
  it("no governed doc instructs a reader to hand-edit a build artifact", () => {
    const offenders: string[] = [];

    for (const doc of governedDocs()) {
      const lines = read(doc).split("\n");
      lines.forEach((line, index) => {
        for (const generated of GENERATED_FILES) {
          if (!line.includes(generated)) continue;
          if (NEGATED.some((pattern) => pattern.test(line))) continue;
          if (!EDIT_INSTRUCTION.some((pattern) => pattern.test(line))) continue;
          offenders.push(
            `${doc}:${index + 1} — "${line.trim()}"\n      ${generated} is generated; the edit is overwritten on the next build.`,
          );
        }
      });
    }

    expect(
      offenders,
      `Docs point readers at generated files as if they were editable:\n${offenders
        .map((o) => `  - ${o}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 5. The ✅ examples must not put bare HSL channels in a colour slot
 * ------------------------------------------------------------------ */

/**
 * Tokens declared as bare HSL channel triples (`222 47% 11%`) rather than
 * colours. Read from the stylesheet instead of hardcoded, so a token that
 * changes representation changes this list with it.
 */
function bareChannelTokens(): string[] {
  const css = read("packages/design/tokens/styles.css");
  const names = new Set<string>();
  for (const match of css.matchAll(/^\s*(--[a-z0-9-]+):\s*[\d.]+\s+[\d.]+%\s+[\d.]+%\s*;/gm)) {
    names.add(match[1] as string);
  }
  return [...names].sort();
}

describe("CLAUDE.md — token governance examples", () => {
  it("declares at least the shadcn semantic tokens as bare channels", () => {
    const tokens = bareChannelTokens();
    expect(
      tokens,
      "packages/design/tokens/styles.css no longer declares bare-channel tokens — the extractor must be re-checked before this suite means anything",
    ).toContain("--background");
    expect(tokens.length).toBeGreaterThan(10);
  });

  it("never shows a bare var(--semantic-token) in a colour position on a ✅ line", () => {
    const tokens = bareChannelTokens();
    const source = read(CLAUDE_MD);
    const offenders: string[] = [];

    // Polarity is carried by the nearest preceding `// ✅` / `// ❌` comment
    // inside the fenced example, which is how the file is written.
    let polarity: "good" | "bad" | null = null;
    source.split("\n").forEach((line, index) => {
      if (line.includes("✅")) polarity = "good";
      else if (line.includes("❌")) polarity = "bad";
      if (polarity !== "good") return;

      for (const token of tokens) {
        // A colour position is any `var(--token)` that is not wrapped in a
        // colour function and is not being *declared*.
        const pattern = new RegExp(`(hsl\\(\\s*|oklch\\(\\s*|rgb\\(\\s*)?var\\(${token}\\)`, "g");
        for (const match of line.matchAll(pattern)) {
          if (match[1]) continue; // wrapped — legitimate
          if (new RegExp(`["']${token}["']\\s*:`).test(line)) continue; // declaring it
          offenders.push(
            `${CLAUDE_MD}:${index + 1} — "${line.trim()}"\n      \`var(${token})\` is a bare HSL channel triple; unwrapped in a colour slot the whole declaration is discarded. Use the semantic utility, or hsl(var(${token})).`,
          );
        }
      }
    });

    expect(
      offenders,
      `CLAUDE.md's ✅ examples teach an invalid declaration:\n${offenders.map((o) => `  - ${o}`).join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 6. Package AGENTS.md test-suite claims
 * ------------------------------------------------------------------ */

describe("package AGENTS.md — validation claims", () => {
  it("does not claim a package has no local test suite when it has one", () => {
    const CLAIM =
      /(?:has|there is)\s+no\s+package-local\s+test(?:\s+suite|\s+script|s)?|package currently has no package-local tests/i;
    const offenders: string[] = [];

    for (const doc of governedDocs()) {
      if (!doc.endsWith("/AGENTS.md")) continue;
      const source = read(doc);
      const lines = source.split("\n");
      const hit = lines.findIndex((line) => CLAIM.test(line));
      if (hit === -1) continue;

      const pkgDir = doc.replace(/\/AGENTS\.md$/, "");
      const manifestPath = join(pkgDir, "package.json");
      if (!existsSync(join(REPO_ROOT, manifestPath))) continue;
      const manifest = JSON.parse(read(manifestPath)) as { scripts?: Record<string, string> };
      if (!manifest.scripts?.test) continue;

      const testFiles: string[] = [];
      walk(join(REPO_ROOT, pkgDir), (abs) => {
        if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(abs)) testFiles.push(relative(REPO_ROOT, abs));
      });

      offenders.push(
        `${doc}:${hit + 1} — "${(lines[hit] as string).trim()}"\n      ${manifestPath} defines "test": "${manifest.scripts.test}" and ${testFiles.length} test file(s) exist${testFiles.length > 0 ? ` (e.g. ${testFiles.slice(0, 3).join(", ")})` : ""}.`,
      );
    }

    expect(
      offenders,
      `AGENTS.md files tell agents to skip a package test suite that exists:\n${offenders
        .map((o) => `  - ${o}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 7. Deprecated dependencies must never be recommended
 * ------------------------------------------------------------------ */

describe("governed docs — banned recommendations", () => {
  it("never instructs importing lucide-react", () => {
    // scripts/lint-no-lucide.mjs fails CI on any lucide-react import, so a doc
    // that offers it as an option is instructing the reader into a red build.
    const offenders: string[] = [];
    for (const doc of governedDocs()) {
      for (const line of polarisedLines(read(doc))) {
        if (!/lucide-react/.test(line.text)) continue;
        if (line.polarity === "bad") continue;
        // A row in a tier table that names it as tier 3 is descriptive.
        if (
          /banned|deprecated|zero new|removed|migrat|swept|prohibit|no longer|only aliases/i.test(
            line.text,
          )
        ) {
          continue;
        }
        offenders.push(`${doc}:${line.lineNumber} — "${line.text.trim()}"`);
      }
    }
    expect(
      offenders,
      `Docs present lucide-react as an allowed source, but scripts/lint-no-lucide.mjs fails CI on any such import:\n${offenders
        .map((o) => `  - ${o}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("never shows a component-level brand-blue focus ring as a pattern to copy", () => {
    // CLAUDE.md: "do NOT add component-level focus rings ... NEVER reintroduce
    // hardcoded brand-blue rings". The global :focus-visible rule in
    // packages/design/design-tokens/static/base.css already supplies one.
    const offenders: string[] = [];
    for (const doc of governedDocs()) {
      for (const line of polarisedLines(read(doc))) {
        if (!/focus:ring-\[var\(--blue-9\)\]/.test(line.text)) continue;
        if (line.polarity === "bad") continue;
        offenders.push(`${doc}:${line.lineNumber} — "${line.text.trim()}"`);
      }
    }
    expect(
      offenders,
      `Docs show the banned hardcoded brand-blue focus ring as a pattern to copy:\n${offenders
        .map((o) => `  - ${o}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 8. Import specifiers in the published docs sites
 * ------------------------------------------------------------------ */

/**
 * SHRINK-ONLY ALLOWLIST, same shape as `repositorySeam.allowlist` in
 * governance.config.json (see scripts/governance/lint-repository-seam.mjs):
 * a sorted committed list, anything not on it fails, and an entry that stops
 * matching must be deleted rather than left to rot.
 *
 * Every entry below is a docs page that documents an API which has never
 * existed, not a specifier typo with a correct target to swap in. They are
 * blocked on a PRODUCT DECISION that a drift test cannot make:
 *
 *   DECISION REQUIRED — `@nebutra/sdk` / `@nebutra/react` (13 entries).
 *     Introduced by commit 966f9e4e ("docs(mintlify): scaffold complete
 *     bilingual documentation framework", 2026-03-31) as an aspirational
 *     SDK-doc template. `createClient`, `verifyToken`, `NebutraError`,
 *     `useNebutraUser`, `useNebutraOrg`, `useNebutraToken`, `NebutraProvider`
 *     have zero matches anywhere in the repo outside apps/sailor-docs. No
 *     rename or removal in history — they were never implemented.
 *     Decide: ship a customer-facing SDK matching these ~7 pages, or rewrite
 *     the pages around the gateway's real REST API.
 *
 *   DECISION REQUIRED — `@nebutra/integrations` / `defineIntegration` (1 entry).
 *     `packages/integrations/` is a category directory, not a package, and
 *     `defineIntegration` has zero matches. The real extension path is a
 *     closed `IntegrationCatalogType` union in
 *     apps/web/src/lib/integrations/catalog.tsx backed by a Prisma enum and
 *     extended by a PR — not a plugin function a customer can call.
 *     Decide: build a real `defineIntegration` plugin API, or rewrite the
 *     "Adding a new integration" section around the closed-enum path.
 *
 *   DECISION REQUIRED — `@nebutra/billing/react` (2 entries).
 *     `requirePlan` and `PlanGate` are not exported from any of the ten
 *     subpaths of packages/commerce/billing, and the package contains no .tsx
 *     files at all, so the documented component cannot exist. The nearest real
 *     building blocks (`checkEntitlement`/`requireEntitlement`/`FEATURES`, plus
 *     `Can`/`usePermission` from @nebutra/permissions) key off entitlements
 *     rather than plan hierarchy and ship no upgrade-prompt component, so a
 *     specifier swap would still teach a fictional signature.
 *     Decide: export real `requirePlan`/`PlanGate`, or rewrite paywall.mdx
 *     around the entitlements API.
 *
 * Fixing any of the above means DELETING its entries here. Adding an entry
 * requires the same class of justification: a documented API that does not
 * exist and whose replacement is a product call, never a claim someone could
 * simply correct.
 */
const MISSING_PACKAGE_ALLOWLIST: readonly string[] = [
  "@nebutra/integrations @ apps/sailor-docs/content/docs/en/integrations/overview.mdx",
  "@nebutra/react @ apps/sailor-docs/content/docs/en/quickstart/react.mdx",
  "@nebutra/react @ apps/sailor-docs/content/docs/en/sdks/javascript.mdx",
  "@nebutra/react @ apps/sailor-docs/content/docs/zh/quickstart/react.mdx",
  "@nebutra/react @ apps/sailor-docs/content/docs/zh/sdks/javascript.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/en/api-reference/authentication.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/en/guides/error-handling.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/en/quickstart/nextjs.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/en/quickstart/node.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/en/sdks/javascript.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/zh/guides/error-handling.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/zh/quickstart/nextjs.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/zh/quickstart/node.mdx",
  "@nebutra/sdk @ apps/sailor-docs/content/docs/zh/sdks/javascript.mdx",
];

const UNRESOLVED_SUBPATH_ALLOWLIST: readonly string[] = [
  "@nebutra/billing/react @ apps/sailor-docs/content/docs/en/payments/paywall.mdx",
  "@nebutra/billing/react @ apps/sailor-docs/content/docs/zh/payments/paywall.mdx",
];

/**
 * Applies a shrink-only allowlist to a set of observed offenders.
 *
 * `unlisted` fails the build: a new wrong claim. `stale` fails it too, because
 * an allowlist that keeps entries after the doc is fixed stops being a ratchet
 * and becomes a list of things nobody has to look at again.
 */
function ratchet(
  observed: Map<string, string[]>,
  allowlist: readonly string[],
): { unlisted: string[]; stale: string[] } {
  const allowed = new Set(allowlist);
  const seen = new Set<string>();
  const unlisted: string[] = [];
  for (const [specifier, docs] of observed) {
    for (const doc of docs) {
      const key = `${specifier} @ ${doc}`;
      if (allowed.has(key)) seen.add(key);
      else unlisted.push(key);
    }
  }
  return {
    unlisted: unlisted.sort(),
    stale: allowlist.filter((entry) => !seen.has(entry)),
  };
}

describe("docs sites — import specifiers", () => {
  // Every governed doc, not only the two docs sites: a package's own DESIGN.md
  // is copied from just as often as a published page.
  const docsSiteDocs = () => governedDocs();

  it("keeps both decision-blocked allowlists sorted and free of duplicates", () => {
    for (const [label, list] of [
      ["MISSING_PACKAGE_ALLOWLIST", MISSING_PACKAGE_ALLOWLIST],
      ["UNRESOLVED_SUBPATH_ALLOWLIST", UNRESOLVED_SUBPATH_ALLOWLIST],
    ] as const) {
      expect([...list], `${label} must be sorted so a diff shows exactly what moved`).toEqual(
        [...list].sort(),
      );
      expect(new Set(list).size, `${label} has duplicate entries`).toBe(list.length);
    }
  });

  it("only import @nebutra packages that exist", () => {
    const observed = new Map<string, string[]>();
    for (const doc of docsSiteDocs()) {
      const source = read(doc);
      for (const match of source.matchAll(/from "(@nebutra\/[a-z0-9-]+)(?:\/[^"]*)?"/g)) {
        const name = match[1] as string;
        if (PACKAGES.has(name)) continue;
        const list = observed.get(name) ?? [];
        if (!list.includes(doc)) list.push(doc);
        observed.set(name, list);
      }
    }

    const { unlisted, stale } = ratchet(observed, MISSING_PACKAGE_ALLOWLIST);

    expect(
      unlisted,
      `Docs teach imports from @nebutra packages that do not exist:\n${unlisted
        .map((entry) => {
          const [specifier, doc] = entry.split(" @ ");
          return `  - ${doc} imports \`from "${specifier}"\` — no package.json in the workspace declares that name.`;
        })
        .join(
          "\n",
        )}\nFix the doc. Only add an entry to MISSING_PACKAGE_ALLOWLIST if the page documents an API that has never existed and the replacement is a product decision — and name that decision in the comment above the list.`,
    ).toEqual([]);

    expect(
      stale,
      `MISSING_PACKAGE_ALLOWLIST entries no longer match anything and must be deleted (the list may only shrink):\n${stale
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("only import subpaths those packages export", () => {
    const observed = new Map<string, string[]>();
    for (const doc of docsSiteDocs()) {
      const source = read(doc);
      for (const match of source.matchAll(
        /from "@nebutra\/([a-z0-9-]+)((?:\/[A-Za-z0-9_.-]+)+)"/g,
      )) {
        const name = `@nebutra/${match[1]}`;
        const pkg = PACKAGES.get(name);
        if (!pkg) continue; // reported above
        const subpath = (match[2] as string).slice(1);
        if (subpathIsExported(pkg, subpath)) continue;
        const key = `${name}/${subpath}`;
        const list = observed.get(key) ?? [];
        if (!list.includes(doc)) list.push(doc);
        observed.set(key, list);
      }
    }

    const { unlisted, stale } = ratchet(observed, UNRESOLVED_SUBPATH_ALLOWLIST);

    expect(
      unlisted,
      `Docs teach import specifiers that do not resolve:\n${unlisted
        .map((entry) => {
          const [specifier, doc] = entry.split(" @ ");
          const pkgName = (specifier as string).split("/").slice(0, 2).join("/");
          const exported = [...(exportedSubpaths(PACKAGES.get(pkgName) as PackageRecord) ?? [])];
          return `  - ${doc} imports \`from "${specifier}"\` — ${pkgName} exports only ${exported.join(", ")}.`;
        })
        .join(
          "\n",
        )}\nEither correct the specifier or add the export key. Only allowlist it if the symbols the page documents do not exist at all and building them is a product decision.`,
    ).toEqual([]);

    expect(
      stale,
      `UNRESOLVED_SUBPATH_ALLOWLIST entries no longer match anything and must be deleted (the list may only shrink):\n${stale
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * 9. Hand-typed counts in README.md
 * ------------------------------------------------------------------ */

/**
 * `README.md` is GENERATED: `scripts/brand-apply.ts` renders it from
 * `README.template.md` (and the same for `README.zh-CN.md` / `README.ja.md`),
 * which is why the first correction to these counts disappeared — it was made
 * in the rendered file, and the next render restored the stale numbers. The
 * editable source is the template.
 *
 * Both files are checked. Asserting on the template is what makes the fix
 * durable; asserting on the rendered file is what a reader actually sees.
 * tests/architecture/readme-template-drift.test.ts guarantees the two agree,
 * and it does so by running brand-apply and restoring afterwards — so
 * `README.md` is briefly overwritten mid-suite. That is harmless here only
 * because both files are asserted to carry the same numbers; if this check
 * covered the rendered file alone it would read whichever version won the
 * race, which is how this assertion came to pass in isolation and fail in the
 * full suite.
 */
const README_COUNT_SOURCES = ["README.template.md", "README.md"];

describe("README — package category counts", () => {
  it("counts the packages in each category correctly, in the template and the rendered file", () => {
    const offenders: string[] = [];
    let rowsSeen = 0;

    for (const doc of README_COUNT_SOURCES) {
      const source = read(doc);
      for (const match of source.matchAll(/([a-z-]+)\/\s+#\s*(\d+)\s+pkgs?/g)) {
        const category = match[1] as string;
        const claimed = Number(match[2]);
        const dir = join(REPO_ROOT, "packages", category);
        if (!existsSync(dir)) continue;
        rowsSeen += 1;
        const actual = readdirSync(dir, { withFileTypes: true })
          .filter(
            (e) => e.isDirectory() && !BUILD_ARTIFACT_DIRS.has(e.name) && !e.name.startsWith("."),
          )
          .map((e) => e.name);
        if (actual.length !== claimed) {
          offenders.push(
            `${doc} — "${category}/ # ${claimed} pkgs" — packages/${category}/ holds ${actual.length}: ${actual.join(", ")}`,
          );
        }
      }
    }

    expect(
      rowsSeen,
      "no `<category>/ # N pkgs` rows found in README.template.md or README.md — extractor is broken",
    ).toBeGreaterThan(0);
    expect(
      offenders,
      `README carries stale package counts:\n${offenders
        .map((o) => `  - ${o}`)
        .join(
          "\n",
        )}\nFix README.template.md and run \`pnpm brand:apply\`; editing README.md alone is undone by the next render.`,
    ).toEqual([]);
  });
});
