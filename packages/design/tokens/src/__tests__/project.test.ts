import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { renderProject } from "../project/render";

/**
 * project.css and project.generated.ts are generated from project/ and
 * committed (apps import them without building tokens first). They must be
 * what project/ says, or a project's look silently differs from its preset.
 * Whitespace is ignored: the committed copies are Biome-formatted.
 */
const root = join(import.meta.dirname, "../..");
const squash = (s: string) => s.replace(/\s+/g, "");

describe("the committed project look", () => {
  it("is what project/ renders to", () => {
    const { css, ts } = renderProject(root);
    assert.equal(squash(readFileSync(join(root, "project.css"), "utf8")), squash(css));
    assert.equal(squash(readFileSync(join(root, "src/project.generated.ts"), "utf8")), squash(ts));
  });
});
