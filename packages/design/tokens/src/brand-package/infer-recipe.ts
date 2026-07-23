import type { ButtonDefaultStyle, Density, ElevationStyle } from "./types";

export interface InferredRecipeHints {
  buttonDefault?: ButtonDefaultStyle;
  elevation?: ElevationStyle;
  density?: Density;
  buttonRadius?: string;
  notes: string[];
}

/**
 * Infer control recipe from DESIGN.md / agent prompt text.
 * Used for generic brands and to refine known fixtures.
 */
export function inferRecipeFromDesignMd(designMd: string): InferredRecipeHints {
  const t = designMd.toLowerCase();
  const notes: string[] = [];
  const hints: InferredRecipeHints = { notes };

  const outlineFirst =
    t.includes("outlined-only") ||
    t.includes("outline-only") ||
    t.includes("ghost pill") ||
    t.includes("ghost-pill") ||
    t.includes("no filled") ||
    t.includes("don't add filled") ||
    t.includes("do not add filled") ||
    t.includes("never fill") ||
    (t.includes("outlined") && t.includes("button") && !t.includes("filled cta"));

  const gradientStroke =
    t.includes("gradient-stroked") ||
    t.includes("gradient stroke") ||
    t.includes("gradient border") ||
    t.includes("border-image") ||
    (t.includes("gradient") && t.includes("cta") && t.includes("border"));

  const solidCta =
    t.includes("filled") && (t.includes("primary") || t.includes("cta") || t.includes("button"));

  if (gradientStroke) {
    hints.buttonDefault = "gradient-stroke";
    notes.push("DESIGN.md: gradient-stroke CTA");
  } else if (outlineFirst && !solidCta) {
    hints.buttonDefault = "outline";
    notes.push("DESIGN.md: outline-first controls");
  } else if (solidCta) {
    hints.buttonDefault = "solid";
  }

  if (
    t.includes("no drop shadow") ||
    t.includes("no box-shadow") ||
    t.includes("never via box-shadow") ||
    t.includes("don't apply drop shadows") ||
    t.includes("do not apply drop shadows") ||
    t.includes("depth is communicated only")
  ) {
    hints.elevation = "none";
    notes.push("DESIGN.md: elevation=none");
  }

  if (t.includes("compact") || t.includes("8–12px") || t.includes("8-12px")) {
    hints.density = "compact";
  } else if (t.includes("comfortable") || t.includes("spacious")) {
    hints.density = t.includes("spacious") ? "spacious" : "comfortable";
  }

  // Radius heuristics
  if (t.includes("100px") && (t.includes("button") || t.includes("pill"))) {
    hints.buttonRadius = "100px";
  } else if (t.includes("9999px") || t.includes("full pill")) {
    hints.buttonRadius = "9999px";
  } else if (/\bbutton[s]?\b[^\n.]{0,40}\b6px\b/.test(t) || t.includes("button radius to 6px")) {
    hints.buttonRadius = "6px";
  }

  return hints;
}
