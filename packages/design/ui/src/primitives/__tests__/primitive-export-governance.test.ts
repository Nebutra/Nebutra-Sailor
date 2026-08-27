import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const canonicalEntry = join(process.cwd(), "src", "primitives", "canonical.ts");

const nonCanonicalSpecifiers = [
  "avatar-smart-group",
  "avatar-circles",
  "badge-1",
  "base-badge",
  "base-button",
  "interactive-frosted-glass-card",
  "apple-liquid-glass-switcher",
] as const;

describe("primitive export governance", () => {
  it("has a canonical primitive entrypoint separate from the legacy all-export barrel", () => {
    expect(existsSync(canonicalEntry)).toBe(true);
  });

  it("keeps lab and legacy aliases out of the canonical primitive entrypoint", () => {
    const source = readFileSync(canonicalEntry, "utf8");

    for (const specifier of nonCanonicalSpecifiers) {
      expect(source).not.toContain(`"./${specifier}"`);
    }

    expect(source).toContain('from "./input"');
    expect(source).toContain('from "./textarea"');
    expect(source).toContain('from "./select"');
  });
});
