/**
 * Normalize Brand Packages into the carrier contract.
 * Accepts legacy recipe fields and missing roles; always outputs full roles + free elev/radii.
 */

import { tryHexToHsl } from "./hex-to-hsl";
import type {
  BrandColorRoles,
  BrandElevationTokens,
  BrandModePalette,
  BrandModes,
  BrandPackage,
  BrandPackageInput,
  BrandRadii,
  BrandRecipe,
  BrandRecipeInput,
  BrandSemanticColors,
  ElevationStyle,
} from "./types";

const NONE = "0 0 #0000";

const KEY_SHADOW =
  "rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset, rgba(255, 255, 255, 0.25) 0px 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px -1px 0px 0px inset";

const HAIRLINE_SHADOW = "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgb(250, 250, 250) 0px 0px 0px 1px";

const SOFT_CARD = "var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))";
const SOFT_CONTROL = "var(--shadow-xs, 0 1px 2px 0 rgb(0 0 0 / 0.04))";
const SOFT_RAISED = "var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))";

/** Ensure role color is HSL channels (accept hex for convenience). */
function asChannels(value: string | undefined): string | undefined {
  if (value == null || value === "") return undefined;
  const v = value.trim();
  if (v.startsWith("#")) return tryHexToHsl(v, "0 0% 50%");
  return v;
}

/** Expand elevation preset → free CSS tokens. */
export function elevationPresetToTokens(
  preset: ElevationStyle | undefined,
  cardShadow?: string,
): BrandElevationTokens {
  switch (preset) {
    case "none":
      return { card: NONE, control: NONE, raised: NONE };
    case "key":
      return {
        card: cardShadow ?? KEY_SHADOW,
        control: NONE,
        raised: cardShadow ?? KEY_SHADOW,
      };
    case "hairline":
      return {
        card: cardShadow ?? HAIRLINE_SHADOW,
        control: NONE,
        raised: cardShadow ?? HAIRLINE_SHADOW,
      };
    case "raised":
      return { card: SOFT_RAISED, control: SOFT_CONTROL, raised: SOFT_RAISED };
    default:
      return { card: SOFT_CARD, control: SOFT_CONTROL, raised: SOFT_RAISED };
  }
}

export function rolesFromSemantic(
  s: BrandSemanticColors,
  brandMark?: { brand?: string; brandForeground?: string },
): BrandColorRoles {
  const roles: BrandColorRoles = {
    canvas: s.background,
    canvasForeground: s.foreground,
    surface: s.card,
    surfaceForeground: s.cardForeground,
    action: s.primary,
    actionForeground: s.primaryForeground,
    quiet: s.secondary,
    quietForeground: s.secondaryForeground,
    muted: s.muted,
    mutedForeground: s.mutedForeground,
    border: s.border,
    ring: s.ring,
    destructive: s.destructive,
    destructiveForeground: s.destructiveForeground,
  };
  // Optional under exactOptionalPropertyTypes: an absent field stroke must stay
  // absent so the emitter derives it from border, not become an explicit
  // undefined the emitter's ?? would then have to defend against twice.
  if (s.input) roles.input = s.input;
  const brand = asChannels(brandMark?.brand);
  if (brand) roles.brand = brand;
  const brandFg = asChannels(brandMark?.brandForeground);
  if (brandFg) roles.brandForeground = brandFg;
  if (s.success) roles.success = s.success;
  if (s.successForeground) roles.successForeground = s.successForeground;
  if (s.warning) roles.warning = s.warning;
  if (s.warningForeground) roles.warningForeground = s.warningForeground;
  if (s.info) roles.info = s.info;
  if (s.infoForeground) roles.infoForeground = s.infoForeground;
  return roles;
}

/** roles → shadcn semantic: primary ALWAYS tracks action (CTA), never brand mark. */
export function semanticFromRoles(r: BrandColorRoles): BrandSemanticColors {
  const accent = r.brand ?? r.quiet;
  const accentFg = r.brandForeground ?? r.quietForeground;
  const semantic: BrandSemanticColors = {
    background: r.canvas,
    foreground: r.canvasForeground,
    card: r.surface,
    cardForeground: r.surfaceForeground,
    popover: r.surface,
    popoverForeground: r.surfaceForeground,
    primary: r.action,
    primaryForeground: r.actionForeground,
    secondary: r.quiet,
    secondaryForeground: r.quietForeground,
    muted: r.muted,
    mutedForeground: r.mutedForeground,
    accent,
    accentForeground: accentFg,
    destructive: r.destructive,
    destructiveForeground: r.destructiveForeground,
    border: r.border,
    ring: r.ring,
  };
  if (r.input) semantic.input = r.input;
  if (r.success) semantic.success = r.success;
  if (r.successForeground) semantic.successForeground = r.successForeground;
  if (r.warning) semantic.warning = r.warning;
  if (r.warningForeground) semantic.warningForeground = r.warningForeground;
  if (r.info) semantic.info = r.info;
  if (r.infoForeground) semantic.infoForeground = r.infoForeground;
  return semantic;
}

function normalizeRadii(recipe: BrandRecipeInput): BrandRadii {
  const button = recipe.radii?.button ?? recipe.buttonRadius ?? "0.375rem";
  const card = recipe.radii?.card ?? recipe.cardRadius ?? "0.75rem";
  const radii: BrandRadii = {
    button,
    card,
    badge: recipe.radii?.badge ?? recipe.badgeRadius ?? "9999px",
    input: recipe.radii?.input ?? recipe.inputRadius ?? button,
    pill: recipe.radii?.pill ?? "9999px",
  };
  return radii;
}

function normalizeElevation(recipe: BrandRecipeInput): BrandElevationTokens {
  if (recipe.elevationTokens?.card) {
    const elev: BrandElevationTokens = { card: recipe.elevationTokens.card };
    elev.control = recipe.elevationTokens.control ?? NONE;
    elev.raised = recipe.elevationTokens.raised ?? recipe.elevationTokens.card;
    return elev;
  }
  return elevationPresetToTokens(recipe.elevation, recipe.cardShadow);
}

function normalizeBadgeDefault(
  badge: BrandRecipeInput["badgeDefault"],
): NonNullable<BrandRecipe["badgeDefault"]> {
  if (!badge || badge === "match-primary") return "match-action";
  return badge;
}

function categoryBrandMark(brand: BrandPackage | BrandPackageInput): string | undefined {
  return typeof brand.extensions?.categories?.brand === "string"
    ? brand.extensions.categories.brand
    : undefined;
}

/** Canonicalize one mode palette → full roles + semantic. */
export function normalizeModePalette(
  palette: BrandModePalette,
  categoryBrand?: string,
): { roles: BrandColorRoles; semantic: BrandSemanticColors } {
  let baseRoles: BrandColorRoles;
  if (palette.roles) {
    baseRoles = { ...palette.roles };
  } else if (palette.semantic) {
    const mark: { brand?: string; brandForeground?: string } = {
      brandForeground: palette.semantic.primaryForeground,
    };
    if (categoryBrand) mark.brand = categoryBrand;
    baseRoles = rolesFromSemantic(palette.semantic, mark);
  } else {
    throw new Error("BrandModePalette requires roles or semantic");
  }

  const roles: BrandColorRoles = {
    canvas: baseRoles.canvas,
    canvasForeground: baseRoles.canvasForeground,
    surface: baseRoles.surface,
    surfaceForeground: baseRoles.surfaceForeground,
    action: baseRoles.action,
    actionForeground: baseRoles.actionForeground,
    quiet: baseRoles.quiet,
    quietForeground: baseRoles.quietForeground,
    muted: baseRoles.muted,
    mutedForeground: baseRoles.mutedForeground,
    border: baseRoles.border,
    ring: baseRoles.ring,
    destructive: baseRoles.destructive,
    destructiveForeground: baseRoles.destructiveForeground,
  };
  if (baseRoles.input) roles.input = baseRoles.input;
  const brandCh = asChannels(baseRoles.brand);
  if (brandCh) roles.brand = brandCh;
  const brandFg = asChannels(baseRoles.brandForeground) ?? baseRoles.actionForeground;
  if (brandCh) roles.brandForeground = brandFg;
  if (baseRoles.success) roles.success = baseRoles.success;
  if (baseRoles.successForeground) roles.successForeground = baseRoles.successForeground;
  if (baseRoles.warning) roles.warning = baseRoles.warning;
  if (baseRoles.warningForeground) roles.warningForeground = baseRoles.warningForeground;
  if (baseRoles.info) roles.info = baseRoles.info;
  if (baseRoles.infoForeground) roles.infoForeground = baseRoles.infoForeground;

  return { roles, semantic: semanticFromRoles(roles) };
}

function normalizeModes(
  brand: BrandPackage | BrandPackageInput,
  categoryBrand?: string,
): BrandModes | undefined {
  const raw = brand.modes;
  if (!raw?.light && !raw?.dark) return undefined;

  const modes: BrandModes = {};
  if (raw.light) {
    const n = normalizeModePalette(raw.light, categoryBrand);
    modes.light = { roles: n.roles, semantic: n.semantic };
  }
  if (raw.dark) {
    const n = normalizeModePalette(raw.dark, categoryBrand);
    modes.dark = { roles: n.roles, semantic: n.semantic };
  }
  // Dual-mode complete: both present
  if (modes.light && modes.dark) return modes;
  // Partial modes still useful (e.g. only dark override)
  return modes;
}

/** Ensure package has roles + free radii/elev; strip legacy recipe aliases from output. */
export function normalizeBrandPackage(brand: BrandPackage | BrandPackageInput): BrandPackage {
  const categoryBrand = categoryBrandMark(brand);
  const modes = normalizeModes(brand, categoryBrand);

  // Default mode palette: dual-mode prefers modes[darkDefault], else top-level semantic/roles
  const defaultModeKey = brand.darkDefault ? "dark" : "light";
  const defaultMode = modes?.[defaultModeKey] ?? modes?.light ?? modes?.dark;

  let primaryPalette: BrandModePalette;
  if (defaultMode?.roles || defaultMode?.semantic) {
    primaryPalette = {};
    if (defaultMode.roles) primaryPalette.roles = defaultMode.roles;
    if (defaultMode.semantic) primaryPalette.semantic = defaultMode.semantic;
  } else {
    primaryPalette = { semantic: brand.semantic };
    if (brand.roles) primaryPalette.roles = brand.roles;
  }

  const { roles, semantic } = normalizeModePalette(primaryPalette, categoryBrand);

  const looseRecipe = brand.recipe as BrandRecipeInput;
  const radii = normalizeRadii(looseRecipe);
  const elevationTokens = normalizeElevation(looseRecipe);

  const recipe: BrandRecipe = {
    buttonDefault: looseRecipe.buttonDefault,
    density: looseRecipe.density ?? "comfortable",
    badgeDefault: normalizeBadgeDefault(looseRecipe.badgeDefault),
    radii,
    elevationTokens,
  };
  if (looseRecipe.primaryStrokeGradient) {
    recipe.primaryStrokeGradient = looseRecipe.primaryStrokeGradient;
  }
  if (looseRecipe.outlineBorder) {
    recipe.outlineBorder = looseRecipe.outlineBorder;
  }

  const out: BrandPackage = {
    ...brand,
    roles,
    semantic,
    recipe,
  };
  if (modes) out.modes = modes;
  else delete (out as { modes?: BrandModes }).modes;
  return out;
}

/** True when package has full dual light+dark palettes. */
export function isDualModeBrand(brand: BrandPackage): boolean {
  return Boolean(brand.modes?.light?.semantic && brand.modes?.dark?.semantic);
}
