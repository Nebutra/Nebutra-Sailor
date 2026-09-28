import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { emitBrandCss } from "../../brand-package/emit-css";
import type { BrandPackage } from "../../brand-package/types";
import { validateBrandPackage } from "../../brand-package/validate";
import { decodePreset, encodePreset, PresetCodeError, parsePreset } from "../codec";
import { factoryBrandPackage } from "../factory";
import {
  PRESET_BASES,
  PRESET_DENSITIES,
  PRESET_HEADINGS,
  PRESET_MODES,
  PRESET_MONOS,
  PRESET_NEUTRALS,
  PRESET_RADII,
  PRESET_SANS,
  PRESET_WEIGHTS,
  type Preset,
  type PresetBase,
} from "../knobs";
import { resolvePreset } from "../resolve";

const brandsDir = join(import.meta.dirname, "../../../brands");
const baseOf = (id: PresetBase): BrandPackage =>
  id === "factory"
    ? factoryBrandPackage()
    : (JSON.parse(readFileSync(join(brandsDir, id, "brand.json"), "utf8")) as BrandPackage);

/** A preset that sets every knob, cycling through each list so all values appear. */
function presetAt(i: number): Preset {
  const at = <T>(list: readonly T[]) => list[i % list.length] as T;
  const preset: Preset = { base: at(PRESET_BASES) };
  const set = (key: keyof Preset, value: unknown) => {
    if (value !== "base") (preset as unknown as Record<string, unknown>)[key] = value;
  };
  set("neutral", at(PRESET_NEUTRALS));
  set("radius", at(PRESET_RADII));
  set("density", at(PRESET_DENSITIES));
  set("sans", at(PRESET_SANS));
  set("heading", at(PRESET_HEADINGS));
  set("mono", at(PRESET_MONOS));
  set("headingWeight", at(PRESET_WEIGHTS));
  set("mode", at(PRESET_MODES));
  if (i % 3 === 0)
    preset.brandColor = `#${((i * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(-6)}`;
  return preset;
}

describe("preset codes", () => {
  it("round-trip every value of every knob", () => {
    for (let i = 0; i < 60; i++) {
      const preset = presetAt(i);
      const code = encodePreset(preset);
      assert.ok(code.length <= 12, `${code} is too long`);
      assert.deepEqual(decodePreset(code), preset, `code ${code}`);
    }
  });

  it("take a base language id on its own", () => {
    for (const base of PRESET_BASES) assert.deepEqual(parsePreset(base), { base });
  });

  it("reject what is not a code, and a version this build cannot read", () => {
    assert.throws(() => decodePreset("not-a-code!"), PresetCodeError);
    // version bits 0: every code this build writes has version 1 in the low bits
    assert.throws(() => decodePreset("8"), PresetCodeError);
  });
});

describe("resolving a preset", () => {
  for (const base of PRESET_BASES) {
    it(`over ${base} gives a valid package that emits`, () => {
      const preset: Preset = {
        base,
        brandColor: "#7c3aed",
        neutral: "warm",
        radius: "lg",
        sans: "Inter",
      };
      const { brand } = resolvePreset(preset, baseOf(base), { id: "project", name: "Project" });
      const validation = validateBrandPackage(brand);
      assert.ok(validation.ok, JSON.stringify(validation));
      const css = emitBrandCss(brand, { mode: "global" });
      assert.match(css, /--primary:/);
    });
  }

  it("puts the brand colour on the action fill and ring of every mode, with a readable label", () => {
    const { brand } = resolvePreset({ base: "factory", brandColor: "#facc15" }, baseOf("factory"), {
      id: "p",
      name: "P",
    });
    for (const mode of ["light", "dark"] as const) {
      const roles = brand.modes?.[mode]?.roles;
      assert.equal(roles?.action, roles?.ring);
      // a yellow fill takes the dark ink, not white
      assert.equal(roles?.actionForeground, "225 7.7% 10.2%");
    }
  });

  it("retints neutrals without moving their lightness", () => {
    const factory = baseOf("factory");
    const { brand } = resolvePreset({ base: "factory", neutral: "warm" }, factory, {
      id: "p",
      name: "P",
    });
    const before = factory.modes?.light?.semantic?.background ?? "";
    const after = brand.modes?.light?.roles?.canvas ?? "";
    assert.match(after, /^35 9% /);
    assert.equal(after.split(" ")[2], before.split(" ")[2]);
  });

  it("switches the default mode of a dual-mode language, and says so when it cannot", () => {
    const dual = resolvePreset({ base: "factory", mode: "dark" }, baseOf("factory"), {
      id: "p",
      name: "P",
    });
    assert.equal(dual.brand.darkDefault, true);
    assert.deepEqual(dual.warnings, []);

    // gsap ships one palette, dark: there is no light one to switch to
    const single = resolvePreset({ base: "gsap", mode: "light" }, baseOf("gsap"), {
      id: "p",
      name: "P",
    });
    assert.equal(single.brand.darkDefault, true);
    assert.equal(single.warnings.length, 1);
  });

  it("names only self-hosted faces, so the emitted stacks lead with a registry variable", () => {
    const { brand } = resolvePreset(
      { base: "factory", sans: "Figtree", heading: "Fraunces", mono: "Fira Code" },
      baseOf("factory"),
      { id: "p", name: "P" },
    );
    const css = emitBrandCss(brand, { mode: "global" });
    for (const m of css.matchAll(/--font-(sans|display|heading|mono):\s*([^;]+);/g)) {
      assert.ok(m[2]?.trim().startsWith("var(--font"), `${m[1]}: ${m[2]}`);
    }
  });
});
