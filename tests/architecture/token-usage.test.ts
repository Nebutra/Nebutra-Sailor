/**
 * Property-based tests for design token usage invariants.
 *
 * Property 3a: Structural completeness — required src/ subdirectories exist.
 * Property 3b: No colorPrimitives imports — components must use semantic tokens only.
 * Property 3c: No hardcoded hex values in component files.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DESIGN_SYSTEM_SRC = resolve(ROOT, "packages/design/ui/src");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", ".turbo"]);

function collectTsFiles(dir: string, files: string[] = []): string[] {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(full, files);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (ext === ".ts" || ext === ".tsx") {
        files.push(full);
      }
    }
  }
  return files;
}

const REQUIRED_SUBDIRS = ["theme", "typography", "primitives", "components"] as const;
type _RequiredSubdir = (typeof REQUIRED_SUBDIRS)[number];

/**
 * Files with pre-approved hardcoded color usage.
 * Each entry must include a justification comment.
 */
const HARDCODED_HEX_EXEMPTIONS = new Set([
  // Syntax highlighting palette — language token colors cannot map to semantic UI tokens
  resolve(ROOT, "packages/design/ui/src/primitives/code-block.tsx"),
  // Gauge — data viz component with color threshold API; hex values in JSDoc + stories
  resolve(ROOT, "packages/design/ui/src/primitives/gauge.tsx"),
  resolve(ROOT, "packages/design/ui/src/primitives/gauge.stories.tsx"),
  // CardSpotlight — `color` prop demo passes hex to spotlight effect (component API, not inline CSS)
  resolve(ROOT, "packages/design/ui/src/primitives/card-spotlight.stories.tsx"),
]);

/** All TS/TSX files under packages/design/ui/src/ (excluding theme/tokens — those define primitives by design) */
const ALL_COMPONENT_FILES = collectTsFiles(DESIGN_SYSTEM_SRC).filter(
  (f) => !f.includes(`${DESIGN_SYSTEM_SRC}/theme/`) && !f.includes(`${DESIGN_SYSTEM_SRC}/tokens/`),
);

// ---------------------------------------------------------------------------
// Property 3a: Structural completeness
// ---------------------------------------------------------------------------

describe("Property 3a: Token Structure Completeness", () => {
  it("design-system/src/ contains all required subdirectories", () => {
    fc.assert(
      fc.property(fc.constantFrom(...REQUIRED_SUBDIRS), (subdir) => {
        const full = resolve(DESIGN_SYSTEM_SRC, subdir);
        let stat: ReturnType<typeof statSync>;
        try {
          stat = statSync(full);
        } catch {
          throw new Error(`Required directory "packages/design/ui/src/${subdir}" is missing.`);
        }
        expect(stat.isDirectory()).toBe(true);
      }),
      { numRuns: REQUIRED_SUBDIRS.length },
    );
  });

  it("each required subdirectory has at least one TypeScript file", () => {
    fc.assert(
      fc.property(fc.constantFrom(...REQUIRED_SUBDIRS), (subdir) => {
        const files = collectTsFiles(resolve(DESIGN_SYSTEM_SRC, subdir));
        expect(
          files.length,
          `packages/design/ui/src/${subdir}/ has no .ts/.tsx files`,
        ).toBeGreaterThan(0);
      }),
      { numRuns: REQUIRED_SUBDIRS.length },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3b: No colorPrimitives imports in component files
// ---------------------------------------------------------------------------

describe("Property 3b: No Direct colorPrimitives Imports", () => {
  it("should have component files to scan", () => {
    expect(
      ALL_COMPONENT_FILES.length,
      "Expected at least one component file to scan",
    ).toBeGreaterThan(0);
  });

  it("no component file imports or destructures colorPrimitives directly", () => {
    if (ALL_COMPONENT_FILES.length === 0) return;

    const arbFile = fc.constantFrom(...ALL_COMPONENT_FILES);

    fc.assert(
      fc.property(arbFile, (filePath) => {
        const content = readFileSync(filePath, "utf-8");
        const relPath = relative(ROOT, filePath);

        // Detect: `import { colorPrimitives } from ...`
        const importPattern = /\bimport\b[^;]*\bcolorPrimitives\b/;
        expect(
          importPattern.test(content),
          `"${relPath}" imports colorPrimitives directly. ` +
            `Use semantic tokens (e.g. semanticColorsLight.accent.fg) instead.`,
        ).toBe(false);

        // Detect: `colorPrimitives.blue[5]` or `colorPrimitives['gray']`
        const usagePattern = /\bcolorPrimitives\s*[.[]/;
        expect(
          usagePattern.test(content),
          `"${relPath}" accesses colorPrimitives directly. ` + `Reference semantic tokens only.`,
        ).toBe(false);
      }),
      { numRuns: Math.min(ALL_COMPONENT_FILES.length * 2, 300) },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3c: No hardcoded hex values in component files
// ---------------------------------------------------------------------------

/**
 * Regex for hardcoded hex colors in CSS/JS style object notation only.
 *
 * Detects (CSS property syntax with colon):
 *   color: "#1f2328"
 *   backgroundColor: "#fff"
 *   stroke: '#0969da'
 *
 * Does NOT flag:
 *   fill="#e2e8f0"    ← SVG HTML attribute (uses =, not :) — acceptable in illustrations
 *   // #0969da        ← comments
 *   '#0969da'         ← bare string in theme/token definition files
 */
const HARDCODED_HEX_PATTERN =
  /(?:color|fill|stroke|background|backgroundColor)\s*:\s*["']#[0-9a-fA-F]{3,8}["']/;

describe("Property 3c: No Hardcoded Hex Values in Components", () => {
  it("no component file uses hardcoded hex color values in style props", () => {
    if (ALL_COMPONENT_FILES.length === 0) return;

    const arbFile = fc.constantFrom(...ALL_COMPONENT_FILES);

    fc.assert(
      fc.property(arbFile, (filePath) => {
        // Skip pre-approved exemptions
        if (HARDCODED_HEX_EXEMPTIONS.has(filePath)) return;

        const content = readFileSync(filePath, "utf-8");
        const relPath = relative(ROOT, filePath);

        // Strip comment lines before testing
        const withoutComments = content
          .split("\n")
          .filter((line) => !line.trimStart().startsWith("//"))
          .join("\n");

        if (HARDCODED_HEX_PATTERN.test(withoutComments)) {
          const lines = withoutComments.split("\n");
          const offendingLines = lines
            .map((line, i) => ({ line, num: i + 1 }))
            .filter(({ line }) => HARDCODED_HEX_PATTERN.test(line))
            .map(({ line, num }) => `  line ${num}: ${line.trim().slice(0, 120)}`);

          throw new Error(
            `"${relPath}" contains hardcoded hex color values:\n${offendingLines.join("\n")}\n` +
              `Use Tailwind semantic utilities (e.g. text-foreground) or CSS variables instead.`,
          );
        }
      }),
      { numRuns: Math.min(ALL_COMPONENT_FILES.length * 2, 300) },
    );
  });
});
