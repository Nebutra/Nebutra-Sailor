import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for the data-loss bug in create-sailor <= 1.10.0.
 *
 * `cloneTemplate` used to call a `resetDirectory(targetDir)` helper — an
 * unguarded rm -rf over every entry of the target — from the catch of its
 * source loop. Answering "In the current directory" from `~` pointed that at
 * the user's home directory, and any failed download (the 126 MB mirror
 * stalling was enough) fired it.
 *
 * The invariant these tests lock down: a failed clone must not touch a single
 * byte inside the target directory.
 */

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn((file: string, args: readonly string[] = []) => {
    // `tar --version` is the availability probe — let it succeed.
    if (file === "tar" && args[0] === "--version") return "";
    // Every other shell-out (git ls-remote, tar -xzf) fails: these tests run
    // with no network and must never reach GitHub.
    throw new Error(`refused in test: ${file} ${args.join(" ")}`);
  }),
}));

const { cloneTemplate } = await import("../git");

/** Files a user would already have in a directory they scaffold into. */
function seedUserFiles(dir: string): string[] {
  fs.mkdirSync(path.join(dir, ".ssh"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".ssh", "id_rsa"), "PRIVATE KEY");
  fs.mkdirSync(path.join(dir, "Documents"), { recursive: true });
  fs.writeFileSync(path.join(dir, "Documents", "taxes.txt"), "2026");
  fs.writeFileSync(path.join(dir, "notes.md"), "# mine");
  return [".ssh/id_rsa", "Documents/taxes.txt", "notes.md"];
}

describe("cloneTemplate — target directory safety", () => {
  let targetDir: string;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-safety-"));
    delete process.env.SAILOR_TEMPLATE_LOCAL_DIR;
    delete process.env.SAILOR_TEMPLATE_SOURCE;
    delete process.env.SAILOR_TEMPLATE_REPO;
    delete process.env.SAILOR_TEMPLATE_REF;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    fs.rmSync(targetDir, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it("leaves every pre-existing file intact when all sources fail", async () => {
    const seeded = seedUserFiles(targetDir);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(cloneTemplate(targetDir)).rejects.toThrow(
      /Could not download the Sailor template/,
    );

    for (const rel of seeded) {
      expect(fs.existsSync(path.join(targetDir, rel)), `${rel} was deleted`).toBe(true);
    }
    expect(fs.readFileSync(path.join(targetDir, ".ssh", "id_rsa"), "utf8")).toBe("PRIVATE KEY");
  });

  it("adds nothing to the target when all sources fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(cloneTemplate(targetDir)).rejects.toThrow();
    expect(fs.readdirSync(targetDir)).toEqual([]);
  });

  it("says nothing was written, and how to work around a failing download", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(cloneTemplate(targetDir)).rejects.toThrow(
      /Nothing was written to your project directory/,
    );
  });

  it("merges a local template over pre-existing files without deleting them", async () => {
    const seeded = seedUserFiles(targetDir);

    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-src-"));
    fs.writeFileSync(path.join(sourceDir, "package.json"), '{"name":"tpl"}');
    fs.mkdirSync(path.join(sourceDir, "apps"), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, "apps", "web.txt"), "web");
    process.env.SAILOR_TEMPLATE_LOCAL_DIR = sourceDir;

    try {
      const result = await cloneTemplate(targetDir);

      // Template landed.
      expect(fs.existsSync(path.join(targetDir, "package.json"))).toBe(true);
      // The user's own files survived the merge.
      for (const rel of seeded) {
        expect(fs.existsSync(path.join(targetDir, rel)), `${rel} was deleted`).toBe(true);
      }
      // createdEntries names only what the clone added, so rollback can be exact.
      expect(result.createdEntries.sort()).toEqual(["apps", "package.json"]);
      expect(result.createdEntries).not.toContain("notes.md");
      expect(result.bytes).toBeGreaterThan(0);
    } finally {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  });

  it("reports a diagnosable reason instead of a bare 'fetch failed'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new TypeError("fetch failed");
        (err as { cause?: unknown }).cause = Object.assign(new Error("getaddrinfo ENOTFOUND"), {
          code: "ENOTFOUND",
        });
        throw err;
      }),
    );

    await expect(cloneTemplate(targetDir)).rejects.toThrow(/DNS lookup failed/);
  });
});
