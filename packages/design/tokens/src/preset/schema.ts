/**
 * The preset as an agent sees it: a JSON Schema generated from the knob lists,
 * and a strict reader that turns an agent's JSON into a Preset or says exactly
 * which field is wrong. Studio, `nebutra studio`, the MCP tools and the
 * published <site>/studio/preset.schema.json all read this one file, so
 * the contract cannot drift from the codec.
 */
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { encodePreset, PresetCodeError, parsePreset } from "./codec";
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
} from "./knobs";

const ENUMS = {
  base: PRESET_BASES,
  neutral: PRESET_NEUTRALS,
  radius: PRESET_RADII,
  density: PRESET_DENSITIES,
  sans: PRESET_SANS,
  heading: PRESET_HEADINGS,
  mono: PRESET_MONOS,
  headingWeight: PRESET_WEIGHTS,
  mode: PRESET_MODES,
} as const;

const DESCRIPTIONS: Record<keyof Preset, string> = {
  base: "The design language to start from. `factory` is the House tokens; the others are complete brand packages.",
  brandColor:
    "#rrggbb. Becomes the action fill (buttons) and the ring (focus, links). Omit to keep the base's.",
  neutral: "Temperature of neutral surfaces and text.",
  radius: "Corner radius scale for buttons, cards, badges and inputs.",
  density: "Control height and spacing scale.",
  sans: "Body face. Only self-hosted faces are offered.",
  heading: "Heading face. `sans` sets headings in the body face.",
  mono: "Code face.",
  headingWeight: "Heading weight.",
  mode: "Which mode a visitor sees first. Only a dual-mode base can change it.",
  tintLogo:
    "Paint the wordmark in the base's brand colour. Off by default: the wordmark reads in ink.",
};

/** Where the hosted Studio lives: the brand's own site, which serves /sailor/studio. */
export const STUDIO_ORIGIN = getBrandOrigin("landing");

export const PRESET_SCHEMA_ID = `${STUDIO_ORIGIN}/studio/preset.schema.json`;

/** JSON Schema (draft 2020-12) for a Preset. Every field but `base` may be omitted, meaning "base". */
export function presetJsonSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    brandColor: {
      type: "string",
      pattern: "^#[0-9a-fA-F]{6}$",
      description: DESCRIPTIONS.brandColor,
    },
  };
  for (const [key, values] of Object.entries(ENUMS)) {
    properties[key] = { enum: [...values], description: DESCRIPTIONS[key as keyof Preset] };
  }
  properties.tintLogo = { type: "boolean", default: false, description: DESCRIPTIONS.tintLogo };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: PRESET_SCHEMA_ID,
    title: "Sailor Studio preset",
    description:
      "A Sailor project's whole look in one object. Encode it with `nebutra studio preview` to review it in Sailor Studio, then `nebutra studio pull` or `create-sailor --preset` to apply it.",
    type: "object",
    required: ["base"],
    additionalProperties: false,
    properties,
  };
}

/**
 * Read an agent's JSON into a Preset. Unknown fields and out-of-list values
 * are errors, not silently dropped: an agent must learn what it got wrong.
 * `"base"` values are dropped, since omitted already means base.
 */
export function presetFromJson(input: unknown): Preset {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new PresetCodeError("A preset is a JSON object with at least `base`.");
  }
  const raw = input as Record<string, unknown>;
  const allowed = new Set(["brandColor", "tintLogo", ...Object.keys(ENUMS)]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new PresetCodeError(`Unknown field "${key}". Fields: ${[...allowed].join(", ")}.`);
    }
  }
  const out: Record<string, unknown> = {};
  for (const [key, values] of Object.entries(ENUMS)) {
    const value = raw[key];
    if (value === undefined) continue;
    if (!(values as readonly unknown[]).includes(value)) {
      throw new PresetCodeError(
        `"${key}" must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}; got ${JSON.stringify(value)}.`,
      );
    }
    if (value !== "base") out[key] = value;
  }
  if (out.base === undefined) throw new PresetCodeError('"base" is required.');
  if (raw.tintLogo !== undefined) {
    if (typeof raw.tintLogo !== "boolean") {
      throw new PresetCodeError(
        `"tintLogo" must be true or false; got ${JSON.stringify(raw.tintLogo)}.`,
      );
    }
    if (raw.tintLogo) out.tintLogo = true;
  }
  if (raw.brandColor !== undefined) {
    if (typeof raw.brandColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(raw.brandColor)) {
      throw new PresetCodeError(
        `"brandColor" must be #rrggbb; got ${JSON.stringify(raw.brandColor)}.`,
      );
    }
    out.brandColor = raw.brandColor.toLowerCase();
  }
  return out as unknown as Preset;
}

/**
 * What an agent may hand over: a preset object, its JSON text, a preset code,
 * a base id, or a Studio / acme URL carrying `?preset=`.
 */
export function readPresetInput(input: unknown): Preset {
  if (typeof input !== "string") return presetFromJson(input);
  const value = input.trim();
  if (value.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new PresetCodeError("That looks like JSON but does not parse.");
    }
    return presetFromJson(parsed);
  }
  if (/^https?:\/\//.test(value)) {
    const code = new URL(value).searchParams.get("preset");
    if (!code) throw new PresetCodeError("That URL carries no ?preset= to read.");
    return parsePreset(code);
  }
  return parsePreset(value);
}

export const STUDIO_URL = `${STUDIO_ORIGIN}/sailor/studio`;

/** The code `--preset` takes: a bare base id when nothing is overridden. */
export function presetArgument(preset: Preset): string {
  return Object.keys(preset).length === 1 ? preset.base : encodePreset(preset);
}

/** The Studio link that opens this preset for review; `from` marks who proposed it. */
export function studioReviewUrl(preset: Preset, from?: string): string {
  const url = new URL(STUDIO_URL);
  url.searchParams.set("preset", presetArgument(preset));
  if (from) url.searchParams.set("from", from);
  return url.toString();
}
