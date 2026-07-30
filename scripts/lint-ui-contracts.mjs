#!/usr/bin/env node

// CI guard: the four component-contract rules that the design-system docs state
// but nothing checked, all in one script.
//
// Why one script and not four: nine scripts that each grep one pattern are
// harder to keep honest than four that each own a family. This one owns the
// "component contract" family — the invariants a component must satisfy for the
// thing it renders to actually paint and actually be operable.
//
//   1. elevation-ramp  — shadow-[…] that re-states a ramp step, plus two forms
//                        that are wrong regardless of the ramp:
//                          a. a shadow coloured with var(--foreground) —
//                             near-white in dark mode, so the shadow becomes a
//                             white glow instead of a shadow;
//                          b. a negative spread larger than the blur — the
//                             shadow rect contracts further than the blur can
//                             bleed, so nothing paints at all.
//   2. button-type     — <button> with no explicit type. Inside a <form> the
//                        HTML default is type="submit", so an unrelated icon
//                        button submits the form.
//   3. icon-button-name — an icon-only <button> with no accessible name. To a
//                        screen reader it is an unlabelled button.
//   4. bare-channel    — var(--token) in a colour position where --token is
//                        declared as a bare HSL channel triple. CSS discards
//                        the WHOLE declaration, silently: the class is in the
//                        stylesheet, the element carries it, nothing paints.
//
// SCOPE NOTE on rule 4: this is a STATIC APPROXIMATION. It catches the common
// written forms early, in the editor, for free. It does NOT replace
// scripts/audit-css-var-types.mjs, which resolves every var() in a BUILT
// stylesheet against the values that stylesheet defines and asks the browser's
// own parser whether the declaration survived. Only the runtime check sees
// var() chains, cascade layers, and third-party CSS. Run both.
//
// EXPLICITLY NOT COVERED: "use CVA for variants, not conditional class
// strings". See the CVA note at the bottom of this file — it is not mechanically
// expressible and should not be stated in the docs as an enforced rule.
//
// Escape hatch, per line or on the line above:
//     // @allow-ui-contract: <reason>
// Bulk absorption of pre-existing debt: the SHRINK_ONLY allowlists below. They
// may only shrink — an entry that no longer matches anything FAILS the run, so
// a fixed offender cannot leave its exemption behind.
//
// Run: node scripts/lint-ui-contracts.mjs
// Exit 1 on any violation, and on any stale allowlist entry.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TOKENS_CSS = "packages/design/tokens/styles.css";

/**
 * Trees scanned. packages/design/ui/src is the point of the exercise — it is
 * the ~310-component library every app renders, so a contract broken there
 * reaches further than one broken in a single app. apps/<app>/src is included
 * because these four rules are about rendered output, which apps also produce.
 */
const SCAN_GLOBS = ["packages/design/ui/src", "apps/*/src"];

const EXCLUDE_DIRS = [
  "node_modules",
  ".next",
  ".open-next",
  "storybook-static",
  "dist",
  ".turbo",
  ".deploy",
];

/**
 * Structural exclusions — files whose whole job is to show markup rather than
 * ship it. Excluded from every rule, not allowlisted, because they will never
 * be "fixed".
 */
const NOT_SHIPPED_UI = [
  /\.stories\.[jt]sx?$/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/__tests__\//,
  /\/__mocks__\//,
];

/* ------------------------------------------------------------------ *
 * Shrink-only allowlists — one per rule, keyed by file path.
 * Entries migrate ON-TOUCH. A stale entry fails the run.
 * ------------------------------------------------------------------ */

const SHRINK_ONLY = {
  /**
   * shadow-[var(--elevation-*)] / shadow-[var(--shadow-*)] spellings of a step
   * that already has a utility. Absorbed 2026-07-30 when this rule first ran.
   */
  "elevation-ramp": [
    "apps/idp/src/app/oauth/authorize/page.tsx",
    "apps/idp/src/app/oauth/login/page.tsx",
    "apps/idp/src/app/page.tsx",
    "apps/landing/src/components/landing/blog-motion-showcase.tsx",
    "apps/web/src/components/theme-playground/theme-playground-workbench.tsx",
  ],
  /**
   * Shadows coloured with the foreground token. The one absorbed case mixes
   * foreground 94% into transparent, which is the *correct* adaptive hairline
   * rather than the white-glow failure the rule targets.
   */
  "shadow-foreground": ["apps/landing/src/components/landing/RoadmapTimeline.tsx"],
  /**
   * Negative spread exceeding blur. EMPTY, and it must stay that way — this
   * failure class paints nothing, so an entry here is a bug someone chose to
   * keep.
   */
  "shadow-invisible": [],
  /**
   * A rendered code sample on the public features page that teaches
   * `<button>` without a type. Allowlisted rather than structurally exempted:
   * the sample is what readers copy, so it should carry type="button" too.
   */
  "button-type": ["apps/landing/src/components/landing/features/feature-code-samples.ts"],
  "icon-button-name": [],
  "bare-channel": [],
};

/* ------------------------------------------------------------------ *
 * Source loading
 * ------------------------------------------------------------------ */

const repoFiles = (pattern, globs) => {
  const excludes = EXCLUDE_DIRS.map((d) => `--glob '!**/${d}/**'`).join(" ");
  try {
    return execSync(
      `rg -l --glob '*.tsx' --glob '*.ts' --glob '*.css' --glob '!*.d.ts' ${excludes} ` +
        `${JSON.stringify(pattern)} ${globs.join(" ")}`,
      { encoding: "utf-8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return []; // rg exits 1 on zero matches
  }
};

const isNotShippedUi = (file) => NOT_SHIPPED_UI.some((re) => re.test(file));

/**
 * Blank out comment bodies while preserving byte offsets and newlines, so line
 * numbers stay exact. Without this the scan reports JSDoc examples: seven of the
 * seventeen `<button>`-without-type hits on first run were `@example` blocks.
 */
const blankComments = (source) => {
  const out = source.split("");
  let i = 0;
  let state = "code";
  let quote = null;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (state === "code") {
      if (quote) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === quote) quote = null;
        i += 1;
        continue;
      }
      if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
        quote = source[i];
        i += 1;
        continue;
      }
      if (two === "//") {
        state = "line";
        out[i] = " ";
        out[i + 1] = " ";
        i += 2;
        continue;
      }
      if (two === "/*") {
        state = "block";
        out[i] = " ";
        out[i + 1] = " ";
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (state === "line") {
      if (source[i] === "\n") state = "code";
      else out[i] = " ";
      i += 1;
      continue;
    }
    // block
    if (two === "*/") {
      out[i] = " ";
      out[i + 1] = " ";
      state = "code";
      i += 2;
      continue;
    }
    if (source[i] !== "\n") out[i] = " ";
    i += 1;
  }
  return out.join("");
};

const lineAt = (source, index) => source.slice(0, index).split("\n").length;

const violations = [];
const matchedFilesByRule = new Map();

const record = (rule, file, line, message, text) => {
  let seen = matchedFilesByRule.get(rule);
  if (!seen) {
    seen = new Set();
    matchedFilesByRule.set(rule, seen);
  }
  seen.add(file);
  if ((SHRINK_ONLY[rule] ?? []).includes(file)) return;
  violations.push({ rule, file, line, message, text: String(text).trim().slice(0, 160) });
};

/** Suppressed by `// @allow-ui-contract:` on this line or the one above. */
const isSuppressed = (lines, lineNo) =>
  /@allow-ui-contract:/.test(lines[lineNo - 1] ?? "") ||
  /@allow-ui-contract:/.test(lines[lineNo - 2] ?? "");

/* ------------------------------------------------------------------ *
 * Rule 1 — elevation ramp
 * ------------------------------------------------------------------ */

/**
 * The ramp, read from the stylesheet rather than hardcoded: every `--shadow-*`
 * alias in packages/design/tokens/styles.css becomes a `shadow-*` utility under
 * Tailwind v4's @theme, and each aliases an `--elevation-*` value. So both
 * spellings of a step are known, and a step added to the stylesheet is picked
 * up here for free.
 */
function readRamp() {
  const css = readFileSync(TOKENS_CSS, "utf-8");
  const steps = new Map(); // token name -> utility
  for (const m of css.matchAll(/^\s*--shadow-([a-z0-9-]+):\s*var\((--elevation-[a-z0-9-]+)\)/gm)) {
    const utility = `shadow-${m[1]}`;
    steps.set(`--shadow-${m[1]}`, utility);
    steps.set(m[2], utility);
  }
  return steps;
}

const RAMP = readRamp();
if (RAMP.size === 0) {
  process.stderr.write(
    `\n❌ lint-ui-contracts: no --shadow-* ramp steps found in ${TOKENS_CSS}.\n` +
      "   The elevation-ramp rule reads the ramp from that file; if the shape\n" +
      "   changed, fix readRamp() rather than letting the rule silently pass.\n\n",
  );
  process.exit(1);
}

/** Split a box-shadow value on top-level commas (layers), ignoring nested fns. */
const shadowLayers = (value) => {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
};

/**
 * Length tokens of one layer, in order. Tailwind arbitrary values use `_` for
 * spaces; CSS uses whitespace. Both normalize to the same token list.
 */
const layerLengths = (layer) =>
  layer
    .replace(/^inset[\s_]+/, "")
    .split(/[\s_]+/)
    .filter((t) => /^-?[\d.]+(?:px|rem|em)?$/.test(t))
    .map((t) => Number.parseFloat(t));

/** blur is the 3rd length, spread the 4th (offset-x offset-y blur spread). */
const invisibleSpread = (layer) => {
  const lens = layerLengths(layer);
  if (lens.length < 4) return null;
  const [, , blur, spread] = lens;
  if (spread < 0 && Math.abs(spread) > blur) return { blur, spread };
  return null;
};

// No leading \b: a Tailwind arbitrary value separates tokens with `_`
// (`shadow-[0_4px_8px_var(--foreground)]`), and `_` is a word character, so a
// word boundary never occurs before `var(` in exactly the form the codebase
// writes most often. Verified 2026-07-30: with \b the Tailwind form was missed
// and only the space-separated box-shadow form matched.
const FOREGROUND_SHADOW = /var\(\s*--foreground\s*\)/;

function checkShadows(file, source, lines) {
  // Tailwind arbitrary utility: shadow-[…] / dark:hover:shadow-[…] alike.
  for (const m of source.matchAll(/shadow-\[([^\]]*)\]/g)) {
    const value = m[1];
    const line = lineAt(source, m.index);
    if (isSuppressed(lines, line)) continue;
    const raw = lines[line - 1] ?? m[0];

    const rampHit = [...RAMP.entries()].find(([token]) =>
      new RegExp(`var\\(\\s*${token}\\s*\\)`).test(value),
    );
    if (rampHit) {
      record(
        "elevation-ramp",
        file,
        line,
        `shadow-[var(${rampHit[0]})] re-states a ramp step — use \`${rampHit[1]}\``,
        raw,
      );
    }

    if (FOREGROUND_SHADOW.test(value)) {
      record(
        "shadow-foreground",
        file,
        line,
        "shadow coloured with var(--foreground) — that token is near-white in dark mode, so the shadow renders as a white glow. Use a shadow token or an explicit neutral.",
        raw,
      );
    }

    for (const layer of shadowLayers(value)) {
      const bad = invisibleSpread(layer);
      if (!bad) continue;
      record(
        "shadow-invisible",
        file,
        line,
        `shadow layer \`${layer}\` has spread ${bad.spread}px against blur ${bad.blur}px — the shadow contracts further than the blur can bleed, so nothing paints`,
        raw,
      );
    }
  }

  // The same two hard errors in a CSS `box-shadow:` / JSX `boxShadow:` value.
  for (const m of source.matchAll(/box-?[Ss]hadow\s*[:=]\s*([^;\n]*)/g)) {
    // A JSX style object quotes its value (`boxShadow: "0 0 4px -12px …"`).
    // Left in place the quote fuses onto the first length and the layer parses
    // one token short, which hid exactly this failure class on first run.
    const value = m[1].replace(/["'`]/g, " ");
    const line = lineAt(source, m.index);
    if (isSuppressed(lines, line)) continue;
    const raw = lines[line - 1] ?? m[0];
    if (FOREGROUND_SHADOW.test(value)) {
      record(
        "shadow-foreground",
        file,
        line,
        "box-shadow coloured with var(--foreground) — near-white in dark mode, so the shadow renders as a white glow",
        raw,
      );
    }
    for (const layer of shadowLayers(value)) {
      const bad = invisibleSpread(layer);
      if (!bad) continue;
      record(
        "shadow-invisible",
        file,
        line,
        `box-shadow layer \`${layer}\` has spread ${bad.spread}px against blur ${bad.blur}px — nothing paints`,
        raw,
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * Rules 2 & 3 — <button> contracts
 * ------------------------------------------------------------------ */

/**
 * Read the attribute text of a JSX opening tag starting at `start` (the `<`),
 * tracking quotes and brace depth so `className={cn(a, b)}` and `onClick={() =>
 * x > 1}` do not terminate the tag early. Returns null on an unterminated tag.
 */
function readOpeningTag(source, start) {
  let i = start;
  let depth = 0;
  let quote = null;
  while (i < source.length) {
    const c = source[i];
    if (quote) {
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      i += 1;
      continue;
    }
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) {
      return { attrs: source.slice(start, i), end: i, selfClosing: source[i - 1] === "/" };
    }
    i += 1;
  }
  return null;
}

/** Children between an opening tag's `>` and its matching `</button>`. */
function readChildren(source, afterOpen) {
  let depth = 1;
  let i = afterOpen;
  while (i < source.length) {
    if (source.startsWith("<button", i)) depth += 1;
    else if (source.startsWith("</button", i)) {
      depth -= 1;
      if (depth === 0) return source.slice(afterOpen, i);
    }
    i += 1;
  }
  return null;
}

const HAS_ACCESSIBLE_NAME = /\baria-label(?:ledby)?\s*=|\btitle\s*=/;

/**
 * Children that are nothing but self-closing elements — `<Icon />`, possibly
 * several. No text node, no `{expression}` that could resolve to text. This is
 * the tight definition on purpose: `{label}` might be a string, so a button
 * containing one is left alone rather than guessed at.
 */
function isIconOnly(children) {
  const remainder = children
    .replace(/<[A-Za-z][^<>]*\/>/g, "") // self-closing elements
    .replace(/\s+/g, "");
  return remainder === "" && /<[A-Za-z][^<>]*\/>/.test(children);
}

function checkButtons(file, source, lines) {
  for (const m of source.matchAll(/<button(?=[\s/>])/g)) {
    const tag = readOpeningTag(source, m.index);
    if (!tag) continue;
    const line = lineAt(source, m.index);
    if (isSuppressed(lines, line)) continue;
    const raw = lines[line - 1] ?? m[0];
    const { attrs } = tag;

    if (!/\btype\s*=/.test(attrs)) {
      // A spread may carry `type` from props; that is not statically knowable,
      // so a spread suppresses the finding rather than producing a guess.
      if (!/\{\s*\.\.\./.test(attrs)) {
        record(
          "button-type",
          file,
          line,
          'missing type="button" — inside a <form> the HTML default is type="submit", so this button submits the form',
          raw,
        );
      }
    }

    if (tag.selfClosing) continue;
    const children = readChildren(source, tag.end + 1);
    if (children === null) continue;
    if (!isIconOnly(children)) continue;
    if (HAS_ACCESSIBLE_NAME.test(attrs)) continue;
    record(
      "icon-button-name",
      file,
      line,
      "icon-only button with no accessible name — add aria-label, aria-labelledby, or a visible text child",
      raw,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Rule 4 — bare-channel tokens in a colour position
 * ------------------------------------------------------------------ */

/**
 * Tokens declared as bare HSL channel triples (`222 47% 11%`) rather than
 * colours. Read from the stylesheet, not hardcoded, because the set changes:
 * a token that switches representation changes this list with it.
 */
function bareChannelTokens() {
  const css = readFileSync(TOKENS_CSS, "utf-8");
  const names = new Set();
  for (const m of css.matchAll(/^\s*(--[a-z0-9-]+):\s*[\d.]+\s+[\d.]+%\s+[\d.]+%\s*;/gm)) {
    names.add(m[1]);
  }
  return [...names].sort();
}

const BARE_TOKENS = bareChannelTokens();
if (BARE_TOKENS.length === 0) {
  process.stderr.write(
    `\n❌ lint-ui-contracts: no bare-channel tokens found in ${TOKENS_CSS}.\n` +
      "   The bare-channel rule reads them from that file; if the declarations\n" +
      "   changed shape, fix bareChannelTokens() rather than passing vacuously.\n\n",
  );
  process.exit(1);
}

const BARE_TOKEN_SET = new Set(BARE_TOKENS);

function checkBareChannels(file, source, lines) {
  for (const m of source.matchAll(/(hsla?\(\s*|oklch\(\s*|rgba?\(\s*)?var\((--[a-z0-9-]+)\)/g)) {
    const [, wrapper, token] = m;
    if (wrapper) continue; // wrapped in a colour function — legitimate
    if (!BARE_TOKEN_SET.has(token)) continue;
    const line = lineAt(source, m.index);
    if (isSuppressed(lines, line)) continue;
    const raw = lines[line - 1] ?? m[0];
    // Aliasing the triple onto another custom property passes it along
    // unchanged, which is valid: `--card-bg: var(--background);`
    if (/^\s*--[a-z0-9-]+:\s*var\(--[a-z0-9-]+\)\s*;?\s*$/.test(raw)) continue;
    record(
      "bare-channel",
      file,
      line,
      `var(${token}) is a bare HSL channel triple; unwrapped in a colour position CSS discards the WHOLE declaration and nothing paints. Use the semantic utility, or hsl(var(${token})).`,
      raw,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Drive
 * ------------------------------------------------------------------ */

const candidates = new Set([
  ...repoFiles("shadow-\\[|box-?[Ss]hadow\\s*[:=]", SCAN_GLOBS),
  ...repoFiles("<button", SCAN_GLOBS),
  ...repoFiles("var\\(--", SCAN_GLOBS),
]);

let scanned = 0;
for (const file of [...candidates].sort()) {
  if (isNotShippedUi(file)) continue;
  scanned += 1;
  const original = readFileSync(file, "utf-8");
  const source = blankComments(original);
  const lines = original.split("\n");
  checkShadows(file, source, lines);
  checkButtons(file, source, lines);
  checkBareChannels(file, source, lines);
}

/* Stale allowlist entries fail too — a fixed offender may not keep its exemption. */
const stale = [];
for (const [rule, entries] of Object.entries(SHRINK_ONLY)) {
  const matched = matchedFilesByRule.get(rule) ?? new Set();
  for (const entry of entries) if (!matched.has(entry)) stale.push(`${rule}: ${entry}`);
}

const RULE_ORDER = [
  "shadow-invisible",
  "shadow-foreground",
  "bare-channel",
  "icon-button-name",
  "button-type",
  "elevation-ramp",
];

if (violations.length === 0 && stale.length === 0) {
  const absorbed = Object.entries(SHRINK_ONLY)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(" ");
  process.stdout.write(
    `✅ UI component contracts hold across ${SCAN_GLOBS.join(" + ")} ` +
      `(${scanned} file(s) scanned${absorbed ? `; allowlisted: ${absorbed}` : ""}).\n` +
      "   Note: the bare-channel rule is a static approximation — run\n" +
      "   node scripts/audit-css-var-types.mjs against a built stylesheet for proof.\n",
  );
  process.exit(0);
}

if (violations.length > 0) {
  process.stderr.write(`\n❌ ${violations.length} UI component-contract violation(s):\n`);
  for (const rule of RULE_ORDER) {
    const hits = violations.filter((v) => v.rule === rule);
    if (hits.length === 0) continue;
    process.stderr.write(`\n  [${rule}] ${hits.length}\n`);
    for (const v of hits) {
      process.stderr.write(`    ${v.file}:${v.line}\n      ${v.message}\n      > ${v.text}\n`);
    }
  }
  process.stderr.write(
    "\nFix, or add `// @allow-ui-contract: <reason>` on the line / the line above.\n",
  );
}

if (stale.length > 0) {
  process.stderr.write(
    `\n❌ ${stale.length} stale SHRINK_ONLY entr(y|ies) in scripts/lint-ui-contracts.mjs —\n` +
      "   these files no longer violate their rule, so delete the entries\n" +
      "   (the lists may only shrink):\n",
  );
  for (const s of stale) process.stderr.write(`    ${s}\n`);
}

process.stderr.write("\n");
process.exit(1);

/* ------------------------------------------------------------------ *
 * WHY THERE IS NO "CVA, NOT CONDITIONAL CLASS STRINGS" RULE
 * ------------------------------------------------------------------
 * Read a dozen components in packages/design/ui/src before assuming this is a
 * missing check. It is not mechanically expressible, for three reasons:
 *
 *   1. The rule's subject is undecidable. CVA is for a *variant* — a closed set
 *      of named appearances. A ternary on `open`, `disabled`, `active`,
 *      `direction`, `isLast`, or a measured pixel value is STATE, not a
 *      variant, and belongs in a conditional. Nothing in the syntax
 *      distinguishes `size === "sm" ? "p-2" : "p-4"` (should be CVA) from
 *      `isOpen ? "rotate-180" : ""` (correctly a conditional). Telling them
 *      apart requires knowing whether the prop enumerates appearances, which
 *      means reading intent.
 *   2. Counting conditionals produces the wrong incentive. A threshold ("more
 *      than N ternaries in a className") is satisfied by merging two ternaries
 *      into one nested one, which is worse code that passes.
 *   3. The genuinely mechanical part is already covered. Whether the resulting
 *      classes are legal is what the other rules here, lint-no-focus-rings,
 *      lint-no-brand-hex, and lint-no-dark-overrides check — and those hold
 *      regardless of how the string was assembled.
 *
 * RECOMMENDATION: the docs should stop stating CVA-for-variants as a rule and
 * state it as a convention, reviewed by humans. A documented rule nobody
 * enforces is worse than no rule — it reads as a guarantee.
 * ------------------------------------------------------------------ */
