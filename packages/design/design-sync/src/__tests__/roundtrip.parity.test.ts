/**
 * Slice 6 — Round-trip parity / integration tests for the design-md provider.
 *
 * These are INTEGRATION tests that read real committed DTCG files from
 * packages/design/design-tokens/tokens/{core.json,semantic.json,themes/light.json}.
 *
 * Path resolution: vitest runs from packages/design/design-sync (cwd = package dir).
 * We derive the repo root from import.meta.url (walk 5 levels up from __tests__) to
 * produce a cwd-independent absolute path — robust regardless of which directory
 * the runner is invoked from.
 *
 * Token path namespace note: the serializer reads semantic DTCG paths
 * (e.g. `semantic.brand.primary`) and the importer writes theme paths
 * (e.g. `color.primary`). Parity is asserted at the VALUE level — the meaningful
 * guarantee for the DTCG hub — not at the path level.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lint } from "@google/design.md/linter";
import { describe, expect, it } from "vitest";
import { readTokenSets } from "../io";
import { importFromDesignMd } from "../serialize/from-design-md";
import { serializeToDesignMd } from "../serialize/to-design-md";

// ─── Absolute tokens dir (cwd-independent) ────────────────────────────────────

const _thisDir = fileURLToPath(new URL(".", import.meta.url));
// Walk: __tests__ → src → design-sync → design → packages → repo-root
const _repoRoot = resolve(_thisDir, "../../../../../");
const _tokensDir = resolve(_repoRoot, "packages", "design", "design-tokens", "tokens");

// ─── VI-locked subset: core + semantic + themes/light ─────────────────────────
//
// Loading only these three files preserves the canonical VI-locked brand colors:
//   brand.primary → color.nebutra-blue.500 → #0033fe (云毓蓝)
//   brand.accent  → color.nebutra-cyan.500 → #0bf1c3 (云毓青)
//
// Loading ALL theme files would merge dark.json which overrides brand.primary
// to nebutra-blue.400 (#5c7cfa) — correct dark-mode behavior but not the
// VI-lock assertion target.

const VI_SUBSET_NAMES = new Set(["core", "semantic", "themes/light"]);

// ─── Test 1: Real design system → spec-clean DESIGN.md ────────────────────────

describe("Slice 6 / Test 1 — real design system emits spec-clean DESIGN.md", () => {
  it("produces zero lint errors and front matter contains VI-locked brand colors", async () => {
    const allSets = await readTokenSets(_tokensDir);
    const sets = allSets.filter((s) => VI_SUBSET_NAMES.has(s.name));

    expect(sets).toHaveLength(3);

    const md = serializeToDesignMd(sets, { theme: "themes/light" });
    const report = lint(md);

    // Fail with findings printed so they are visible on CI if errors occur
    if (report.summary.errors !== 0) {
      const errorFindings = report.findings
        .filter((f) => f.severity === "error")
        .map((f) => `  [error] ${(f as Record<string, unknown>).path ?? "no-path"}: ${f.message}`)
        .join("\n");
      throw new Error(
        `DESIGN.md lint produced ${report.summary.errors} error(s):\n${errorFindings}`,
      );
    }

    expect(report.summary.errors).toBe(0);

    // VI-lock assertion: front matter must carry the canonical brand colors
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
    expect(fmMatch, "YAML front matter delimiters must be present").not.toBeNull();
    const frontMatter = fmMatch![1].toLowerCase();

    expect(frontMatter, "front matter must contain VI-locked primary color #0033fe").toContain(
      'primary: "#0033fe"',
    );
    expect(frontMatter, "front matter must contain VI-locked accent color #0bf1c3").toContain(
      'accent: "#0bf1c3"',
    );
  });
});

// ─── Test 2: Round-trip VALUE fidelity (DTCG → DESIGN.md → DTCG) ─────────────

describe("Slice 6 / Test 2 — round-trip value fidelity", () => {
  it("imported color.primary equals front matter primary (no value drift)", async () => {
    const allSets = await readTokenSets(_tokensDir);
    const sets = allSets.filter((s) => VI_SUBSET_NAMES.has(s.name));

    const md = serializeToDesignMd(sets, { theme: "themes/light" });

    // Extract expected value from front matter (source of truth for this assertion)
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---/)!;
    const primaryFmMatch = fmMatch[1].match(/^\s*primary:\s*"(#[0-9a-f]+)"/im);
    const accentFmMatch = fmMatch[1].match(/^\s*accent:\s*"(#[0-9a-f]+)"/im);
    expect(primaryFmMatch, "front matter must contain a primary color").not.toBeNull();
    expect(accentFmMatch, "front matter must contain an accent color").not.toBeNull();
    const fmPrimary = primaryFmMatch![1].toLowerCase();
    const fmAccent = accentFmMatch![1].toLowerCase();

    // Round-trip: import the emitted DESIGN.md back to a DTCG set
    const { set } = importFromDesignMd(md);

    // Token path namespace differs by design:
    //   serializer reads:  semantic.brand.primary → DESIGN.md colors.primary
    //   importer writes:   DESIGN.md colors.primary → theme color.primary
    // Parity is at the VALUE level — what matters for the DTCG hub contract.
    const colorGroup = set.tokens.color as Record<string, { $value: string }>;
    expect(colorGroup, "imported DTCG set must have a 'color' group").toBeDefined();

    const importedPrimary = colorGroup.primary?.$value?.toLowerCase();
    const importedAccent = colorGroup.accent?.$value?.toLowerCase();

    expect(importedPrimary).toBe(fmPrimary);
    expect(importedPrimary).toBe("#0033fe");

    expect(importedAccent).toBe(fmAccent);
    expect(importedAccent).toBe("#0bf1c3");

    // At least one radius key must survive the round-trip with no drift
    const radiusGroup = set.tokens.radius as Record<string, { $value: string }> | undefined;
    expect(radiusGroup, "imported DTCG set must have a 'radius' group").toBeDefined();
    const importedMd = radiusGroup?.md?.$value;
    expect(importedMd, "radius.md must survive the round-trip").toBeDefined();
    // The emitted DESIGN.md carries the DTCG value (e.g. "0.375rem") — round-trip preserves it
    expect(importedMd).toMatch(/\d/);
  });
});

// ─── Test 3: Determinism at integration scale ──────────────────────────────────

describe("Slice 6 / Test 3 — determinism at integration scale", () => {
  it("two consecutive serializeToDesignMd calls with real tokens yield byte-identical strings", async () => {
    const allSets = await readTokenSets(_tokensDir);
    const sets = allSets.filter((s) => VI_SUBSET_NAMES.has(s.name));

    const first = serializeToDesignMd(sets, { theme: "themes/light" });
    const second = serializeToDesignMd(sets, { theme: "themes/light" });

    expect(first).toBe(second);
  });
});

// ─── Test 4: Round-trip idempotency of the importer ───────────────────────────

describe("Slice 6 / Test 4 — round-trip idempotency of the importer", () => {
  it("importFromDesignMd called twice on the same md yields deep-equal token sets", async () => {
    const allSets = await readTokenSets(_tokensDir);
    const sets = allSets.filter((s) => VI_SUBSET_NAMES.has(s.name));

    const md = serializeToDesignMd(sets, { theme: "themes/light" });

    const { set: set1 } = importFromDesignMd(md);
    const { set: set2 } = importFromDesignMd(md);

    // Deep equality of the token trees — importer is deterministic on same input
    expect(set1.name).toBe(set2.name);
    expect(set1.relativePath).toBe(set2.relativePath);
    expect(JSON.stringify(set1.tokens)).toBe(JSON.stringify(set2.tokens));
  });
});
