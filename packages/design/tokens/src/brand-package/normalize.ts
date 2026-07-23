/**
 * Normalize Brand Packages into the carrier contract.
 * Accepts legacy recipe fields and missing roles; always outputs full roles + free elev/radii.
 */

import { tryHexToHsl } from "./hex-to-hsl";
import type {
  BrandColorRoles,
  BrandElevationTokens,
  BrandPackage,
  BrandRadii,
  BrandRecipe,
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
    input: s.input,
    ring: s.ring,
    destructive: s.destructive,
    destructiveForeground: s.destructiveForeground,
  };
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
    input: r.input,
    ring: r.ring,
  };
  if (r.success) semantic.success = r.success;
  if (r.successForeground) semantic.successForeground = r.successForeground;
  if (r.warning) semantic.warning = r.warning;
  if (r.warningForeground) semantic.warningForeground = r.warningForeground;
  if (r.info) semantic.info = r.info;
  if (r.infoForeground) semantic.infoForeground = r.infoForeground;
  return semantic;
}

function normalizeRadii(recipe: BrandRecipe): BrandRadii {
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

function normalizeElevation(recipe: BrandRecipe): BrandElevationTokens {
  if (recipe.elevationTokens?.card) {
    const elev: BrandElevationTokens = { card: recipe.elevationTokens.card };
    elev.control = recipe.elevationTokens.control ?? NONE;
    elev.raised = recipe.elevationTokens.raised ?? recipe.elevationTokens.card;
    return elev;
  }
  return elevationPresetToTokens(recipe.elevation, recipe.cardShadow);
}

function normalizeBadgeDefault(
  badge: BrandRecipe["badgeDefault"],
): NonNullable<BrandRecipe["badgeDefault"]> {
  if (!badge || badge === "match-primary") return "match-action";
  return badge;
}

/** Ensure package has roles + free radii/elev; keep semantic in sync with action. */
export function normalizeBrandPackage(brand: BrandPackage): BrandPackage {
  const categoryBrand =
    typeof brand.extensions?.categories?.brand === "string"
      ? brand.extensions.categories.brand
      : undefined;

  let baseRoles: BrandColorRoles;
  if (brand.roles) {
    baseRoles = { ...brand.roles };
  } else {
    const mark: { brand?: string; brandForeground?: string } = {
      brandForeground: brand.semantic.primaryForeground,
    };
    if (categoryBrand) mark.brand = categoryBrand;
    baseRoles = rolesFromSemantic(brand.semantic, mark);
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
    input: baseRoles.input,
    ring: baseRoles.ring,
    destructive: baseRoles.destructive,
    destructiveForeground: baseRoles.destructiveForeground,
  };
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

  const semantic = semanticFromRoles(roles);
  const radii = normalizeRadii(brand.recipe);
  const elevationTokens = normalizeElevation(brand.recipe);

  const recipe: BrandRecipe = {
    buttonDefault: brand.recipe.buttonDefault,
    density: brand.recipe.density,
    badgeDefault: normalizeBadgeDefault(brand.recipe.badgeDefault),
    radii,
    elevationTokens,
    buttonRadius: radii.button,
    cardRadius: radii.card,
    badgeRadius: radii.badge ?? "9999px",
    inputRadius: radii.input ?? radii.button,
    cardShadow: elevationTokens.card,
  };
  if (brand.recipe.primaryStrokeGradient) {
    recipe.primaryStrokeGradient = brand.recipe.primaryStrokeGradient;
  }
  if (brand.recipe.outlineBorder) {
    recipe.outlineBorder = brand.recipe.outlineBorder;
  }
  if (brand.recipe.elevation) {
    recipe.elevation = brand.recipe.elevation;
  }

  return {
    ...brand,
    roles,
    semantic,
    recipe,
  };
}
