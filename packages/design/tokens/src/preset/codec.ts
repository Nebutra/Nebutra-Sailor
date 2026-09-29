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

/**
 * A preset as a short code — the string Studio shows and `nebutra apply
 * --preset` / `create-sailor --preset` take.
 *
 * Every knob is an index into an append-only list (knobs.ts) except the brand
 * colour, so the whole preset packs into 56 bits, written in base62 (about
 * ten characters). No server stores it: the code IS the preset.
 *
 * Layout, least significant bits first. The version sits lowest so a decoder
 * reads it before anything whose meaning a later version might change.
 *
 *   version 3 · base 5 · neutral 2 · radius 3 · density 2 · sans 4 ·
 *   heading 4 · mono 3 · weight 3 · mode 2 · hasColor 1 · color 24 · tintLogo 1
 *
 * A field added later goes at the most significant end: every code written
 * before it decodes with that field at 0, which must mean "as before".
 */
export const PRESET_CODE_VERSION = 1;

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class PresetCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PresetCodeError";
  }
}

type Field = { bits: number; list?: readonly unknown[] };

const FIELDS = {
  version: { bits: 3 },
  base: { bits: 5, list: PRESET_BASES },
  neutral: { bits: 2, list: PRESET_NEUTRALS },
  radius: { bits: 3, list: PRESET_RADII },
  density: { bits: 2, list: PRESET_DENSITIES },
  sans: { bits: 4, list: PRESET_SANS },
  heading: { bits: 4, list: PRESET_HEADINGS },
  mono: { bits: 3, list: PRESET_MONOS },
  headingWeight: { bits: 3, list: PRESET_WEIGHTS },
  mode: { bits: 2, list: PRESET_MODES },
  hasColor: { bits: 1 },
  color: { bits: 24 },
  tintLogo: { bits: 1 },
} satisfies Record<string, Field>;

type FieldName = keyof typeof FIELDS;
const ORDER = Object.keys(FIELDS) as FieldName[];

for (const name of ORDER) {
  const field: Field = FIELDS[name];
  if (field.list && field.list.length > 2 ** field.bits) {
    throw new Error(`preset knob "${name}" outgrew its ${field.bits} bits`);
  }
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

function indexOf(name: FieldName, value: unknown): number {
  const list = (FIELDS[name] as Field).list;
  if (!list) throw new Error(`"${name}" is not a list knob`);
  const i = list.indexOf(value ?? "base");
  if (i < 0) throw new PresetCodeError(`Unknown ${name}: ${String(value)}`);
  return i;
}

export function encodePreset(preset: Preset): string {
  const values: Record<FieldName, number> = {
    version: PRESET_CODE_VERSION,
    base: indexOf("base", preset.base),
    neutral: indexOf("neutral", preset.neutral),
    radius: indexOf("radius", preset.radius),
    density: indexOf("density", preset.density),
    sans: indexOf("sans", preset.sans),
    heading: indexOf("heading", preset.heading),
    mono: indexOf("mono", preset.mono),
    headingWeight: indexOf("headingWeight", preset.headingWeight),
    mode: indexOf("mode", preset.mode),
    hasColor: preset.brandColor ? 1 : 0,
    color: 0,
    tintLogo: preset.tintLogo ? 1 : 0,
  };
  if (preset.brandColor) {
    if (!HEX_RE.test(preset.brandColor)) {
      throw new PresetCodeError(`Brand colour must be #rrggbb, got ${preset.brandColor}`);
    }
    values.color = Number.parseInt(preset.brandColor.slice(1), 16);
  }

  let n = 0n;
  let shift = 0n;
  for (const name of ORDER) {
    n |= BigInt(values[name]) << shift;
    shift += BigInt(FIELDS[name].bits);
  }
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}

export function decodePreset(code: string): Preset {
  if (!/^[0-9a-zA-Z]{1,12}$/.test(code)) {
    throw new PresetCodeError(`"${code}" is not a preset code`);
  }
  let n = 0n;
  for (const ch of code) n = n * 62n + BigInt(ALPHABET.indexOf(ch));

  const values = {} as Record<FieldName, number>;
  for (const name of ORDER) {
    const bits = BigInt(FIELDS[name].bits);
    values[name] = Number(n & ((1n << bits) - 1n));
    n >>= bits;
  }
  if (n !== 0n) throw new PresetCodeError(`"${code}" is longer than any preset`);
  if (values.version !== PRESET_CODE_VERSION) {
    throw new PresetCodeError(
      `"${code}" is preset format v${values.version}; this Sailor reads v${PRESET_CODE_VERSION}. Upgrade @nebutra/tokens.`,
    );
  }

  const pick = <T>(name: FieldName): T => {
    const list = (FIELDS[name] as Field).list as readonly T[];
    const value = list[values[name]];
    if (value === undefined) throw new PresetCodeError(`"${code}" names an unknown ${name}`);
    return value;
  };

  const preset: Preset = { base: pick("base") };
  const optional = [
    "neutral",
    "radius",
    "density",
    "sans",
    "heading",
    "mono",
    "headingWeight",
    "mode",
  ] as const;
  for (const name of optional) {
    const value = pick<Preset[typeof name]>(name);
    if (value !== "base") (preset as unknown as Record<string, unknown>)[name] = value;
  }
  if (values.tintLogo) preset.tintLogo = true;
  if (values.hasColor) {
    preset.brandColor = `#${values.color.toString(16).padStart(6, "0")}`;
  }
  return preset;
}

/**
 * What `--preset` accepts: a code, or a base language id on its own
 * (`nebutra apply --preset linear`), which is that language unchanged.
 */
export function parsePreset(input: string): Preset {
  const value = input.trim();
  if ((PRESET_BASES as readonly string[]).includes(value)) {
    return { base: value as Preset["base"] };
  }
  return decodePreset(value);
}
