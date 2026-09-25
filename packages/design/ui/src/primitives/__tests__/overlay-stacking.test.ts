import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Base UI renders overlays as Portal → Positioner (position: absolute/fixed)
 * → Popup (position: static). A z-index on the static Popup is ignored, so an
 * overlay whose Positioner carries none stacks at `auto` and any `z-10` layer on
 * the page paints over it — PARA's composer covered the top of its own
 * Advanced popover this way. Every Positioner must set the z-index itself.
 */
const PRIMITIVES = join(import.meta.dirname, "..");

describe("overlay stacking", () => {
  const files = readdirSync(PRIMITIVES).filter((f) => f.endsWith(".tsx"));

  it.each(files)("%s: every Positioner sets its own z-index", (file) => {
    const source = readFileSync(join(PRIMITIVES, file), "utf8");
    const openings = [...source.matchAll(/<\w+\.Positioner\b[^>]*>/gs)].map((m) => m[0]);
    for (const tag of openings) {
      expect(tag, `${file}: ${tag.slice(0, 80)}`).toMatch(/zIndex/);
    }
  });
});
