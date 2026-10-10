import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  contrastRatio,
  hoverSurface,
  MAX_HOVER_SURFACE_CONTRAST,
  MIN_HOVER_LABEL_CONTRAST,
} from "../hover-surface";

const SKINS = join(import.meta.dirname, "../../../skins");

/** Every `{ … }` block in a skin that declares the accent pair. */
function accentBlocks(css: string) {
  const out: { selector: string; vars: Record<string, string> }[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const vars: Record<string, string> = {};
    for (const d of (m[2] ?? "").matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[d[1] ?? ""] = d[2] ?? "";
    if (vars.accent && vars["accent-foreground"] && vars.background) {
      out.push({ selector: (m[1] ?? "").trim(), vars });
    }
  }
  return out;
}

describe("--accent is a legible hover surface in every language", () => {
  const files = readdirSync(SKINS).filter((f) => f.endsWith(".css"));
  it("finds the skins", () => assert.ok(files.length >= 9));

  for (const file of files) {
    for (const { selector, vars } of accentBlocks(readFileSync(join(SKINS, file), "utf8"))) {
      it(`${file} ${selector.split("\n").pop()}`, () => {
        const distance = contrastRatio(vars.accent as string, vars.background as string);
        const label = contrastRatio(vars["accent-foreground"] as string, vars.accent as string);
        assert.ok(distance !== null && label !== null, "accent pair is not an HSL triple");
        assert.ok(
          distance <= MAX_HOVER_SURFACE_CONTRAST,
          `--accent ${vars.accent} is ${distance.toFixed(2)}:1 from the canvas — a fill, not a hover tint`,
        );
        assert.ok(
          label >= MIN_HOVER_LABEL_CONTRAST,
          `--accent-foreground reads ${label.toFixed(2)}:1 on --accent`,
        );
      });
    }
  }
});

describe("hoverSurface", () => {
  it("keeps a quiet accent", () => {
    assert.deepEqual(hoverSurface("0 0% 92%", "0 0% 9%", "0 0% 100%", "0 0% 9%"), {
      accent: "0 0% 92%",
      accentForeground: "0 0% 9%",
    });
  });
  it("replaces a brand fill with a canvas tint and the canvas ink", () => {
    const r = hoverSurface("211 78% 11%", "0 0% 100%", "0 0% 100%", "211 78% 11%");
    assert.equal(r.accentForeground, "211 78% 11%");
    assert.ok((contrastRatio(r.accent, "0 0% 100%") ?? 99) < 1.3);
  });
});
