/**
 * Canonical recipe builder for compile presets.
 * Output: free radii + free elevationTokens only.
 */

import { elevationPresetToTokens } from "../normalize";
import type {
  BadgeDefaultStyle,
  BrandElevationTokens,
  BrandRadii,
  BrandRecipe,
  ButtonDefaultStyle,
  Density,
  ElevationStyle,
  OutlineStyle,
} from "../types";

export interface RecipeInput {
  buttonDefault: ButtonDefaultStyle;
  density?: Density;
  /** Free radii slots (preferred API) */
  radii?: Partial<BrandRadii>;
  /**
   * Elevation preset expanded to elevationTokens when elevationTokens omitted.
   * Prefer passing elevationTokens for free CSS stacks.
   */
  elevationPreset?: ElevationStyle;
  elevationTokens?: BrandElevationTokens;
  badgeDefault?: BadgeDefaultStyle;
  primaryStrokeGradient?: string;
  outlineBorder?: string;
  /** Default hairline; `ink` makes --border-default the language's heavy stroke. */
  outline?: OutlineStyle;
  /** Used when expanding elevationPreset key/hairline */
  cardShadow?: string;
}

/** Build a canonical BrandRecipe (radii + elevationTokens only). */
export function buildRecipe(input: RecipeInput): BrandRecipe {
  const button = input.radii?.button ?? "0.375rem";
  const card = input.radii?.card ?? "0.75rem";
  const radii: BrandRadii = {
    button,
    card,
    input: input.radii?.input ?? button,
    pill: input.radii?.pill ?? "9999px",
  };
  if (input.radii?.badge) radii.badge = input.radii.badge;
  if (input.radii?.chip) radii.chip = input.radii.chip;
  const elevationPreset = input.elevationPreset ?? "soft";
  const elevationTokens =
    input.elevationTokens ?? elevationPresetToTokens(elevationPreset, input.cardShadow);

  const recipe: BrandRecipe = {
    buttonDefault: input.buttonDefault,
    density: input.density ?? "comfortable",
    radii,
    elevationTokens,
  };
  if (input.badgeDefault) recipe.badgeDefault = input.badgeDefault;
  if (input.primaryStrokeGradient) recipe.primaryStrokeGradient = input.primaryStrokeGradient;
  if (input.outlineBorder) recipe.outlineBorder = input.outlineBorder;
  if (input.outline) recipe.outline = input.outline;
  return recipe;
}
