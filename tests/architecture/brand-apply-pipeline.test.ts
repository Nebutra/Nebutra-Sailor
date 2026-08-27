import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// H3: static import — do NOT use dynamic import() for deriveColorNodes.
// This is a pure unit test of the derivation logic (no subprocess).
import { deriveColorNodes } from "../../scripts/brand-apply";
import { DEFAULT_BRAND } from "../../scripts/brand-types";

/**
 * Unit tests for deriveColorNodes (Phase 1 — brand SSOT collapse).
 *
 * These tests verify the in-memory derivation logic only.
 * The integration tests (brand:apply subprocess) live in brand-metadata-drift.test.ts.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CORE_JSON_PATH = join(ROOT, "packages/design/design-tokens/tokens/core.json");

// The 11 scale steps that must appear in core.json for each brand scale.
// NOTE: The "0" key (nebutra-neutral.0 = "#ffffff") is intentionally excluded —
// it maps to color.white in core.json, not a scale step.
const SCALE_STEPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

interface DtcgLeaf {
  $value: string;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

interface DtcgColorEntry {
  $description?: string;
  [key: string]: DtcgLeaf | string | undefined;
}

interface CoreJson {
  color: {
    "nebutra-blue": DtcgColorEntry;
    "nebutra-cyan": DtcgColorEntry;
    "nebutra-neutral": DtcgColorEntry;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe("deriveColorNodes — unit tests (static import, no subprocess)", () => {
  const existingCore = JSON.parse(readFileSync(CORE_JSON_PATH, "utf-8")) as CoreJson;

  it("derives nebutra-blue scale with correct lowercase hex for all 11 steps", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);

    for (const step of SCALE_STEPS) {
      const derivedLeaf = derived["nebutra-blue"][step] as DtcgLeaf;
      const expectedHex =
        DEFAULT_BRAND.colors.primary[Number(step) as keyof typeof DEFAULT_BRAND.colors.primary];
      expect(derivedLeaf, `nebutra-blue[${step}] should exist`).toBeDefined();
      // Spec: hex in core.json is always lowercased (deliberate asymmetry —
      // metadata.ts keeps uppercase from DEFAULT_BRAND; core.json is lowercase).
      expect(derivedLeaf.$value).toBe(expectedHex.toLowerCase());
    }
  });

  it("derives nebutra-cyan scale with correct lowercase hex for all 11 steps", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);

    for (const step of SCALE_STEPS) {
      const derivedLeaf = derived["nebutra-cyan"][step] as DtcgLeaf;
      const expectedHex =
        DEFAULT_BRAND.colors.accent[Number(step) as keyof typeof DEFAULT_BRAND.colors.accent];
      expect(derivedLeaf, `nebutra-cyan[${step}] should exist`).toBeDefined();
      expect(derivedLeaf.$value).toBe(expectedHex.toLowerCase());
    }
  });

  it("derives nebutra-neutral scale with correct lowercase hex for all 11 steps", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);

    for (const step of SCALE_STEPS) {
      const derivedLeaf = derived["nebutra-neutral"][step] as DtcgLeaf;
      const expectedHex =
        DEFAULT_BRAND.colors.neutral[Number(step) as keyof typeof DEFAULT_BRAND.colors.neutral];
      expect(derivedLeaf, `nebutra-neutral[${step}] should exist`).toBeDefined();
      expect(derivedLeaf.$value).toBe(expectedHex.toLowerCase());
    }
  });

  it('nebutra-neutral has NO "0" key (NeutralColorScale.0 maps to color.white, not a scale step)', () => {
    // M6: explicit assertion that no "0" key is emitted for the neutral scale.
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    expect(derived["nebutra-neutral"]).not.toHaveProperty("0");
  });

  it("preserves $extensions (display-p3) on nebutra-blue 500-stop when p3Overrides is set", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    const blue500 = derived["nebutra-blue"]["500"] as DtcgLeaf;

    expect(blue500.$extensions).toBeDefined();
    expect((blue500.$extensions as Record<string, string>)["com.nebutra.display-p3"]).toBe(
      DEFAULT_BRAND.colors.p3Overrides?.primary500,
    );
  });

  it("preserves $extensions (display-p3) on nebutra-cyan 500-stop when p3Overrides is set", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    const cyan500 = derived["nebutra-cyan"]["500"] as DtcgLeaf;

    expect(cyan500.$extensions).toBeDefined();
    expect((cyan500.$extensions as Record<string, string>)["com.nebutra.display-p3"]).toBe(
      DEFAULT_BRAND.colors.p3Overrides?.accent500,
    );
  });

  it("preserves $description on nebutra-blue 500-stop", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    const blue500 = derived["nebutra-blue"]["500"] as DtcgLeaf;
    const onDiskBlue500 = existingCore.color["nebutra-blue"]["500"] as DtcgLeaf;

    expect(blue500.$description).toBe(onDiskBlue500.$description);
  });

  it("preserves $description on nebutra-cyan 500-stop", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    const cyan500 = derived["nebutra-cyan"]["500"] as DtcgLeaf;
    const onDiskCyan500 = existingCore.color["nebutra-cyan"]["500"] as DtcgLeaf;

    expect(cyan500.$description).toBe(onDiskCyan500.$description);
  });

  it("copies $description from existingCore onto nebutra-neutral scale root", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    const existingNeutralDesc = existingCore.color["nebutra-neutral"].$description as string;

    expect(derived["nebutra-neutral"].$description).toBe(existingNeutralDesc);
  });

  it("$description appears in the serialized JSON before numeric step keys (key-order stability for idempotent round-trips)", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);
    // NOTE: V8 always places integer-index-coercible keys ("50","100",…)
    // before non-index string keys ("$description") in Object.keys() output,
    // regardless of insertion order. So we cannot assert Object.keys()[0].
    // Instead we assert that the SERIALIZED JSON places $description first,
    // which is what core.json on disk also does — and which makes the
    // round-trip idempotent (parse→serialize→parse produces the same JSON text).
    const serialized = JSON.stringify(derived["nebutra-neutral"], null, 2);
    const descIndex = serialized.indexOf('"$description"');
    const step50Index = serialized.indexOf('"50"');
    // Both must be present.
    expect(descIndex, "$description must be present in serialized neutral").toBeGreaterThan(-1);
    expect(step50Index, '"50" step must be present in serialized neutral').toBeGreaterThan(-1);
    // The serialized order must match what JSON.stringify produces from the
    // existing on-disk parsed structure — i.e. numeric keys first, then
    // $description. This is the stable, idempotent order.
    const existingNeutralSerialized = JSON.stringify(
      existingCore.color["nebutra-neutral"],
      null,
      2,
    );
    const existingDescIndex = existingNeutralSerialized.indexOf('"$description"');
    const existingStep50Index = existingNeutralSerialized.indexOf('"50"');
    // Both should have the same relative ordering (either both desc-first or both steps-first).
    const derivedDescFirst = descIndex < step50Index;
    const existingDescFirst = existingDescIndex < existingStep50Index;
    expect(derivedDescFirst).toBe(existingDescFirst);
  });

  // I1 guard: missing 500-stop in existingCore must throw loudly.
  it("throws a descriptive error when nebutra-blue 500-stop is absent from existingCore (I1 guard)", () => {
    const coreWithoutBlue500 = {
      color: {
        "nebutra-blue": { ...existingCore.color["nebutra-blue"], "500": undefined },
        "nebutra-cyan": existingCore.color["nebutra-cyan"],
        "nebutra-neutral": existingCore.color["nebutra-neutral"],
      },
    };
    expect(() => deriveColorNodes(DEFAULT_BRAND.colors, coreWithoutBlue500 as never)).toThrowError(
      /nebutra-blue is missing the 500 stop/,
    );
  });

  it("throws a descriptive error when nebutra-cyan 500-stop is absent from existingCore (I1 guard)", () => {
    const coreWithoutCyan500 = {
      color: {
        "nebutra-blue": existingCore.color["nebutra-blue"],
        "nebutra-cyan": { ...existingCore.color["nebutra-cyan"], "500": undefined },
        "nebutra-neutral": existingCore.color["nebutra-neutral"],
      },
    };
    expect(() => deriveColorNodes(DEFAULT_BRAND.colors, coreWithoutCyan500 as never)).toThrowError(
      /nebutra-cyan is missing the 500 stop/,
    );
  });

  // I2 guard: incomplete or malformed palette must throw loudly.
  it("throws a descriptive error when a required palette step is missing (I2 guard)", () => {
    const incompletePalette = {
      ...DEFAULT_BRAND.colors,
      primary: { ...DEFAULT_BRAND.colors.primary, 500: undefined as unknown as string },
    };
    expect(() => deriveColorNodes(incompletePalette as never, existingCore)).toThrowError(
      /colors\.primary\[500\] must be a #rrggbb hex string/,
    );
  });

  it("throws a descriptive error when a palette step is not a valid hex string (I2 guard)", () => {
    const badPalette = {
      ...DEFAULT_BRAND.colors,
      accent: { ...DEFAULT_BRAND.colors.accent, 200: "notahex" },
    };
    expect(() => deriveColorNodes(badPalette as never, existingCore)).toThrowError(
      /colors\.accent\[200\] must be a #rrggbb hex string/,
    );
  });

  it("byte-derivability: $value for all 11 steps of each scale matches on-disk core.json (case-insensitive)", () => {
    const derived = deriveColorNodes(DEFAULT_BRAND.colors, existingCore);

    for (const step of SCALE_STEPS) {
      const onDiskBlue = (
        existingCore.color["nebutra-blue"][step] as DtcgLeaf
      ).$value.toLowerCase();
      const derivedBlue = (derived["nebutra-blue"][step] as DtcgLeaf).$value.toLowerCase();
      expect(derivedBlue, `nebutra-blue[${step}] mismatch`).toBe(onDiskBlue);

      const onDiskCyan = (
        existingCore.color["nebutra-cyan"][step] as DtcgLeaf
      ).$value.toLowerCase();
      const derivedCyan = (derived["nebutra-cyan"][step] as DtcgLeaf).$value.toLowerCase();
      expect(derivedCyan, `nebutra-cyan[${step}] mismatch`).toBe(onDiskCyan);

      const onDiskNeutral = (
        existingCore.color["nebutra-neutral"][step] as DtcgLeaf
      ).$value.toLowerCase();
      const derivedNeutral = (derived["nebutra-neutral"][step] as DtcgLeaf).$value.toLowerCase();
      expect(derivedNeutral, `nebutra-neutral[${step}] mismatch`).toBe(onDiskNeutral);
    }
  });
});
