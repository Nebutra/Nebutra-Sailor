import { hexToHslChannels } from "../brand-package/hex-to-hsl";
import {
  isDualModeBrand,
  normalizeBrandPackage,
  semanticFromRoles,
} from "../brand-package/normalize";
import type { BrandColorRoles, BrandPackage, HslChannels } from "../brand-package/types";
import { NEUTRAL_TINTS, type Preset, RADIUS_VALUES } from "./knobs";

export interface ResolvedPreset {
  brand: BrandPackage;
  /** Knobs the base cannot honour (a light mode for a dark-only language). */
  warnings: string[];
}

/** The roles a neutral-temperature knob retints: every surface, text and hairline. */
const NEUTRAL_ROLES = [
  "canvas",
  "canvasForeground",
  "surface",
  "surfaceForeground",
  "quiet",
  "quietForeground",
  "muted",
  "mutedForeground",
  "border",
  "input",
] as const satisfies readonly (keyof BrandColorRoles)[];

const WHITE = "0 0% 100%";
/** House ink (`--primary`, light): the dark label for a light fill. */
const INK = "225 7.7% 10.2%";

function parseChannels(value: HslChannels): { h: number; s: number; l: number } | null {
  const m = /^\s*(-?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(value);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

const round = (n: number) => Math.round(n * 10) / 10;

function retint(value: HslChannels, tint: { h: number; s: number }): HslChannels {
  const c = parseChannels(value);
  if (!c) return value;
  return `${round(tint.h)} ${round(tint.s)}% ${round(c.l)}%`;
}

function relativeLuminance(hex: string): number {
  const channel = (i: number) => {
    const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** White or House ink, whichever reads better on the fill (WCAG contrast). */
function labelOn(hex: string): HslChannels {
  const l = relativeLuminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const inkL = 0.0141; // House ink #18191c
  const onInk = (l + 0.05) / (inkL + 0.05);
  return onWhite >= onInk ? WHITE : INK;
}

function tintRoles(roles: BrandColorRoles, preset: Preset): void {
  if (preset.neutral && preset.neutral !== "base") {
    const tint = NEUTRAL_TINTS[preset.neutral];
    for (const key of NEUTRAL_ROLES) {
      const value = roles[key];
      if (value) roles[key] = retint(value, tint);
    }
  }
  if (preset.brandColor) {
    const channels = hexToHslChannels(preset.brandColor);
    roles.action = channels;
    roles.actionForeground = labelOn(preset.brandColor);
    roles.ring = channels;
  }
}

function stack(family: string, generic: string): string {
  return `"${family}", ${generic}`;
}

/**
 * A preset applied to its base language: the Brand Package the emit pipeline
 * turns into CSS. Pure — the caller supplies the base package (read from
 * brands/<id>/brand.json, or factoryBrandPackage() for `factory`), so this runs
 * the same in Studio's browser preview and in the project build.
 */
export function resolvePreset(
  preset: Preset,
  base: BrandPackage,
  identity: { id: string; name: string; code?: string },
): ResolvedPreset {
  const warnings: string[] = [];
  const brand = normalizeBrandPackage(structuredClone(base));

  // ── Colour: every palette the package carries, then re-derive semantic ──
  const palettes = [brand.modes?.light, brand.modes?.dark].filter((p): p is NonNullable<typeof p> =>
    Boolean(p?.roles),
  );
  for (const palette of palettes) {
    tintRoles(palette.roles as BrandColorRoles, preset);
    palette.semantic = semanticFromRoles(palette.roles as BrandColorRoles);
  }
  if (brand.roles) {
    tintRoles(brand.roles, preset);
    brand.semantic = semanticFromRoles(brand.roles);
  }

  // ── Mode: only a dual-mode language has the other palette to switch to ──
  if (preset.mode && preset.mode !== "base") {
    const dark = preset.mode === "dark";
    if (isDualModeBrand(brand)) {
      brand.darkDefault = dark;
      const primary = brand.modes?.[dark ? "dark" : "light"];
      if (primary?.roles) brand.roles = primary.roles;
      if (primary?.semantic) brand.semantic = primary.semantic;
    } else if (brand.darkDefault !== dark) {
      warnings.push(
        `${base.name} has one palette (${brand.darkDefault ? "dark" : "light"}); the ${preset.mode} mode was not applied.`,
      );
    }
  }

  // ── Shape and room ──
  if (preset.radius && preset.radius !== "base") {
    brand.recipe.radii = { ...RADIUS_VALUES[preset.radius] };
  }
  if (preset.density && preset.density !== "base") {
    brand.recipe.density = preset.density;
  }

  // ── Type ──
  const typography = { ...brand.typography };
  if (preset.sans && preset.sans !== "base") {
    typography.fontSans = stack(preset.sans, "ui-sans-serif, system-ui, sans-serif");
  }
  if (preset.heading && preset.heading !== "base") {
    const serif = ["Playfair Display", "Fraunces", "Source Serif 4"].includes(preset.heading);
    typography.fontDisplay =
      preset.heading === "sans"
        ? typography.fontSans
        : stack(preset.heading, serif ? "ui-serif, Georgia, serif" : "ui-sans-serif, sans-serif");
  }
  if (preset.mono && preset.mono !== "base") {
    typography.fontMono = stack(preset.mono, "ui-monospace, SFMono-Regular, monospace");
  }
  if (preset.headingWeight && preset.headingWeight !== "base") {
    typography.headingWeight = preset.headingWeight;
  }
  brand.typography = typography;

  brand.id = identity.id;
  brand.name = identity.name;
  brand.extensions = {
    ...brand.extensions,
    notes: [
      `Resolved from preset ${identity.code ?? "(unnamed)"} over ${base.id} by @nebutra/tokens/preset.`,
    ],
  };

  return { brand: normalizeBrandPackage(brand), warnings };
}
