import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { overlayZIndex } from "../components/overlay";

/**
 * overlayZIndex (numbers, for inline styles in primitives) and core.json:layer
 * (CSS variables, for everything else) describe the same overlay tier. Two
 * copies drift; this keeps them equal.
 */
describe("layer ladder", () => {
  const core = JSON.parse(
    readFileSync(join(import.meta.dirname, "../../../../design-tokens/tokens/core.json"), "utf8"),
  ) as { layer: Record<string, { $value?: string }> };

  it.each(Object.entries(overlayZIndex))("overlay %s matches core.json:layer", (role, value) => {
    expect(Number(core.layer[role]?.$value)).toBe(value);
  });

  it("keeps page chrome below the overlay tier", () => {
    const chrome = [
      "raised",
      "sticky",
      "floating",
      "nav",
      "drawer",
      "banner",
      "skip-link",
      "panel",
    ];
    for (const role of chrome) {
      expect(Number(core.layer[role]?.$value)).toBeLessThan(overlayZIndex.backdrop);
    }
  });
});
