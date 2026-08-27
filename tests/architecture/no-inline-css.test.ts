import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Inline `style={{ … }}` in the component library.
 *
 * History: this test walked `packages/design/ui/src/layout` only — one of
 * fifteen directories under `src` — and used a file-level regex (`style={{`
 * appears anywhere ⇒ fail) with three whole-file exemptions. Two problems with
 * that shape, both fixed here:
 *
 *  1. Scope. The audit in docs/design-system/ui-compliance-audit.md (item 6)
 *     measured that the rule never saw the other ~200 files. It now walks all
 *     of `packages/design/ui/src`.
 *
 *  2. Granularity. A file-level regex cannot tell `style={{ width: railWidth }}`
 *     — a value only the runtime knows — from `style={{ color: "red" }}`, a
 *     hardcoded declaration that belongs in a class. It banned both, so the
 *     three files that legitimately need the former had to be exempted whole,
 *     which also exempted anything else they might grow. This test classifies
 *     each *declaration*, so all three former file exemptions turned out to be
 *     unnecessary: `app-shell.tsx`, `EmptyState.tsx` and `FullPageStatus.tsx`
 *     only ever set computed values.
 *
 * What stays legitimate, and why each category is mechanically decidable:
 *
 *   - **Computed values.** Anything that is not a literal: an identifier, a
 *     member expression, a call, a ternary, an interpolated template. The value
 *     is not in the source, so no class could hold it.
 *   - **Spreads** (`...style`, `...getSheetStyle(style)`). A passthrough of a
 *     caller-supplied style object; the library cannot know its contents.
 *   - **CSS custom properties** (`"--gauge-pink-9": …`). Setting a variable on
 *     an element is the sanctioned channel for handing a value to a stylesheet;
 *     it is the opposite of a hardcoded declaration.
 *   - **Token-derived literals.** A literal in which every concrete length,
 *     colour or duration comes from a `var(--token)` and only CSS keywords
 *     remain — `"calc(50% - var(--spinner-bar-left))"`, `"all
 *     var(--transition-length) ease var(--delay)"`. Not hardcoded; the tokens
 *     decide. A literal that mixes a token with a raw value
 *     (`"var(--shiny-width) 100%"`, `"3px 3px 0px hsl(var(--background))"`) is
 *     NOT token-derived and is reported.
 *   - **Motion style keys** (`originX`, `x`, `rotate`, `pathLength`, …). Third
 *     party integration point: Motion's `MotionStyle` accepts keys that are not
 *     CSS properties at all, so no utility class can express them.
 *   - **SVG geometry** (`strokeDasharray`, `strokeDashoffset`, `cx`, `d`, …).
 *     Geometry, not appearance, and Tailwind ships no utility for it. Paint
 *     properties (`fill`, `stroke`) are deliberately NOT in this set — those do
 *     have utilities and belong in a class.
 *
 * Stories and tests are out of scope: a story's demo wrapper needs
 * `height: 400` to frame the subject, and that is the story's job, not shipped
 * component surface.
 *
 * Everything else is reported. The existing offenders are absorbed by
 * STATIC_INLINE_STYLE_ALLOWLIST, which is shrink-only in the shape used by
 * tests/architecture/doc-claims-drift.test.ts: a new offender fails, and so
 * does a *stale* entry, so a fixed declaration cannot leave its exemption
 * behind.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const UI_SRC = resolve(ROOT, "packages/design/ui/src");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".open-next",
  "storybook-static",
  "dist",
  ".turbo",
  ".deploy",
  "__tests__",
]);

/**
 * Guards the scope itself. The whole point of this rewrite was that the walker
 * saw one directory; if a future edit narrows the root back down, that must
 * fail rather than quietly report zero.
 */
const MINIMUM_FILES_IN_SCOPE = 400;

/* ------------------------------------------------------------------ *
 * File collection
 * ------------------------------------------------------------------ */

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name);
    if (ext !== ".ts" && ext !== ".tsx") continue;
    if (/\.(stories|test|spec)\.tsx?$/.test(entry.name)) continue;
    results.push(fullPath);
  }
  return results.sort();
}

/* ------------------------------------------------------------------ *
 * Source scanning
 * ------------------------------------------------------------------ */

/**
 * Blanks comments while preserving every byte offset and newline, so reported
 * line numbers stay true. Without this, a `// … boxShadow: "…"` comment parses
 * as a declaration.
 */
function blankComments(source: string): string {
  const out = source.split("");
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const c = source[i] as string;
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      i += 1;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") {
        out[i] = " ";
        i += 1;
      }
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] !== "\n") out[i] = " ";
        i += 1;
      }
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      continue;
    }
    i += 1;
  }
  return out.join("");
}

interface StyleObject {
  line: number;
  body: string;
}

/** Extracts the body of every `style={{ … }}` object literal. */
function extractStyleObjects(source: string): StyleObject[] {
  const found: StyleObject[] = [];
  const opener = /style=\{\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(source))) {
    // `match[0]` is `style={` plus whitespace plus the object's own `{`, so the
    // last character of the match is the brace the body starts after — not the
    // outer JSX expression brace.
    const objectStart = match.index + match[0].length - 1;
    let depth = 0;
    let end = objectStart;
    let quote: string | null = null;
    for (; end < source.length; end += 1) {
      const c = source[end] as string;
      if (quote) {
        if (c === "\\") {
          end += 1;
          continue;
        }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        continue;
      }
      if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    found.push({
      line: source.slice(0, match.index).split("\n").length,
      body: source.slice(objectStart + 1, end),
    });
    opener.lastIndex = Math.max(end, match.index + 1);
  }
  return found;
}

/** Splits an object body on top-level commas, respecting nesting and strings. */
function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i] as string;
    if (quote) {
      current += c;
      if (c === "\\") {
        current += body[i + 1] ?? "";
        i += 1;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      current += c;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") depth += 1;
    else if (c === "}" || c === "]" || c === ")") depth -= 1;
    if (c === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts.map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Declaration classification
 * ------------------------------------------------------------------ */

/**
 * Motion's `MotionStyle` accepts these alongside real CSS properties. They are
 * not CSS, so there is no class form of them.
 * https://motion.dev/docs/react-motion-component#style
 */
const MOTION_STYLE_KEYS = new Set([
  "x",
  "y",
  "z",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scale",
  "scaleX",
  "scaleY",
  "skew",
  "skewX",
  "skewY",
  "originX",
  "originY",
  "originZ",
  "perspective",
  "transformPerspective",
  "pathLength",
  "pathOffset",
  "pathSpacing",
]);

/**
 * SVG *geometry*. Deliberately excludes paint (`fill`, `stroke`, `stopColor`) —
 * Tailwind has utilities for those, so a hardcoded one is real debt.
 */
const SVG_GEOMETRY_KEYS = new Set([
  "strokeDasharray",
  "strokeDashoffset",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "x2",
  "y1",
  "y2",
  "d",
  "points",
  "viewBox",
  "transformBox",
  "vectorEffect",
]);

const STRING_LITERAL = /^(["'])(?:\\.|(?!\1).)*\1$/;
const NUMERIC_LITERAL = /^-?(?:\d+\.?\d*|\.\d+)$/;
const TEMPLATE_LITERAL_NO_INTERPOLATION = /^`[^`]*`$/;
const HARDCODED_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

/** Removes balanced `var(…)` and `calc(…)` groups. */
function stripTokenFunctions(value: string): string {
  let out = value;
  for (let pass = 0; pass < 20; pass += 1) {
    const match = /(?:var|calc)\(/.exec(out);
    if (!match) break;
    const start = match.index;
    let depth = 0;
    let end = start + match[0].length - 1;
    for (; end < out.length; end += 1) {
      if (out[end] === "(") depth += 1;
      else if (out[end] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out = `${out.slice(0, start)} ${out.slice(end + 1)}`;
  }
  return out;
}

/**
 * True when every concrete length / colour / duration in the literal comes from
 * a design token and only CSS keywords remain.
 */
function isTokenDerived(literal: string): boolean {
  if (!literal.includes("var(--")) return false;
  const remainder = stripTokenFunctions(literal);
  if (HARDCODED_COLOUR.test(remainder)) return false;
  return !/\d/.test(remainder);
}

interface Offender {
  file: string;
  line: number;
  property: string;
  declaration: string;
}

/** `null` when the declaration is legitimate; otherwise the offending property. */
function classify(declaration: string): string | null {
  if (declaration.startsWith("...")) return null;

  const separator = findTopLevelColon(declaration);
  if (separator < 0) return null; // shorthand `{ width }` — a variable

  const rawKey = declaration.slice(0, separator).trim();
  const value = declaration.slice(separator + 1).trim();
  const key = rawKey.replace(/^["'`]|["'`]$/g, "");

  if (key.startsWith("--")) return null; // custom property channel
  if (MOTION_STYLE_KEYS.has(key)) return null;
  if (SVG_GEOMETRY_KEYS.has(key)) return null;

  const isLiteral =
    STRING_LITERAL.test(value) ||
    NUMERIC_LITERAL.test(value) ||
    TEMPLATE_LITERAL_NO_INTERPOLATION.test(value);
  if (!isLiteral) return null; // computed at runtime

  const inner = value.slice(1, -1);
  if (isTokenDerived(inner)) return null;

  return key;
}

function findTopLevelColon(declaration: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < declaration.length; i += 1) {
    const c = declaration[i] as string;
    if (quote) {
      if (c === "\\") {
        i += 1;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") depth += 1;
    else if (c === "}" || c === "]" || c === ")") depth -= 1;
    else if (c === ":" && depth === 0) return i;
  }
  return -1;
}

function collectOffenders(files: string[]): Offender[] {
  const offenders: Offender[] = [];
  for (const file of files) {
    const source = blankComments(readFileSync(file, "utf-8"));
    for (const { line, body } of extractStyleObjects(source)) {
      for (const declaration of splitDeclarations(body)) {
        const property = classify(declaration);
        if (!property) continue;
        offenders.push({
          file: relative(ROOT, file),
          line,
          property,
          declaration,
        });
      }
    }
  }
  return offenders;
}

/* ------------------------------------------------------------------ *
 * Shrink-only baseline
 * ------------------------------------------------------------------ */

/**
 * Existing hardcoded inline declarations, one entry per `file :: property`.
 * Keyed without a line number on purpose: line numbers churn on every unrelated
 * edit above them, and an allowlist that churns stops being read. The failure
 * report below still prints file, line and value.
 *
 * The list may only shrink. Fixing every occurrence of a property in a file
 * removes its entry — and leaving the entry behind fails the stale check.
 *
 * Fix, do not add: move the declaration into a class (Tailwind arbitrary value
 * or a `styles/` rule), or route it through a `--custom-property` set on the
 * element so a stylesheet owns the cascade.
 */
const STATIC_INLINE_STYLE_ALLOWLIST: readonly string[] = [
  "packages/design/ui/src/components/ai-prompt-box/prompt-input.tsx :: clipPath",
  "packages/design/ui/src/decorations/particles/CursorTrail.tsx :: boxShadow",
  "packages/design/ui/src/decorations/particles/TextSparkline.tsx :: background",
  "packages/design/ui/src/decorations/particles/TextSparkline.tsx :: filter",
  "packages/design/ui/src/decorations/particles/TextSparkline.tsx :: transform",
  "packages/design/ui/src/decorations/particles/TextSparkline.tsx :: transformOrigin",
  "packages/design/ui/src/decorations/particles/TextSparkline.tsx :: width",
  "packages/design/ui/src/decorations/patterns/CrossPattern.tsx :: backgroundImage",
  "packages/design/ui/src/decorations/patterns/CrossPattern.tsx :: backgroundSize",
  "packages/design/ui/src/decorations/patterns/DotMatrix.tsx :: backgroundImage",
  "packages/design/ui/src/decorations/patterns/DotMatrix.tsx :: backgroundPosition",
  "packages/design/ui/src/decorations/patterns/DotMatrix.tsx :: backgroundSize",
  "packages/design/ui/src/decorations/patterns/FloatingSpots.tsx :: filter",
  "packages/design/ui/src/decorations/patterns/FloatingSpots.tsx :: left",
  "packages/design/ui/src/decorations/patterns/FloatingSpots.tsx :: top",
  "packages/design/ui/src/decorations/patterns/FloatingSpots.tsx :: transform",
  "packages/design/ui/src/marketing/award-badge.tsx :: mixBlendMode",
  "packages/design/ui/src/marketing/award-badge.tsx :: transform",
  "packages/design/ui/src/marketing/award-badge.tsx :: transformOrigin",
  "packages/design/ui/src/marketing/award-badge.tsx :: transition",
  "packages/design/ui/src/marketing/award-badge.tsx :: willChange",
  "packages/design/ui/src/marketing/globe.tsx :: animation",
  "packages/design/ui/src/marketing/highlight-card.tsx :: backgroundImage",
  "packages/design/ui/src/marketing/highlight-card.tsx :: backgroundSize",
  "packages/design/ui/src/marketing/pricing-section.tsx :: boxShadow",
  "packages/design/ui/src/marketing/pricing-section.tsx :: offsetPath",
  "packages/design/ui/src/marketing/smooth-scroll-hero.tsx :: backgroundImage",
  "packages/design/ui/src/marketing/smooth-scroll-hero.tsx :: backgroundPosition",
  "packages/design/ui/src/marketing/smooth-scroll-hero.tsx :: backgroundRepeat",
  "packages/design/ui/src/marketing/smooth-scroll-hero.tsx :: height",
  "packages/design/ui/src/marketing/stagger-testimonials.tsx :: boxShadow",
  "packages/design/ui/src/marketing/stagger-testimonials.tsx :: clipPath",
  "packages/design/ui/src/marketing/stagger-testimonials.tsx :: height",
  "packages/design/ui/src/marketing/stagger-testimonials.tsx :: right",
  "packages/design/ui/src/marketing/stagger-testimonials.tsx :: top",
  "packages/design/ui/src/marketing/stagger-testimonials.tsx :: transform",
  "packages/design/ui/src/marketing/testimonials-registry/marquee3d.tsx :: transform",
  "packages/design/ui/src/navigation/StoryProgress.tsx :: height",
  "packages/design/ui/src/patterns/data-table/data-table.tsx :: height",
  "packages/design/ui/src/patterns/kinetic-marketing.tsx :: maskImage",
  "packages/design/ui/src/primitives/animated-circular-progress-bar.tsx :: transform",
  "packages/design/ui/src/primitives/animated-circular-progress-bar.tsx :: transitionProperty",
  "packages/design/ui/src/primitives/animated-hike-card.tsx :: transform",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: WebkitBackgroundClip",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: animation",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: backgroundClip",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: backgroundPosition",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: backgroundRepeat",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: backgroundSize",
  "packages/design/ui/src/primitives/animated-shiny-text.tsx :: transition",
  "packages/design/ui/src/primitives/aspect-ratio.tsx :: aspectRatio",
  "packages/design/ui/src/primitives/assisted-password-confirmation.tsx :: left",
  "packages/design/ui/src/primitives/awards.tsx :: WebkitBackgroundClip",
  "packages/design/ui/src/primitives/awards.tsx :: WebkitTextFillColor",
  "packages/design/ui/src/primitives/awards.tsx :: WebkitTextStroke",
  "packages/design/ui/src/primitives/awards.tsx :: backgroundClip",
  "packages/design/ui/src/primitives/awards.tsx :: textShadow",
  "packages/design/ui/src/primitives/awards.tsx :: transform",
  "packages/design/ui/src/primitives/book.tsx :: backgroundColor",
  "packages/design/ui/src/primitives/book.tsx :: backgroundImage",
  "packages/design/ui/src/primitives/book.tsx :: containerType",
  "packages/design/ui/src/primitives/book.tsx :: gap",
  "packages/design/ui/src/primitives/book.tsx :: transform",
  "packages/design/ui/src/primitives/data-list.tsx :: minWidth",
  "packages/design/ui/src/primitives/dithering-background.tsx :: background",
  "packages/design/ui/src/primitives/dithering-background.tsx :: backgroundImage",
  "packages/design/ui/src/primitives/dithering-background.tsx :: backgroundSize",
  "packages/design/ui/src/primitives/dithering-background.tsx :: height",
  "packages/design/ui/src/primitives/dithering-background.tsx :: opacity",
  "packages/design/ui/src/primitives/dithering-background.tsx :: pointerEvents",
  "packages/design/ui/src/primitives/dithering-background.tsx :: width",
  "packages/design/ui/src/primitives/dotted-map.tsx :: height",
  "packages/design/ui/src/primitives/dotted-map.tsx :: width",
  "packages/design/ui/src/primitives/dynamic-island-toc.tsx :: paddingLeft",
  "packages/design/ui/src/primitives/gauge.tsx :: transform",
  "packages/design/ui/src/primitives/geist-tooltip.tsx :: boxShadow",
  "packages/design/ui/src/primitives/gradient-animated-text.tsx :: animation",
  "packages/design/ui/src/primitives/gradient-animated-text.tsx :: backgroundImage",
  "packages/design/ui/src/primitives/grain-gradient-background.tsx :: height",
  "packages/design/ui/src/primitives/grain-gradient-background.tsx :: width",
  "packages/design/ui/src/primitives/grid-system.tsx :: backgroundRepeat",
  "packages/design/ui/src/primitives/infinite-slider.tsx :: gap",
  "packages/design/ui/src/primitives/interactive-frosted-glass-card.tsx :: transition",
  "packages/design/ui/src/primitives/iphone-mockup.tsx :: transform",
  "packages/design/ui/src/primitives/light-rays.tsx :: background",
  "packages/design/ui/src/primitives/mesh-gradient-bg.tsx :: height",
  "packages/design/ui/src/primitives/mesh-gradient-bg.tsx :: width",
  "packages/design/ui/src/primitives/neuro-noise-bg.tsx :: height",
  "packages/design/ui/src/primitives/neuro-noise-bg.tsx :: width",
  "packages/design/ui/src/primitives/notification-message-list.tsx :: animationDelay",
  "packages/design/ui/src/primitives/pricing-card.tsx :: background",
  "packages/design/ui/src/primitives/progress.tsx :: left",
  "packages/design/ui/src/primitives/progress.tsx :: transformOrigin",
  "packages/design/ui/src/primitives/progressive-blur.tsx :: WebkitBackdropFilter",
  "packages/design/ui/src/primitives/progressive-blur.tsx :: backdropFilter",
  "packages/design/ui/src/primitives/progressive-blur.tsx :: zIndex",
  "packages/design/ui/src/primitives/safari.tsx :: aspectRatio",
  "packages/design/ui/src/primitives/safari.tsx :: borderRadius",
  "packages/design/ui/src/primitives/safari.tsx :: height",
  "packages/design/ui/src/primitives/safari.tsx :: left",
  "packages/design/ui/src/primitives/safari.tsx :: top",
  "packages/design/ui/src/primitives/safari.tsx :: transform",
  "packages/design/ui/src/primitives/safari.tsx :: width",
  "packages/design/ui/src/primitives/search-tool.tsx :: maxHeight",
  "packages/design/ui/src/primitives/shine-border.tsx :: WebkitMask",
  "packages/design/ui/src/primitives/shine-border.tsx :: WebkitMaskComposite",
  "packages/design/ui/src/primitives/shine-border.tsx :: backgroundImage",
  "packages/design/ui/src/primitives/shine-border.tsx :: backgroundSize",
  "packages/design/ui/src/primitives/shine-border.tsx :: mask",
  "packages/design/ui/src/primitives/shine-border.tsx :: maskComposite",
  "packages/design/ui/src/primitives/stars-canvas.tsx :: display",
  "packages/design/ui/src/primitives/stepper.tsx :: width",
  "packages/design/ui/src/primitives/theme-toggle.tsx :: transformOrigin",
  "packages/design/ui/src/primitives/tree.tsx :: height",
  "packages/design/ui/src/primitives/tree.tsx :: transform",
  "packages/design/ui/src/primitives/video-player.tsx :: width",
  "packages/design/ui/src/primitives/video-text.tsx :: WebkitMaskPosition",
  "packages/design/ui/src/primitives/video-text.tsx :: WebkitMaskRepeat",
  "packages/design/ui/src/primitives/video-text.tsx :: WebkitMaskSize",
  "packages/design/ui/src/primitives/video-text.tsx :: maskPosition",
  "packages/design/ui/src/primitives/video-text.tsx :: maskRepeat",
  "packages/design/ui/src/primitives/video-text.tsx :: maskSize",
  "packages/design/ui/src/primitives/wave-animation.tsx :: display",
  "packages/design/ui/src/primitives/wave-animation.tsx :: margin",
  "packages/design/ui/src/primitives/wave-animation.tsx :: padding",
  "packages/design/ui/src/primitives/waves-bg.tsx :: height",
  "packages/design/ui/src/primitives/waves-bg.tsx :: width",
];

function ratchet(
  observed: readonly Offender[],
  allowlist: readonly string[],
): { unlisted: Offender[]; stale: string[] } {
  const allowed = new Set(allowlist);
  const seen = new Set<string>();
  const unlisted: Offender[] = [];
  for (const offender of observed) {
    const entry = keyFor(offender);
    if (allowed.has(entry)) seen.add(entry);
    else unlisted.push(offender);
  }
  return {
    unlisted: unlisted.sort(
      (a, b) =>
        a.file.localeCompare(b.file) || a.line - b.line || a.property.localeCompare(b.property),
    ),
    stale: allowlist.filter((entry) => !seen.has(entry)),
  };
}

function keyFor(offender: Offender): string {
  return `${offender.file} :: ${offender.property}`;
}

/* ------------------------------------------------------------------ *
 * Assertions
 * ------------------------------------------------------------------ */

describe("Property 2: no hardcoded inline CSS in @nebutra/ui", () => {
  const files = collectSourceFiles(UI_SRC);

  it("scans the whole component library, not one directory", () => {
    expect(
      files.length,
      `Only ${files.length} source files found under packages/design/ui/src. ` +
        `This test previously walked src/layout alone and reported zero findings for the other ~200 files; ` +
        `a count this low means the scope was narrowed again.`,
    ).toBeGreaterThan(MINIMUM_FILES_IN_SCOPE);

    const directories = new Set(
      files
        .map((f) => relative(UI_SRC, f).split("/")[0] as string)
        .filter((d) => d.includes(".") === false),
    );
    expect(
      [...directories].sort(),
      "expected the walker to reach primitives, components and patterns — the three directories the component census surveyed",
    ).toEqual(expect.arrayContaining(["components", "patterns", "primitives"]));
  });

  it("keeps STATIC_INLINE_STYLE_ALLOWLIST sorted and free of duplicates", () => {
    expect(
      [...STATIC_INLINE_STYLE_ALLOWLIST],
      "STATIC_INLINE_STYLE_ALLOWLIST must be sorted so a diff shows exactly what moved",
    ).toEqual([...STATIC_INLINE_STYLE_ALLOWLIST].sort());
    expect(
      new Set(STATIC_INLINE_STYLE_ALLOWLIST).size,
      "STATIC_INLINE_STYLE_ALLOWLIST has duplicate entries",
    ).toBe(STATIC_INLINE_STYLE_ALLOWLIST.length);
  });

  it("no component sets a hardcoded static value through style={{ … }}", () => {
    const { unlisted } = ratchet(collectOffenders(files), STATIC_INLINE_STYLE_ALLOWLIST);

    expect(
      unlisted.map(keyFor),
      `${unlisted.length} hardcoded inline style declaration(s) in @nebutra/ui:\n${unlisted
        .map(
          (o) =>
            `  - ${o.file}:${o.line} — style={{ ${o.declaration} }}\n` +
            `      \`${o.property}\` is a literal, not a computed value, not a --custom-property, and not token-derived.\n` +
            `      Move it into a class, or set a --custom-property and let a stylesheet own it.`,
        )
        .join("\n")}`,
    ).toEqual([]);
  });

  it("carries no stale allowlist entries (the list may only shrink)", () => {
    const { stale } = ratchet(collectOffenders(files), STATIC_INLINE_STYLE_ALLOWLIST);

    expect(
      stale,
      `STATIC_INLINE_STYLE_ALLOWLIST entries no longer match any offender and must be deleted:\n${stale
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});
