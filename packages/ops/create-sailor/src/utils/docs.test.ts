import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDocsTemplate } from "./docs";

let workDir: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-docs-test-"));
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe("applyDocsTemplate", () => {
  it("noop when framework=none", async () => {
    await applyDocsTemplate(workDir, { framework: "none", projectName: "Acme" });
    expect(fs.existsSync(path.join(workDir, "apps", "docs"))).toBe(false);
  });

  it("rejects unknown framework strings", async () => {
    await expect(
      applyDocsTemplate(workDir, {
        // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard against bad input
        framework: "gitbook" as any,
        projectName: "Acme",
      }),
    ).rejects.toThrow(/Unsupported docs framework/);
  });

  it.each([
    "fumadocs",
    "nextra",
    "mintlify",
    "docusaurus",
    "vitepress",
  ] as const)("scaffolds %s template into apps/docs", async (framework) => {
    await applyDocsTemplate(workDir, { framework, projectName: "Acme" });
    const docsDir = path.join(workDir, "apps", "docs");
    expect(fs.existsSync(docsDir)).toBe(true);
    const entries = fs.readdirSync(docsDir);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("replaces {PRODUCT_NAME} placeholder in copied files", async () => {
    await applyDocsTemplate(workDir, { framework: "nextra", projectName: "Stardust" });
    const readme = fs.readFileSync(path.join(workDir, "apps", "docs", "README.md"), "utf-8");
    expect(readme).toContain("Stardust");
    expect(readme).not.toContain("{PRODUCT_NAME}");
  });

  it("each framework template has a package.json with valid JSON", async () => {
    for (const framework of [
      "fumadocs",
      "nextra",
      "mintlify",
      "docusaurus",
      "vitepress",
    ] as const) {
      const target = fs.mkdtempSync(path.join(os.tmpdir(), `sailor-docs-${framework}-`));
      try {
        await applyDocsTemplate(target, { framework, projectName: "Acme" });
        const pkgPath = path.join(target, "apps", "docs", "package.json");
        expect(fs.existsSync(pkgPath), `${framework} missing package.json`).toBe(true);
        const parsed = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        expect(parsed.name, `${framework} missing name`).toBeTruthy();
        expect(parsed.scripts?.dev, `${framework} missing dev script`).toBeTruthy();
      } finally {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  });
});
