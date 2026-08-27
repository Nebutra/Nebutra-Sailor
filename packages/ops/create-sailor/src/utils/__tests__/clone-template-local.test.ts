import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cloneTemplate } from "../git";

/**
 * Exercises the offline local-template path (SAILOR_TEMPLATE_LOCAL_DIR) end to
 * end, without GitHub network access. This is the headless/CI escape hatch that
 * lets a real scaffold run be validated against a local checkout.
 */
describe("cloneTemplate — SAILOR_TEMPLATE_LOCAL_DIR", () => {
  let sourceDir: string;
  let targetDir: string;
  const prevEnv = process.env.SAILOR_TEMPLATE_LOCAL_DIR;

  beforeEach(() => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-src-"));
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-tgt-"));
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.SAILOR_TEMPLATE_LOCAL_DIR;
    else process.env.SAILOR_TEMPLATE_LOCAL_DIR = prevEnv;
    fs.rmSync(sourceDir, { recursive: true, force: true });
    fs.rmSync(targetDir, { recursive: true, force: true });
  });

  it("copies a local template directory into the target", async () => {
    fs.writeFileSync(path.join(sourceDir, "package.json"), '{"name":"x"}');
    fs.mkdirSync(path.join(sourceDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, "src", "index.ts"), "export {};");

    process.env.SAILOR_TEMPLATE_LOCAL_DIR = sourceDir;
    await cloneTemplate(targetDir);

    expect(fs.existsSync(path.join(targetDir, "package.json"))).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, "src", "index.ts"), "utf8")).toBe("export {};");
  });

  it("skips node_modules/.git/dist while copying", async () => {
    fs.writeFileSync(path.join(sourceDir, "keep.txt"), "keep");
    for (const skip of ["node_modules", ".git", "dist"]) {
      fs.mkdirSync(path.join(sourceDir, skip), { recursive: true });
      fs.writeFileSync(path.join(sourceDir, skip, "junk"), "junk");
    }

    process.env.SAILOR_TEMPLATE_LOCAL_DIR = sourceDir;
    await cloneTemplate(targetDir);

    expect(fs.existsSync(path.join(targetDir, "keep.txt"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, ".git"))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, "dist"))).toBe(false);
  });

  it("applies .templateignore after copying (matches live-source layout)", async () => {
    fs.writeFileSync(path.join(sourceDir, ".templateignore"), "internal/**\n");
    fs.writeFileSync(path.join(sourceDir, "kept.txt"), "kept");
    fs.mkdirSync(path.join(sourceDir, "internal"), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, "internal", "secret.txt"), "secret");

    process.env.SAILOR_TEMPLATE_LOCAL_DIR = sourceDir;
    await cloneTemplate(targetDir);

    expect(fs.existsSync(path.join(targetDir, "kept.txt"))).toBe(true);
    // Ignored content is stripped from the scaffold output.
    expect(fs.existsSync(path.join(targetDir, "internal", "secret.txt"))).toBe(false);
    // The manifest itself is removed from the scaffold output.
    expect(fs.existsSync(path.join(targetDir, ".templateignore"))).toBe(false);
  });

  it("throws when the configured directory does not exist", async () => {
    process.env.SAILOR_TEMPLATE_LOCAL_DIR = path.join(sourceDir, "does-not-exist");
    await expect(cloneTemplate(targetDir)).rejects.toThrow(/does not exist/);
  });
});
