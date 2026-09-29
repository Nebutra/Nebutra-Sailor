import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodePreset, PresetCodeError } from "../codec";
import { PRESET_BASES } from "../knobs";
import {
  presetArgument,
  presetFromJson,
  presetJsonSchema,
  readPresetInput,
  STUDIO_URL,
  studioReviewUrl,
} from "../schema";

describe("preset schema", () => {
  it("lists every knob's choices from the knob lists", () => {
    const schema = presetJsonSchema() as { properties: Record<string, { enum?: unknown[] }> };
    assert.deepEqual(schema.properties.base?.enum, [...PRESET_BASES]);
    assert.ok(schema.properties.brandColor);
  });

  it("reads an agent's JSON and round-trips through the code", () => {
    const preset = presetFromJson({
      base: "linear",
      brandColor: "#2E65EE",
      radius: "lg",
      sans: "base",
    });
    assert.deepEqual(preset, { base: "linear", brandColor: "#2e65ee", radius: "lg" });
    assert.deepEqual(decodePreset(presetArgument(preset)), preset);
  });

  it("names the field an agent got wrong", () => {
    assert.throws(
      () => presetFromJson({ base: "linear", radius: "huge" }),
      /"radius" must be one of/,
    );
    assert.throws(
      () => presetFromJson({ base: "linear", colour: "#fff" }),
      /Unknown field "colour"/,
    );
    assert.throws(() => presetFromJson({ radius: "lg" }), PresetCodeError);
  });

  it("accepts JSON text, a code, a base id or a Studio URL", () => {
    const preset = { base: "vercel", radius: "none" } as const;
    const url = studioReviewUrl(preset, "claude-code");
    assert.ok(url.startsWith(`${STUDIO_URL}?preset=`) && url.endsWith("&from=claude-code"), url);
    assert.deepEqual(readPresetInput(url), preset);
    assert.deepEqual(readPresetInput(JSON.stringify(preset)), preset);
    assert.deepEqual(readPresetInput("stripe"), { base: "stripe" });
  });
});

describe("tintLogo", () => {
  it("is off in every code written before it existed, and round-trips when on", () => {
    // A code from before the field: its top bit is absent, so it reads untinted.
    const before = presetArgument({ base: "linear", brandColor: "#2e65ee", radius: "lg" });
    assert.equal(decodePreset(before).tintLogo, undefined);
    const on = { base: "linear", tintLogo: true } as const;
    assert.deepEqual(decodePreset(presetArgument(on)), on);
    assert.deepEqual(presetFromJson({ base: "linear", tintLogo: false }), { base: "linear" });
  });
});
