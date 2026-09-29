/**
 * The knobs a preset turns (ADR 2026-09-27 Sailor Studio).
 *
 * Every list is APPEND-ONLY: a preset code stores indexes into these lists,
 * so reordering or removing an entry changes what every published code means.
 * Add at the end; a retired choice stays in place.
 */

/** Base languages a preset starts from. `factory` is the House tokens. */
export const PRESET_BASES = [
  "factory",
  "linear",
  "gsap",
  "notion",
  "raycast",
  "stripe",
  "vanta",
  "vercel",
  "cosmos",
] as const;
export type PresetBase = (typeof PRESET_BASES)[number];

/** Temperature of the neutral surfaces and text (hue and chroma; lightness stays). */
export const PRESET_NEUTRALS = ["base", "cool", "neutral", "warm"] as const;
export type PresetNeutral = (typeof PRESET_NEUTRALS)[number];

export const PRESET_RADII = ["base", "none", "sm", "md", "lg", "full"] as const;
export type PresetRadius = (typeof PRESET_RADII)[number];

export const PRESET_DENSITIES = ["base", "compact", "comfortable", "spacious"] as const;
export type PresetDensity = (typeof PRESET_DENSITIES)[number];

/**
 * Faces self-hosted through @nebutra/fonts (FONT_REGISTRY). A face that is not
 * registered would render in the system font, so only these are offered.
 */
export const PRESET_SANS = [
  "base",
  "Geist",
  "Inter",
  "Inter Tight",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Figtree",
  "Work Sans",
  "Space Grotesk",
  "Outfit",
  "Sora",
  "Lexend",
  "Montserrat",
] as const;
export type PresetSans = (typeof PRESET_SANS)[number];

/** Heading face. `sans` sets headings in the body face. */
export const PRESET_HEADINGS = [
  "base",
  "sans",
  "DM Sans",
  "Inter Tight",
  "Space Grotesk",
  "Sora",
  "Outfit",
  "Manrope",
  "Playfair Display",
  "Fraunces",
  "Source Serif 4",
] as const;
export type PresetHeading = (typeof PRESET_HEADINGS)[number];

export const PRESET_MONOS = [
  "base",
  "Geist Mono",
  "JetBrains Mono",
  "Fira Code",
  "Roboto Mono",
  "Source Code Pro",
] as const;
export type PresetMono = (typeof PRESET_MONOS)[number];

export const PRESET_WEIGHTS = ["base", 400, 500, 600, 700] as const;
export type PresetWeight = (typeof PRESET_WEIGHTS)[number];

/** Which mode a visitor sees first. Only a dual-mode language can change it. */
export const PRESET_MODES = ["base", "light", "dark"] as const;
export type PresetMode = (typeof PRESET_MODES)[number];

/** A project's look: a base language and what it overrides. Omitted = "base". */
export interface Preset {
  base: PresetBase;
  /** `#rrggbb`. Becomes the action fill (buttons) and the ring (focus, links). */
  brandColor?: string;
  neutral?: PresetNeutral;
  radius?: PresetRadius;
  density?: PresetDensity;
  sans?: PresetSans;
  heading?: PresetHeading;
  mono?: PresetMono;
  headingWeight?: PresetWeight;
  mode?: PresetMode;
  /**
   * Paint the wordmark in the language's brand colour. Off by default: a
   * language's brand colour belongs to its own mark (Linear's lime), and on
   * your product the wordmark reads in ink.
   */
  tintLogo?: boolean;
}

/** Radius slots per choice. `pill` stays round in every choice but `none`. */
export const RADIUS_VALUES: Record<
  Exclude<PresetRadius, "base">,
  { button: string; card: string; badge: string; input: string; pill: string }
> = {
  none: { button: "0px", card: "0px", badge: "0px", input: "0px", pill: "0px" },
  sm: { button: "4px", card: "6px", badge: "4px", input: "4px", pill: "9999px" },
  md: { button: "6px", card: "10px", badge: "6px", input: "6px", pill: "9999px" },
  lg: { button: "10px", card: "16px", badge: "8px", input: "10px", pill: "9999px" },
  full: { button: "9999px", card: "20px", badge: "9999px", input: "9999px", pill: "9999px" },
};

/** Hue and saturation the neutral roles take; `neutral` is achromatic. */
export const NEUTRAL_TINTS: Record<Exclude<PresetNeutral, "base">, { h: number; s: number }> = {
  cool: { h: 220, s: 9 },
  neutral: { h: 0, s: 0 },
  warm: { h: 35, s: 9 },
};
