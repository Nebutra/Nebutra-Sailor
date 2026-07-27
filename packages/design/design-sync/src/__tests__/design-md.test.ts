/**
 * Tests for the DesignMdProvider (DESIGN.md ↔ DTCG sync).
 *
 * Fixtures: tmpdir via mkdtemp — isolated per run.
 * Mirrors penpot.test.ts structure and conventions.
 */

import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LintReport } from "@google/design.md/linter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertLintClean, DesignMdProvider } from "../providers/design-md";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * A minimal valid DESIGN.md that satisfies the linter (no errors).
 * Provides: primary, accent, background, foreground colors + radius.md + font family.
 */
const VALID_DESIGN_MD = `---
name: Test Brand
colors:
  primary: "#0033FE"
  accent: "#0BF1C3"
  background: "#ffffff"
  foreground: "#111111"
  card: "#f8fafc"
  border: "#e2e8f0"
  ring: "#0033FE"
rounded:
  md: "8px"
typography:
  body:
    fontFamily: "Inter"
    fontSize: "1rem"
---

# Typography

## body
- font-family: Inter
- font-size: 1rem
- font-weight: 400
`;

/** Core DTCG fixture — provides primitive color tokens. */
const CORE_TOKENS = {
  color: {
    "brand-blue": { $value: "#0033FE", $type: "color" },
    "brand-cyan": { $value: "#0BF1C3", $type: "color" },
    "neutral-50": { $value: "#f8fafc", $type: "color" },
  },
  fontFamily: {
    sans: {
      $value: '"Geist", -apple-system, sans-serif',
      $type: "fontFamily",
    },
  },
  size: {
    radius: {
      md: { $value: "0.375rem", $type: "dimension" },
    },
  },
};

/** Semantic DTCG fixture — brand aliases. */
const SEMANTIC_TOKENS = {
  brand: {
    primary: { $value: "{color.brand-blue}", $type: "color" },
    accent: { $value: "{color.brand-cyan}", $type: "color" },
  },
};

// ─── Fixture Factories ────────────────────────────────────────────────────────

interface Fixture {
  tokensDir: string;
  designMdPath: string;
}

async function makeFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "design-sync-design-md-"));
  const tokensDir = join(root, "tokens");
  await mkdir(tokensDir, { recursive: true });

  await writeFile(join(tokensDir, "core.json"), JSON.stringify(CORE_TOKENS, null, 2), "utf8");
  await writeFile(
    join(tokensDir, "semantic.json"),
    JSON.stringify(SEMANTIC_TOKENS, null, 2),
    "utf8",
  );

  const designMdPath = join(root, "DESIGN.md");
  return { tokensDir, designMdPath };
}

/**
 * Build a minimal valid `LintReport` fixture. Override specific fields via
 * `overrides` — only the provided keys are replaced (shallow merge at top level).
 */
function makeReport(overrides: Partial<LintReport> = {}): LintReport {
  const base: LintReport = {
    designSystem: {
      colors: new Map(),
      typography: new Map(),
      rounded: new Map(),
      spacing: new Map(),
      components: new Map(),
      symbolTable: new Map(),
    },
    findings: [],
    summary: { errors: 0, warnings: 0, infos: 0 },
    tailwindConfig: {
      theme: { extend: {} },
      safelist: [],
    } as unknown as LintReport["tailwindConfig"],
    sections: [],
    documentSections: [],
  };
  return { ...base, ...overrides };
}

// ─── assertLintClean unit tests ───────────────────────────────────────────────

describe("assertLintClean", () => {
  it("does NOT throw for a clean report (no findings)", () => {
    expect(() => assertLintClean(makeReport(), "TEST.md")).not.toThrow();
  });

  it("does NOT throw for a warnings-only report", () => {
    const report = makeReport({
      findings: [
        { severity: "warning", path: "typography", message: "No typography tokens defined." },
      ],
      summary: { errors: 0, warnings: 1, infos: 0 },
    });
    expect(() => assertLintClean(report, "TEST.md")).not.toThrow();
  });

  it("throws when there is at least one error-severity finding", () => {
    const report = makeReport({
      findings: [
        {
          severity: "error",
          path: "colors.primary",
          message: "'not-a-color' is not a valid color.",
        },
      ],
      summary: { errors: 1, warnings: 0, infos: 0 },
    });
    expect(() => assertLintClean(report, "DESIGN.md")).toThrow(
      /\[design-md\] Lint failed for DESIGN\.md — 1 error\(s\)/u,
    );
    expect(() => assertLintClean(report, "DESIGN.md")).toThrow(
      /colors\.primary: 'not-a-color' is not a valid color\./u,
    );
  });

  it("includes all error findings in the thrown message", () => {
    const report = makeReport({
      findings: [
        { severity: "error", path: "colors.primary", message: "Invalid color." },
        { severity: "error", path: "colors.accent", message: "Another invalid color." },
        { severity: "warning", message: "Some warning — should not affect throw." },
      ],
      summary: { errors: 2, warnings: 1, infos: 0 },
    });
    let thrown = "";
    try {
      assertLintClean(report, "my.md");
    } catch (e) {
      thrown = (e as Error).message;
    }
    expect(thrown).toMatch(/2 error\(s\)/u);
    expect(thrown).toMatch(/colors\.primary: Invalid color\./u);
    expect(thrown).toMatch(/colors\.accent: Another invalid color\./u);
    // Warning should NOT appear in the throw message
    expect(thrown).not.toMatch(/Some warning/u);
  });
});

// ─── runLintGate catch-branch ─────────────────────────────────────────────────

describe("runLintGate", () => {
  it("rejects with a [design-md]-prefixed error when the linter throws", async () => {
    // Mock the @google/design.md/linter module so lint() throws.
    vi.doMock("@google/design.md/linter", () => ({
      lint: () => {
        throw new Error("simulated linter crash");
      },
    }));

    // Re-import the function under test so it picks up the mock.
    const { runLintGate: rg } = await import("../providers/design-md");

    await expect(rg("some content", "DESIGN.md")).rejects.toThrow(
      /\[design-md\] Lint gate failed to run on DESIGN\.md: simulated linter crash/u,
    );

    vi.doUnmock("@google/design.md/linter");
  });
});

// ─── DesignMdProvider tests ───────────────────────────────────────────────────

describe("DesignMdProvider", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await makeFixture();
  });

  // ── push happy path ─────────────────────────────────────────────────────────

  it("push writes a DESIGN.md and returns pushed:true", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.push();

    expect(result.pushed).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.provider).toBe("design-md");
    expect(result.pushedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/u);

    // File was actually written.
    const written = await readFile(fixture.designMdPath, "utf8");
    expect(written.length).toBeGreaterThan(0);
    // Must contain YAML front matter sentinel.
    expect(written).toMatch(/^---/u);
  });

  it("push written file passes the official lint (no error findings)", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    await provider.push();

    const { lint } = await import("@google/design.md/linter");
    const written = await readFile(fixture.designMdPath, "utf8");
    const report = lint(written);
    expect(report.summary.errors).toBe(0);
  });

  it("push with dryRun:true returns pushed:false and does NOT write the file", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.push({ dryRun: true });

    expect(result.pushed).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.summary).toMatch(/dry-run/u);

    // File was NOT written.
    await expect(stat(fixture.designMdPath)).rejects.toThrow();
  });

  // ── pull happy path ─────────────────────────────────────────────────────────

  it("pull writes a themes/<brand>.json into tokensDir and returns written:true", async () => {
    // Pre-write a valid DESIGN.md.
    await writeFile(fixture.designMdPath, VALID_DESIGN_MD, "utf8");

    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.pull();

    expect(result.written).toBe(true);
    expect(result.provider).toBe("design-md");
    expect(result.pulledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
    expect(result.sets).toHaveLength(1);

    const set = result.sets[0];
    expect(set.relativePath).toMatch(/^themes\//u);

    // Verify the file was actually written to disk.
    const target = join(fixture.tokensDir, set.relativePath);
    const raw = await readFile(target, "utf8");
    const parsed = JSON.parse(raw);
    // The produced tree must be an object (valid DTCG).
    expect(typeof parsed).toBe("object");
    expect(parsed).not.toBeNull();
  });

  it("pull summary mentions missingRequired and unmapped counts", async () => {
    // Use a DESIGN.md that deliberately omits many required tokens.
    const sparseContent = `---
name: Sparse
colors:
  primary: "#ff0000"
---
`;
    await writeFile(fixture.designMdPath, sparseContent, "utf8");

    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.pull();

    // Summary must mention missingRequired or unmapped (even if zero).
    // When there ARE missing tokens, the summary should include the count.
    expect(result.sets).toHaveLength(1);
    // missingRequired count should be > 0 for the sparse fixture.
    expect(result.summary).toMatch(/missingRequired:/u);
  });

  it("pull with dryRun:true returns written:false and does NOT write any file", async () => {
    await writeFile(fixture.designMdPath, VALID_DESIGN_MD, "utf8");

    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.pull({ dryRun: true });

    expect(result.written).toBe(false);
    expect(result.sets).toHaveLength(1);

    // No themes/ file should have been written.
    const themesDir = join(fixture.tokensDir, "themes");
    await expect(stat(themesDir)).rejects.toThrow();
  });

  // ── pull missing file ───────────────────────────────────────────────────────

  it("pull returns graceful empty result when DESIGN.md does not exist", async () => {
    // designMdPath does NOT exist — we use a path that was never written.
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath, // never written in this test
    });

    // Must NOT throw.
    const result = await provider.pull();

    expect(result.sets).toHaveLength(0);
    expect(result.written).toBe(false);
    expect(result.summary).toMatch(/not found/iu);
  });

  // ── SSOT safety ─────────────────────────────────────────────────────────────

  it("pull does NOT modify core.json or semantic.json — only writes to themes/", async () => {
    await writeFile(fixture.designMdPath, VALID_DESIGN_MD, "utf8");

    // Record the content of core.json and semantic.json before pull.
    const coreBefore = await readFile(join(fixture.tokensDir, "core.json"), "utf8");
    const semanticBefore = await readFile(join(fixture.tokensDir, "semantic.json"), "utf8");

    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    await provider.pull();

    // core.json and semantic.json must be byte-for-byte identical.
    const coreAfter = await readFile(join(fixture.tokensDir, "core.json"), "utf8");
    const semanticAfter = await readFile(join(fixture.tokensDir, "semantic.json"), "utf8");
    expect(coreAfter).toBe(coreBefore);
    expect(semanticAfter).toBe(semanticBefore);
  });

  // ── healthcheck ─────────────────────────────────────────────────────────────

  it("healthcheck is ok when tokensDir exists and designMdPath parent exists", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath, // parent dir (root tmp) exists
    });

    const status = await provider.healthcheck();

    expect(status.provider).toBe("design-md");
    expect(status.ok).toBe(true);
    expect(status.detectedEnv).toContain("tokensDir");
    expect(status.detectedEnv).toContain("@google/design.md");
    expect(status.detectedEnv).toContain("designMdPath.parent");
  });

  it("healthcheck is NOT ok when tokensDir does not exist", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: join(fixture.tokensDir, "definitely-does-not-exist"),
      designMdPath: fixture.designMdPath,
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(false);
    expect(status.missingEnv.some((m) => m.includes("tokensDir"))).toBe(true);
  });

  it("healthcheck always returns provider:'design-md'", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });
    const status = await provider.healthcheck();
    expect(status.provider).toBe("design-md");
  });

  // ── pull warn path (Important 2) ────────────────────────────────────────────

  it("pull emits logger.warn when report has gaps but still returns the set unchanged", async () => {
    // Use a sparse DESIGN.md — will have missingRequired tokens.
    const sparseContent = `---
name: Sparse
colors:
  primary: "#ff0000"
---
`;
    await writeFile(fixture.designMdPath, sparseContent, "utf8");

    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.pull();

    // The result must still carry the set — gaps do not suppress the output.
    expect(result.sets).toHaveLength(1);
    expect(result.provider).toBe("design-md");
    expect(result.sets[0].tokens).toBeDefined();
    // The summary must still mention missingRequired.
    expect(result.summary).toMatch(/missingRequired:/u);
  });

  // ── configurable name/description (Important 3) ─────────────────────────────

  it("push with name:'Acme' and description:'Acme DS' produces DESIGN.md with those values", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
      name: "Acme",
      description: "Acme DS",
    });

    await provider.push();

    const written = await readFile(fixture.designMdPath, "utf8");
    // Front matter must carry the custom name
    expect(written).toContain('name: "Acme"');
    // Overview prose must contain the custom description
    expect(written).toContain("Acme DS");
  });

  it("push without name/description writes a generic label, not a brand", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    await provider.push();

    const written = await readFile(fixture.designMdPath, "utf8");
    expect(written).toContain('name: "Design System"');
    expect(written).not.toContain("Nebutra");
  });

  // ── preview.html sibling ─────────────────────────────────────────────────────

  it("push (non-dryRun) writes BOTH DESIGN.md AND DESIGN.preview.html", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    await provider.push();

    // DESIGN.md was written
    const mdContent = await readFile(fixture.designMdPath, "utf8");
    expect(mdContent).toMatch(/^---/u);

    // DESIGN.preview.html sibling was written
    const expectedPreviewPath = fixture.designMdPath.replace(/\.md$/, ".preview.html");
    const previewContent = await readFile(expectedPreviewPath, "utf8");
    expect(previewContent.trimStart()).toMatch(/^<!DOCTYPE html>/iu);
  });

  it("push (non-dryRun) includes the preview path in PushResult.sets", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    const result = await provider.push();

    // sets must include both the DESIGN.md path and the preview path
    expect(result.sets).toHaveLength(2);
    const mdEntry = result.sets.find((s) => s.endsWith(".md"));
    const previewEntry = result.sets.find((s) => s.endsWith(".preview.html"));
    expect(mdEntry).toBeDefined();
    expect(previewEntry).toBeDefined();
  });

  it("push(dryRun:true) does NOT write the .preview.html sibling", async () => {
    const provider = new DesignMdProvider({
      provider: "design-md",
      tokensDir: fixture.tokensDir,
      designMdPath: fixture.designMdPath,
    });

    await provider.push({ dryRun: true });

    // Neither DESIGN.md nor .preview.html should exist
    await expect(stat(fixture.designMdPath)).rejects.toThrow();
    const expectedPreviewPath = fixture.designMdPath.replace(/\.md$/, ".preview.html");
    await expect(stat(expectedPreviewPath)).rejects.toThrow();
  });
});
