/**
 * The page's colour pairs (public.css roles) must reach WCAG AA on the generated tokens, in both
 * modes, and the build-time facts must be what the pinned source contains.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM build helpers without types.
import { resolveChartSource } from "../../scripts/chart-source.mjs";
// @ts-expect-error: plain ESM build helpers without types.
import { buildTokensCss, readFacts, readPresetPalettes, readVars } from "../../scripts/landing-source.mjs";

const app = new URL("../../", import.meta.url).pathname;
const source: string = resolveChartSource(app);
const pin = JSON.parse(readFileSync(resolve(app, "chart-source.json"), "utf8"));
const css = (file: string): Map<string, string> =>
  readVars(readFileSync(resolve(source, "packages/core/design-tokens/css", file), "utf8"));

function luminance(hex: string): number {
  const value = hex.replace("#", "").slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("page colour pairs on the default preset", () => {
  const accent = readVars(readFileSync(resolve(source, "packages/core/design-tokens/css/foundation.css"), "utf8"));
  const accentText = {
    light: readVars(readFileSync(resolve(source, "packages/core/design-tokens/css/foundation.css"), "utf8"), "[data-theme='light']").get("--klc-brand-accent-text")!,
    dark: readVars(readFileSync(resolve(source, "packages/core/design-tokens/css/foundation.css"), "utf8"), "[data-theme='dark']").get("--klc-brand-accent-text")!,
  };
  for (const mode of ["light", "dark"] as const) {
    it(`reaches AA in ${mode}`, () => {
      const v = css(`theme.pro.${mode}.css`);
      const get = (name: string) => v.get(name)!;
      const page = get("--klc-color-ui-background");
      const text = [
        ["ink on page", get("--klc-color-ui-text"), page],
        ["ink-2 on page", get("--klc-color-ui-muted"), page],
        ["ink-2 on surface", get("--klc-color-ui-muted"), get("--klc-color-ui-surface")],
        ["ink on surface", get("--klc-color-ui-text"), get("--klc-color-ui-surface")],
        ["primary button label", page, get("--klc-color-ui-text")],
        ["link text", accentText[mode], page],
      ] as const;
      for (const [name, fg, bg] of text) expect(contrast(fg, bg), name).toBeGreaterThanOrEqual(4.5);
      const ui = [
        ["focus ring", accent.get("--klc-brand-accent")!, page],
        ["up mark", get("--klc-color-candle-up-body"), page],
        ["down mark", get("--klc-color-candle-down-body"), page],
      ] as const;
      for (const [name, fg, bg] of ui) expect(contrast(fg, bg), name).toBeGreaterThanOrEqual(3);
    });
  }

  it("keeps preset preview captions readable in every preset and mode", () => {
    const palettes = readPresetPalettes(source);
    for (const [preset, modes] of Object.entries(palettes) as [string, Record<string, Record<string, string>>][]) {
      for (const [mode, p] of Object.entries(modes)) {
        expect(contrast(p.text!, p.background!), `${preset} ${mode} text`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.muted!, p.background!), `${preset} ${mode} caption`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("generated inputs", () => {
  it("emits both modes and the no-JS fallback from the generated CSS", () => {
    const out: string = buildTokensCss(source);
    expect(out).toContain("[data-theme='dark'] {");
    expect(out).toContain("@media (prefers-color-scheme: dark)");
    expect(out).toContain("--klc-brand-accent: #4C77C6");
    expect(out).not.toContain("--klc-color-ma-ma5");
  });

  it("counts facts from the pinned source and links them to that commit", () => {
    const facts = readFacts(source, pin);
    expect(facts.commit).toBe(pin.commit);
    expect(facts.tools.count).toBe(facts.tools.names.length);
    expect(facts.tools.names).toContain("drawing_create");
    expect(facts.backends.names).toEqual(["webgpu", "webgl", "canvas"]);
    expect(facts.presets.count).toBe(5);
    expect(facts.license).toBe("Apache-2.0");
    for (const href of [facts.tools.href, facts.backends.href, facts.license_href]) {
      expect(href).toContain(`/blob/${pin.commit}/`);
    }
  });
});
