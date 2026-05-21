import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(join(process.cwd(), "src", "primitives", relativePath), "utf8");

describe("primitive motion governance", () => {
  it("keeps Loader on the canonical tokenized loading primitives", () => {
    const loaderSource = source("loader.tsx");

    expect(loaderSource).not.toMatch(/animate-\[[^\]]*\d+(?:\.\d+)?s/gu);
    expect(loaderSource).not.toMatch(/animation:\s*`[^`]*\d+(?:\.\d+)?s/gu);
    expect(loaderSource).not.toMatch(/@keyframes|const KEYFRAMES|@media \(prefers-reduced-motion/u);
  });

  it.each([
    "progress.tsx",
    "toggle-group.tsx",
  ] as const)("does not use transition-all in %s", (relativePath) => {
    expect(source(relativePath)).not.toMatch(/\btransition-all\b/u);
  });
});
