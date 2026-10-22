import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// The audit helper is owned by @nebutra/tokens; the theme package measures the
// catalog it publishes with the very same numbers.
import {
  cssBlocks,
  declared,
  HAIRLINE_CONTRAST,
  MOTION_CEILING,
  palettes,
  toPx,
} from "../../../tokens/scripts/surface-audit.mjs";
import { listSkinLanguages } from "../languages";

const themeRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = (file: string) => readFileSync(resolve(themeRoot, file), "utf8");

const scopedIds = readdirSync(resolve(themeRoot, "scoped"))
  .filter((file) => file.endsWith(".css"))
  .map((file) => file.replace(/\.css$/, ""))
  .sort();

describe("the published catalog keeps every language's edges hairline", () => {
  const { min, max } = HAIRLINE_CONTRAST;

  it("skins.css holds the hairline band in every language and mode", () => {
    const found = palettes(read("skins.css"));
    // 8 skins, light + dark each.
    expect(found.length).toBeGreaterThanOrEqual(listSkinLanguages().length * 2);
    for (const p of found) {
      expect(p.borderVsBackground, `${p.selector} --border ${p.border}`).toBeGreaterThanOrEqual(
        min,
      );
      expect(p.borderVsBackground, `${p.selector} --border ${p.border}`).toBeLessThanOrEqual(max);
    }
  });

  it("every scoped skin carries a visibly stronger --border-strong in each mode", () => {
    for (const id of scopedIds) {
      const found = palettes(read(`scoped/${id}.css`));
      expect(found.length, `${id}: no palette`).toBeGreaterThan(0);
      for (const p of found) {
        expect(p.strongValue, `${id} (${p.mode}) declares no --border-strong`).toBeTruthy();
        expect(p.strongVsBackground ?? 0, `${id} (${p.mode})`).toBeGreaterThanOrEqual(
          p.borderVsBackground + 0.5,
        );
      }
    }
  });

  it("keeps Vanta's carbon ink reachable as --border-strong, not as --border", () => {
    const light = palettes(read("scoped/vanta.css")).find((p) => p.mode === "light");
    expect(light?.borderVsBackground).toBeLessThanOrEqual(max);
    expect(light?.strongVsBackground ?? 0).toBeGreaterThanOrEqual(12);
  });
});

describe("every scoped skin declares the shape ladder and the motion rails", () => {
  it.each(scopedIds)("%s", (id) => {
    const css = read(`scoped/${id}.css`);
    const body = cssBlocks(css)
      .map((block) => block.body)
      .join("\n");
    for (const name of ["--radius-control", "--radius-chip", "--radius-card"]) {
      expect(declared(body, name), `${id} ${name}`).toBeTruthy();
    }
    // A pill (>= 100px) is a language decision; anything else stays on the ladder.
    const card = toPx(declared(body, "--radius-card"));
    for (const name of ["--radius-control", "--radius-chip"]) {
      const px = toPx(declared(body, name));
      if (px !== null && px < 100 && card !== null)
        expect(px, `${id} ${name}`).toBeLessThanOrEqual(card);
    }
    const micro = Number.parseFloat(declared(body, "--motion-duration-micro") ?? "");
    const flow = Number.parseFloat(declared(body, "--motion-duration-flow") ?? "");
    const reveal = Number.parseFloat(declared(body, "--motion-duration-reveal") ?? "");
    for (const value of [micro, flow, reveal])
      expect(Number.isFinite(value), `${id} motion`).toBe(true);
    expect(micro).toBeLessThanOrEqual(MOTION_CEILING.micro);
    expect(flow).toBeLessThanOrEqual(MOTION_CEILING.flow);
    expect(reveal).toBeLessThanOrEqual(MOTION_CEILING.reveal);
    expect(declared(body, "--motion-ease-out") ?? "").toMatch(/^cubic-bezier\(/);
  });
});
