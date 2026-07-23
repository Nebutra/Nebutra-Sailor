import type { ButtonDefaultStyle, Density, ElevationStyle } from "./types";

export interface InferredRecipeHints {
  buttonDefault?: ButtonDefaultStyle;
  elevation?: ElevationStyle;
  density?: Density;
  buttonRadius?: string;
  /** From DESIGN.md `| cards | Npx |` table row when present */
  cardRadius?: string;
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

  // Require explicit stroke CTA language — do NOT match hero artwork "gradient"
  const gradientStroke =
    t.includes("gradient-stroked") ||
    t.includes("gradient stroke") ||
    t.includes("gradient-stroked cta") ||
    t.includes("border-image") ||
    (t.includes("gradient border") && (t.includes("cta") || t.includes("button")));

  // Raycast-style neutral CTA — do NOT match mere color-token name "mist" + "filled button"
  const neutralFilled =
    t.includes("no chromatic") ||
    t.includes("deliberately neutral") ||
    t.includes("neutral rather than chromatic") ||
    t.includes("no chromatic action") ||
    t.includes("don't use chromatic action") ||
    t.includes("do not use chromatic action") ||
    (t.includes("mist") && t.includes("filled") && (t.includes("iron") || t.includes("neutral")));

  const solidCta =
    neutralFilled ||
    (t.includes("filled") &&
      (t.includes("primary") ||
        t.includes("cta") ||
        t.includes("download") ||
        t.includes("action button") ||
        t.includes("primary action") ||
        t.includes("filled button")));

  if (gradientStroke) {
    hints.buttonDefault = "gradient-stroke";
    notes.push("DESIGN.md: gradient-stroke CTA");
  } else if (outlineFirst && !solidCta) {
    hints.buttonDefault = "outline";
    notes.push("DESIGN.md: outline-first controls");
  } else if (solidCta) {
    hints.buttonDefault = "solid";
    if (neutralFilled) notes.push("DESIGN.md: neutral filled CTA (not chromatic)");
  }

  // Explicit ban on all elevation shadows (Stripe/Vanta ledger systems)
  const forbidsAnyShadow =
    t.includes("avoids shadows") ||
    t.includes("avoid shadows") ||
    t.includes("avoids shadows entirely") ||
    t.includes("no card has a box-shadow") ||
    t.includes("no button has a shadow") ||
    t.includes("never from box-shadow") ||
    t.includes("never from elevation") ||
    t.includes("depth comes from background tint") ||
    t.includes("depth comes from background") ||
    t.includes("no shadows, blurs") ||
    t.includes("do not use shadows") ||
    t.includes("don't use shadows") ||
    t.includes("rejects drop shadows") ||
    t.includes("reject drop shadows") ||
    t.includes("don't drop shadows") ||
    t.includes("do not drop shadows") ||
    t.includes("don't apply drop shadows") ||
    t.includes("do not apply drop shadows") ||
    t.includes("don't add drop-shadows") ||
    t.includes("do not add drop-shadows") ||
    t.includes("never use drop-shadows") ||
    t.includes("no drop shadow") ||
    t.includes("no box-shadow") ||
    t.includes("never via box-shadow") ||
    t.includes("border is the elevation") ||
    t.includes("no shadow — the border") ||
    t.includes("no shadow - the border") ||
    t.includes("depth is communicated only") ||
    (t.includes("no shadow") && t.includes("border")) ||
    (t.includes("flat") && t.includes("1px") && t.includes("border"));

  const keyElev =
    t.includes("keyboard key") ||
    t.includes("key shadow") ||
    t.includes("key cap") ||
    (t.includes("inset top") && t.includes("highlight") && t.includes("shadow"));

  // Vercel-style: affirmative *use* of stacked box-shadow rings (not "never box-shadow")
  const hairlineRingElev =
    !forbidsAnyShadow &&
    (t.includes("stacked box-shadow") ||
      t.includes("double-ring") ||
      t.includes("build depth with hairline") ||
      (t.includes("hairline") &&
        t.includes("box-shadow") &&
        (t.includes("never with drop-shadow") ||
          t.includes("never use drop-shadow") ||
          t.includes("not with drop-shadow"))));

  if (keyElev) {
    hints.elevation = "key";
    notes.push("DESIGN.md: key/inset elevation");
  } else if (forbidsAnyShadow) {
    hints.elevation = "none";
    notes.push("DESIGN.md: elevation=none (no box-shadow / tint+border depth)");
  } else if (hairlineRingElev) {
    hints.elevation = "hairline";
    notes.push("DESIGN.md: hairline ring elevation");
  }

  // Density: explicit catalog line beats incidental "compact pill padding"
  if (
    /\*\*density:\*\*\s*comfortable|density:\s*comfortable|\bdensity\b[^\n]{0,20}comfortable/i.test(
      designMd,
    )
  ) {
    hints.density = "comfortable";
  } else if (/\*\*density:\*\*\s*spacious|density:\s*spacious/i.test(designMd)) {
    hints.density = "spacious";
  } else if (/\*\*density:\*\*\s*compact|density:\s*compact/i.test(designMd)) {
    hints.density = "compact";
  } else if (
    (t.includes("compact density") || t.includes("8–12px") || t.includes("8-12px")) &&
    !t.includes("comfortable")
  ) {
    hints.density = "compact";
  } else if (t.includes("comfortable") || t.includes("spacious")) {
    hints.density = t.includes("spacious") ? "spacious" : "comfortable";
  }

  // Radius: **token table rows win** over free-text / agent-prompt noise.
  // e.g. Notion "| buttons | 8px |" must beat incidental "border-radius 4px" on a tertiary control.
  const tableButton = designMd.match(/\|\s*buttons\s*\|\s*(\d+px|9999?px)\s*\|/i);
  const tableCards = designMd.match(/\|\s*cards\s*\|\s*(\d+px|9999?px)\s*\|/i);
  const tableButtonRadius = tableButton?.[1];
  const tableCardsRadius = tableCards?.[1];
  if (tableButtonRadius) {
    hints.buttonRadius = tableButtonRadius;
    notes.push(`DESIGN.md: table buttons radius ${tableButtonRadius}`);
  } else if (
    t.includes("4px border-radius on all buttons") ||
    t.includes("use 4px border-radius on all") ||
    (t.includes("never pill") && t.includes("4px") && t.includes("button"))
  ) {
    hints.buttonRadius = "4px";
    notes.push("DESIGN.md: 4px control radius (not pill)");
  } else if (
    ((t.includes("999px") || t.includes("9999px")) &&
      (t.includes("button") || t.includes("pill-shaped")) &&
      !t.includes("never pill") &&
      !t.includes("not pill") &&
      !t.includes("pills only")) ||
    (t.includes("pill-shaped") && t.includes("button"))
  ) {
    hints.buttonRadius = t.includes("9999px") ? "9999px" : "999px";
    notes.push("DESIGN.md: full pill control radius");
  } else if (/\bbuttons?\b[^\n.|]{0,48}\b8px\b/.test(t) || t.includes("8px for buttons")) {
    hints.buttonRadius = "8px";
  } else if (/\bbuttons?\b[^\n.|]{0,48}\b6px\b/.test(t) || t.includes("button radius to 6px")) {
    hints.buttonRadius = "6px";
  } else if (t.includes("100px") && (t.includes("button") || t.includes("pill button"))) {
    hints.buttonRadius = "100px";
  }

  if (tableCardsRadius) {
    hints.cardRadius = tableCardsRadius;
    notes.push(`DESIGN.md: table cards radius ${tableCardsRadius}`);
  }

  return hints;
}
