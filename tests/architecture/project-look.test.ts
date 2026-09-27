import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A project's look is project.css (ADR 2026-09-27 Sailor Studio): its preset,
 * rendered over the House tokens. A stylesheet that loads the House tokens
 * without it shows factory where the project chose something else — in one
 * app while the others follow the preset.
 */
const ROOT = join(import.meta.dirname, "../..");
const STYLES = /^\s*@import\s+["']@nebutra\/tokens\/styles\.css["'];/m;
const PROJECT = /^\s*@import\s+["']@nebutra\/tokens\/project\.css["'];/m;

describe("the project look", () => {
  const files = execFileSync("git", ["ls-files", "apps/**/*.css", "packages/**/*.css"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((f) => STYLES.test(readFileSync(join(ROOT, f), "utf8")));

  it("is found", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files)("%s loads project.css right after styles.css", (file) => {
    const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
    const at = lines.findIndex((l) => STYLES.test(l));
    expect(PROJECT.test(lines[at + 1] ?? "")).toBe(true);
  });
});
