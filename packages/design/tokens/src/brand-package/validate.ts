import { normalizeBrandPackage } from "./normalize";
import type { BrandPackage, ButtonDefaultStyle } from "./types";

const BUTTON_STYLES = new Set<ButtonDefaultStyle>(["solid", "outline", "gradient-stroke"]);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate carrier contract before Create Center publish. */
export function validateBrandPackage(brand: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!brand || typeof brand !== "object") {
    return { ok: false, errors: ["Brand package must be an object"], warnings };
  }
  let b: BrandPackage;
  try {
    b = normalizeBrandPackage(brand as BrandPackage);
  } catch (e) {
    return { ok: false, errors: [`normalize failed: ${(e as Error).message}`], warnings };
  }

  if (!b.id || typeof b.id !== "string") errors.push("id is required");
  if (!b.name || typeof b.name !== "string") errors.push("name is required");
  if (!b.version || typeof b.version !== "string") errors.push("version is required");

  if (!b.roles) {
    errors.push("roles missing after normalize");
  } else {
    for (const key of ["canvas", "action", "actionForeground", "border"] as const) {
      if (!b.roles[key]) errors.push(`roles.${key} is required`);
    }
    if (b.roles.brand && b.roles.brand === b.roles.action) {
      warnings.push(
        "roles.brand equals roles.action — brand mark is not separated from CTA (often intentional)",
      );
    }
  }

  if (!b.semantic || typeof b.semantic !== "object") {
    errors.push("semantic is required");
  } else {
    for (const key of [
      "background",
      "foreground",
      "primary",
      "primaryForeground",
      "border",
      "ring",
    ] as const) {
      if (!b.semantic[key]) errors.push(`semantic.${key} is required`);
    }
    // Contract: primary must track action
    if (b.roles && b.semantic.primary !== b.roles.action) {
      errors.push("semantic.primary must equal roles.action (CTA bridge)");
    }
  }

  if (!b.recipe || typeof b.recipe !== "object") {
    errors.push("recipe is required");
  } else {
    if (!BUTTON_STYLES.has(b.recipe.buttonDefault as ButtonDefaultStyle)) {
      errors.push(`recipe.buttonDefault must be one of ${[...BUTTON_STYLES].join(", ")}`);
    }
    if (!b.recipe.radii?.button) errors.push("recipe.radii.button is required");
    if (!b.recipe.radii?.card) errors.push("recipe.radii.card is required");
    if (!b.recipe.elevationTokens?.card) {
      errors.push("recipe.elevationTokens.card is required (free CSS box-shadow)");
    }
    if (b.recipe.buttonDefault === "gradient-stroke" && !b.recipe.primaryStrokeGradient) {
      warnings.push(
        "gradient-stroke without primaryStrokeGradient — border falls back to solid primary",
      );
    }
  }
  if (!b.typography?.fontSans) errors.push("typography.fontSans is required");

  if (b.typography?.faces) {
    b.typography.faces.forEach((face, i) => {
      if (!face.family) errors.push(`typography.faces[${i}].family is required`);
      if (!face.src?.length) errors.push(`typography.faces[${i}].src must be non-empty`);
      else {
        for (const [j, src] of face.src.entries()) {
          if (!src.url) errors.push(`typography.faces[${i}].src[${j}].url is required`);
        }
      }
    });
  }

  if (b.zones?.marketing?.display && !b.zones.product) {
    warnings.push(
      "marketing.display set without product zone — app shell may inherit display size",
    );
  }

  if (
    b.recipe?.buttonDefault === "solid" &&
    b.semantic?.primary === b.semantic?.primaryForeground
  ) {
    warnings.push("primary and primaryForeground are identical — check contrast");
  }

  return { ok: errors.length === 0, errors, warnings };
}
