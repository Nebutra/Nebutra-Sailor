import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "primitives", "dropdown-menu.tsx"), "utf8");

describe("dropdown-menu overlay stacking", () => {
  it("puts popover z-index on the Positioner so a sticky header cannot cover the menu", () => {
    // z-index on Popup alone stays inside a Positioner that is still auto.
    // Sticky chrome at z-50 then paints over the portaled menu.
    const positioners = [...source.matchAll(/<BaseMenu\.Positioner\b([^>]*)>/gu)].map(
      (match) => match[1] ?? "",
    );
    expect(positioners.length).toBeGreaterThan(0);
    expect(positioners.every((attrs) => /zIndex:\s*overlayZIndex\.popover/u.test(attrs))).toBe(
      true,
    );
  });
});
