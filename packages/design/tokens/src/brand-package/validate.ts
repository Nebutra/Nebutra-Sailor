import { normalizeBrandPackage } from "./normalize";
import type { BrandPackage, BrandSpacing, ButtonDefaultStyle } from "./types";

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

  // An elevation value that reads --shadow-* is circular: the theme block maps
  // --shadow-md to var(--elevation-md), so a skin writing
  // `--elevation-md: var(--shadow-md, …)` puts the property in a cycle. CSS
  // then treats it as guaranteed-invalid — the fallback does NOT rescue it,
  // because a fallback only applies to an undefined variable, not a cyclic one.
  // linear shipped exactly this, written back when the skin set the alias
  // rather than the source, and it read as a plausible "use the Tailwind
  // default" until the names were corrected.
  for (const [key, value] of Object.entries(b.recipe?.elevationTokens ?? {})) {
    if (typeof value === "string" && /var\(\s*--(?:shadow|elevation)-/.test(value)) {
      errors.push(
        `recipe.elevationTokens.${key} references a shadow/elevation variable — ` +
          "that is a cycle once the skin sets the source. Inline the value.",
      );
    }
  }

  if (b.motion) {
    // Durations are milliseconds, and the emitter appends the unit. A package
    // that wrote "200ms" here would emit `200msms` — invalid, so the whole
    // declaration is dropped and that language silently keeps the shared timing.
    for (const key of ["micro", "flow", "reveal", "cinematic"] as const) {
      const value = b.motion[key];
      if (value == null) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        errors.push(`motion.${key} must be a non-negative number of milliseconds`);
      } else if (value > 2000) {
        warnings.push(`motion.${key} is ${value}ms — long enough to read as a stall`);
      }
    }
    for (const key of ["easeOut", "easeInOut", "easeSpring"] as const) {
      const value = b.motion[key];
      if (value == null) continue;
      if (typeof value !== "string" || !value.trim()) {
        errors.push(`motion.${key} must be a non-empty timing function`);
      }
    }
    const { micro, flow, reveal, cinematic } = b.motion;
    const ramp = [micro, flow, reveal, cinematic].filter((v): v is number => typeof v === "number");
    if (ramp.length > 1 && ramp.some((v, i) => i > 0 && v < (ramp[i - 1] ?? v))) {
      warnings.push(
        "motion durations are not ascending — micro should be the shortest and cinematic the longest",
      );
    }
  }

  if (b.spacing) {
    // Values are full CSS lengths, and the emitter writes them verbatim into a
    // custom property — a bare number ("16") is a syntactically valid
    // declaration that Tailwind's spacing utilities then read as unitless and
    // silently treat as 0, so the language quietly loses that step rather than
    // erroring.
    const UNIT = /^-?\d*\.?\d+(rem|em|px|%|vh|vw|ch)$/;
    const order: Array<[keyof BrandSpacing, number]> = [];
    for (const key of ["xs", "sm", "md", "lg", "xl", "2xl"] as const) {
      const value = b.spacing[key];
      if (value == null) continue;
      if (typeof value !== "string" || !UNIT.test(value.trim())) {
        errors.push(
          `spacing.${key} must be a CSS length with a unit (e.g. "1rem"), got ${JSON.stringify(value)}`,
        );
        continue;
      }
      order.push([key, Number.parseFloat(value)]);
    }
    if (order.length > 1 && order.some(([, v], i) => i > 0 && v < (order[i - 1]?.[1] ?? v))) {
      warnings.push(
        "spacing steps are not ascending — xs should be the smallest and 2xl the largest",
      );
    }
  }

  if (
    b.recipe?.buttonDefault === "solid" &&
    b.semantic?.primary === b.semantic?.primaryForeground
  ) {
    warnings.push("primary and primaryForeground are identical — check contrast");
  }

  return { ok: errors.length === 0, errors, warnings };
}
